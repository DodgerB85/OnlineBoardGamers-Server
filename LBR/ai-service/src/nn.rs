//! A small MLP, hand-rolled for speed.
//!
//! Deliberately not a general framework. The network is a fixed three-layer
//! trunk with three output heads, evaluated with batch size 1 inside an MCTS
//! inner loop that calls it hundreds of times per move — so what matters is
//! bytes-moved and branch predictability, not flexibility. Plain `f32` slices in
//! one arena, dot products written as flat loops that LLVM auto-vectorises, and
//! one pass of fusing per layer.
//!
//! The weight file is little-endian `f32` preceded by a text header, so Python
//! writes it with nothing but `struct.pack` and Rust reads it with `f32::from_le_bytes`.
//! See `train.py` for the writer and the exact tensor order.

use crate::features::{NFEAT, POLICY_OUT};
use std::io::{BufRead, Read, Write};

/// Trunk width and head widths, in units of 32 so a different net is a one-line
/// change on both sides. Kept here (not in Python) because the header the
/// trainer reads is written from this definition.
pub const H_TRUNK: usize = 128;
pub const H_VALUE: usize = 64;

/// One dense layer: `out = act(in · Wᵀ + b)`.
#[derive(Clone, Debug)]
pub struct Dense {
    pub w: Vec<f32>, // row-major [out][in]
    pub b: Vec<f32>,
    pub out: usize,
    pub inp: usize,
    pub relu: bool,
}

impl Dense {
    pub fn zeros(out: usize, inp: usize, relu: bool) -> Self {
        Dense {
            w: vec![0.0; out * inp],
            b: vec![0.0; out],
            out,
            inp,
            relu,
        }
    }

    /// `gemv` with the weights streamed in output-major order: for each output
    /// unit the whole input row is walked contiguously, which is what lets the
    /// compiler emit one vectorised FMA chain per unit.
    #[inline]
    pub fn forward(&self, input: &[f32], out: &mut [f32]) {
        debug_assert_eq!(input.len(), self.inp);
        debug_assert_eq!(out.len(), self.out);
        let mut base = 0usize;
        for o in 0..self.out {
            let row = &self.w[base..base + self.inp];
            let mut acc = self.b[o];
            let mut i = 0usize;
            while i + 8 <= self.inp {
                let r = &row[i..i + 8];
                let x = &input[i..i + 8];
                acc += r[0] * x[0]
                    + r[1] * x[1]
                    + r[2] * x[2]
                    + r[3] * x[3]
                    + r[4] * x[4]
                    + r[5] * x[5]
                    + r[6] * x[6]
                    + r[7] * x[7];
                i += 8;
            }
            while i < self.inp {
                acc += row[i] * input[i];
                i += 1;
            }
            out[o] = if self.relu { acc.max(0.0) } else { acc };
            base += self.inp;
        }
    }

    fn write_to<W: Write>(&self, w: &mut W) -> std::io::Result<()> {
        for v in self.w.iter().chain(self.b.iter()) {
            w.write_all(&v.to_le_bytes())?;
        }
        Ok(())
    }

    fn read_from<R: Read>(r: &mut R, spec: (usize, usize, bool)) -> std::io::Result<Self> {
        let (out, inp, relu) = spec;
        let mut d = Dense::zeros(out, inp, relu);
        let buf = &mut d.w[..];
        read_f32s(r, buf)?;
        read_f32s(r, &mut d.b[..])?;
        Ok(d)
    }
}

fn read_f32s<R: Read>(r: &mut R, dst: &mut [f32]) -> std::io::Result<()> {
    let mut bytes = vec![0u8; dst.len() * 4];
    r.read_exact(&mut bytes)?;
    for (i, c) in bytes.chunks_exact(4).enumerate() {
        dst[i] = f32::from_le_bytes([c[0], c[1], c[2], c[3]]);
    }
    Ok(())
}

/// Raw network outputs, before any masking.
///
/// Borrows the policy logits out of the caller's [`Scratch`] rather than owning
/// them. An owned `Vec` here would mean a heap allocation per network call —
/// several hundred per move — and the obvious `mem::take` fix is worse than
/// useless: it *drains* the scratch buffer, so the second inference in a process
/// writes into a zero-length vector and panics.
pub struct NetOut<'a> {
    /// Factorised policy logits; see `features::slot_logit`.
    pub policy: &'a [f32],
    /// Per-seat utility in `[0, 1]`, higher = better for that seat.
    pub utility: [f32; 4],
    /// Per-seat probability of finishing strictly top.
    pub win: [f32; 4],
    /// The mover's own predicted final score, normalised by 20.
    pub own_score: f32,
}

/// The network. `Net::random` exists so the pipeline can be exercised end to end
/// before any training has happened.
#[derive(Clone, Debug)]
pub struct Net {
    pub l1: Dense,
    pub l2: Dense,
    pub l3: Dense,
    pub head_policy: Dense,
    pub head_value1: Dense,
    pub head_value2: Dense,
    pub head_win1: Dense,
    pub head_win2: Dense,
    pub head_score: Dense,
}

impl Default for Net {
    fn default() -> Self {
        Self::zeros()
    }
}

impl Net {
    pub fn zeros() -> Self {
        Net {
            l1: Dense::zeros(H_TRUNK, NFEAT, true),
            l2: Dense::zeros(H_TRUNK, H_TRUNK, true),
            l3: Dense::zeros(H_TRUNK, H_TRUNK, true),
            head_policy: Dense::zeros(POLICY_OUT, H_TRUNK, false),
            head_value1: Dense::zeros(H_VALUE, H_TRUNK, true),
            head_value2: Dense::zeros(4, H_VALUE, false),
            head_win1: Dense::zeros(32, H_TRUNK, true),
            head_win2: Dense::zeros(4, 32, false),
            head_score: Dense::zeros(1, H_TRUNK, false),
        }
    }

    /// Small random init. Only used for smoke tests — a random net is worse than
    /// the hand-written evaluator, which is exactly why the search blends both.
    pub fn random(seed: u64) -> Self {
        let mut n = Net::zeros();
        let mut rng = crate::game::Rng::new(seed);
        let mut fill = |d: &mut Dense, scale: f32| {
            for v in d.w.iter_mut() {
                *v = (rng.below(20_001) as f32 / 10_000.0 - 1.0) * scale;
            }
        };
            fill(&mut n.l1, (2.0f32 / NFEAT as f32).sqrt());
        fill(&mut n.l2, (2.0f32 / H_TRUNK as f32).sqrt());
        fill(&mut n.l3, (2.0f32 / H_TRUNK as f32).sqrt());
        fill(&mut n.head_policy, (2.0f32 / H_TRUNK as f32).sqrt());
        fill(&mut n.head_value1, (2.0f32 / H_TRUNK as f32).sqrt());
        fill(&mut n.head_value2, (2.0f32 / H_VALUE as f32).sqrt());
        fill(&mut n.head_win1, (2.0f32 / H_TRUNK as f32).sqrt());
        fill(&mut n.head_win2, (2.0f32 / 32.0).sqrt());
        fill(&mut n.head_score, (2.0f32 / H_TRUNK as f32).sqrt());
        n
    }

    #[inline]
    pub fn forward<'s>(&self, feats: &[f32; NFEAT], scratch: &'s mut Scratch) -> NetOut<'s> {
        let s = scratch;
        self.l1.forward(feats, &mut s.h1);
        self.l2.forward(&s.h1, &mut s.h2);
        self.l3.forward(&s.h2, &mut s.h3);
        self.head_policy.forward(&s.h3, &mut s.policy);
        self.head_value1.forward(&s.h3, &mut s.v1);
        self.head_value2.forward(&s.v1, &mut s.v);
        self.head_win1.forward(&s.h3, &mut s.w1);
        self.head_win2.forward(&s.w1, &mut s.wv);
        self.head_score.forward(&s.h3, &mut s.sc);
        let mut utility = [0.5f32; 4];
        for i in 0..4 {
            utility[i] = sigmoid(s.v[i]);
        }
        let mut win = [0.25f32; 4];
        for i in 0..4 {
            win[i] = sigmoid(s.wv[i]);
        }
        NetOut {
            policy: &s.policy,
            utility,
            win,
            own_score: sigmoid(s.sc[0]),
        }
    }

    /// Write in the exact order `read` expects. The header is `key=value` lines
    /// terminated by a blank line, so Python can parse it without knowing Rust's
    /// type names.
    pub fn save(&self, path: &str) -> std::io::Result<()> {
        let f = std::fs::File::create(path)?;
        let mut w = std::io::BufWriter::new(f);
        let header = format!(
            "TNE1\nnfeat {}\ntrunk {}\nvalue_hidden {}\npolicy_out {}\n\n",
            NFEAT, H_TRUNK, H_VALUE, POLICY_OUT
        );
        w.write_all(header.as_bytes())?;
        self.l1.write_to(&mut w)?;
        self.l2.write_to(&mut w)?;
        self.l3.write_to(&mut w)?;
        self.head_policy.write_to(&mut w)?;
        self.head_value1.write_to(&mut w)?;
        self.head_value2.write_to(&mut w)?;
        self.head_win1.write_to(&mut w)?;
        self.head_win2.write_to(&mut w)?;
        self.head_score.write_to(&mut w)?;
        w.flush()
    }

    pub fn load(path: &str) -> std::io::Result<Self> {
        let mut r = std::io::BufReader::new(std::fs::File::open(path)?);
        let mut head = String::new();
        loop {
            let mut line = String::new();
            let n = r.read_line(&mut line)?;
            if n == 0 {
                return Err(std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    "truncated header",
                ));
            }
            if line.trim().is_empty() {
                break;
            }
            head.push_str(&line);
        }
        let get = |k: &str| -> Option<usize> {
            head.lines()
                .find(|l| l.starts_with(k))
                .and_then(|l| l.split_whitespace().nth(1))
                .and_then(|v| v.parse().ok())
        };
        let nf = get("nfeat").unwrap_or(0);
        let ht = get("trunk").unwrap_or(0);
        let hv = get("value_hidden").unwrap_or(0);
        let po = get("policy_out").unwrap_or(0);
        if nf != NFEAT || ht != H_TRUNK || hv != H_VALUE || po != POLICY_OUT {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!(
                    "weight file is for nfeat={nf} trunk={ht} vhidden={hv} policy={po}, \
                     this build is nfeat={NFEAT} trunk={H_TRUNK} vhidden={H_VALUE} policy={POLICY_OUT}"
                ),
            ));
        }
        let n = Net {
            l1: Dense::read_from(&mut r, (H_TRUNK, NFEAT, true))?,
            l2: Dense::read_from(&mut r, (H_TRUNK, H_TRUNK, true))?,
            l3: Dense::read_from(&mut r, (H_TRUNK, H_TRUNK, true))?,
            head_policy: Dense::read_from(&mut r, (POLICY_OUT, H_TRUNK, false))?,
            head_value1: Dense::read_from(&mut r, (H_VALUE, H_TRUNK, true))?,
            head_value2: Dense::read_from(&mut r, (4, H_VALUE, false))?,
            head_win1: Dense::read_from(&mut r, (32, H_TRUNK, true))?,
            head_win2: Dense::read_from(&mut r, (4, 32, false))?,
            head_score: Dense::read_from(&mut r, (1, H_TRUNK, false))?,
        };
        Ok(n)
    }
}

#[inline]
fn sigmoid(x: f32) -> f32 {
    1.0 / (1.0 + (-x).exp())
}

/// Reusable activation buffers. One per search worker: allocating these per
/// network call would dominate the cost.
#[derive(Clone)]
pub struct Scratch {
    pub h1: Vec<f32>,
    pub h2: Vec<f32>,
    pub h3: Vec<f32>,
    pub policy: Vec<f32>,
    pub v1: Vec<f32>,
    pub v: Vec<f32>,
    pub w1: Vec<f32>,
    pub wv: Vec<f32>,
    pub sc: Vec<f32>,
}

impl Default for Scratch {
    fn default() -> Self {
        Scratch {
            h1: vec![0.0; H_TRUNK],
            h2: vec![0.0; H_TRUNK],
            h3: vec![0.0; H_TRUNK],
            policy: vec![0.0; POLICY_OUT],
            v1: vec![0.0; H_VALUE],
            v: vec![0.0; 4],
            w1: vec![0.0; 32],
            wv: vec![0.0; 4],
            sc: vec![0.0; 1],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::maps::MapSpec;

    #[test]
    fn roundtrip() {
        let n = Net::random(3);
        let dir = std::env::temp_dir().join("tne-net-roundtrip");
        std::fs::create_dir_all(&dir).unwrap();
        let p = dir.join("w.bin");
        n.save(p.to_str().unwrap()).unwrap();
        let m = Net::load(p.to_str().unwrap()).unwrap();
        for (a, b) in n.l3.w.iter().zip(m.l3.w.iter()) {
            assert_eq!(a, b);
        }
        for (a, b) in n.head_policy.b.iter().zip(m.head_policy.b.iter()) {
            assert_eq!(a, b);
        }
    }

    #[test]
    fn forward_is_finite() {
        let n = Net::random(5);
        let g = MapSpec::default_map().start_game(4, 1);
        let mut f = [0f32; NFEAT];
        crate::features::extract(&g, &mut f);
        let mut s = Scratch::default();
        let o = n.forward(&f, &mut s);
        assert!(o.policy.iter().all(|v| v.is_finite()));
        assert!(o.utility.iter().all(|v| (0.0..=1.0).contains(v)));
    }

    /// Microbenchmark. Not a correctness test — prints how many ns each
    /// single-sample forward costs so we can see whether `forward_batch` is
    /// worth wiring up.
    #[test]
    #[ignore]
    fn bench_single_forward() {
        let n = Net::random(42);
        let feat = [0.1f32; NFEAT];
        let mut s = Scratch::default();
        // Warmup
        for _ in 0..1000 {
            let _ = n.forward(&feat, &mut s);
        }
        let n_iters = 100_000;
        let start = std::time::Instant::now();
        for _ in 0..n_iters {
            std::hint::black_box(n.forward(&feat, &mut s));
        }
        let elapsed = start.elapsed();
        println!(
            "single forward: {} iters in {:?} = {:.0} ns/iter ({:.2} us)",
            n_iters,
            elapsed,
            elapsed.as_nanos() as f64 / n_iters as f64,
            elapsed.as_nanos() as f64 / n_iters as f64 / 1000.0,
        );
    }
}
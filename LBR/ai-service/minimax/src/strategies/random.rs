//! A strategy that randomly chooses a move, for use in tests.

use super::super::interface::*;
use rand::rngs::StdRng;
use rand::prelude::IndexedRandom;
use rand::SeedableRng;
use std::marker::PhantomData;

pub struct Random<G: Game> {
    game_type: PhantomData<G>,
    rng: StdRng,
}

impl<G: Game> Random<G> {
    pub fn new() -> Self {
        Self::with_seed(0)
    }

    /// Deterministic constructor so a seeded ladder is reproducible.
    pub fn with_seed(seed: u64) -> Self {
        Self {
            game_type: PhantomData,
            rng: StdRng::seed_from_u64(seed),
        }
    }
}

impl<G: Game> Default for Random<G> {
    fn default() -> Self {
        Random::new()
    }
}

impl<G: Game> Strategy<G> for Random<G>
where
    G::M: Copy,
{
    fn choose_move(&mut self, s: &G::S) -> Option<G::M> {
        let mut moves = Vec::new();
        G::generate_moves(s, &mut moves);
        moves.choose(&mut self.rng).copied()
    }
}

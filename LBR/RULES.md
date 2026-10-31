# Land Between Rivers (LBR) — rules transcription

Implementation of Reiner Knizia's *Tigris & Euphrates* (3–4 players; the donor
engine also defines a 2-player practice variant). Client owns the rules; the
server stores the last accepted state.

Sources, both in `/home/mihai/personal/tigris/`:

- `Tigris_&_Euphrates.txt` — condensed rulebook (Eric Postpischil, draft 1.3,
  2007), incorporates the FAQ. This is the source of truth.
- `tigris-and-euphrates/src/game.rs` — donor engine; `docs/BUGS.md` records
  corrections where the donor diverged from the rulebook. Where donor and text
  disagree, the text/BUGS ruling wins.
- `tigris-and-euphrates/src/maps.rs` + `game.rs::BOARD` — board layout.

## Components

- Board 16 columns × 11 rows. Cells: land, river (`x`), or starting temple +
  treasure (`t`). Layout (`BOARD` in `game.rs`):

```
....xxxxx.t.x...
.t..x.......x..t
...xxt......xx..
xxxx.........xxx
.............txx
..............x.
xxxx.....t..xxx.
.t.xxxxx....x...
.......xxxxxx.t.
......t.........
..........t.....
```

  Row index 0 is the top row; column index 0 is the left column.
- 153 civilisation tiles: red temples 57, blue farms 36, green markets 30,
  black settlements 30. Ten red temples start on the board, each with one
  treasure; the bag holds the other 47 red.
- Six monuments, one per unordered colour pair: RG, RB, GB, BR, BG, BB? No —
  BR, BG, BK? Use codes: RG, RB, GB, BK? Colours are R (red), B (blue), G
  (green), K (black). Pairs: RG, RB, GB, KB (black-red), KG (black-green),
  KB? Correct pairs: RG, RB, GB, KR, KG, KB.
- Each player: four leaders (R priest, B farmer, G trader, K king), two
  catastrophes, one unification marker, six tiles drawn from the bag.
- Treasures are wild cubes. A player's score is the lowest of their four
  colour scores after treasures are assigned greedily to the currently lowest
  colour.

Codes used by the client: `R` red/temple, `B` blue/farm, `G` green/market,
`K` black/settlement, `M` facedown monument tile, `C` catastrophe.

## Setup

- Place a red temple + treasure on each `t` cell (ten).
- Shuffle the remaining 143 tiles into the bag.
- Every player draws six.
- Starting player is random (seat shuffle at game start).
- Each player's hand is private; only counts are shown to opponents.

## Turn

Up to two actions per turn, each one of:

1. Move a leader (including placing from off-board, or withdrawing).
2. Place a civilisation tile.
3. Place a catastrophe tile.
4. Swap up to six tiles.

After each action:

- Treasure rule: if the affected kingdom has >1 treasure and a green trader,
  that trader's owner takes all but one. Treasures nearer a board edge must be
  taken first; the kept treasure must be one of the farthest from an edge.
- Monument check (tile placement only): if the new tile completes a 2×2 square
  of its colour, the active player may build an available monument of a pair
  containing that colour. If declined, it can never be built there.

After the turn's actions:

- Monument scoring: for each monument, for each of its two colours, if the
  active player has a leader of that colour in the monument's kingdom, gain
  one point of that colour.
- Every player refreshes to six tiles from the bag.
- Game end (at end of turn): ≤2 treasures remain on the board, or a player
  would draw but the bag is empty.

Winner: highest lowest-colour score. Tiebreak: treasures collected, then total
raw colour points, then lower seat index. 2-player exact tie is a draw.

## Actions in detail

### Move a leader

- Destination: empty, non-river cell, adjacent to a red temple (not a facedown
  monument tile), not a catastrophe, not a monument.
- From off-board or from anywhere on the board; may not split its kingdom and
  rejoin the pieces in one move.
- May not join two kingdoms (at most one leader-kingdom adjacent).
- If the destination kingdom has another player's leader of the same colour:
  revolt (internal conflict).
- A leader may be withdrawn (moved off the board).

### Revolt

- Attacker = the player placing the leader; defender = the incumbent.
- Attacker may send any number of red tiles from hand; then defender may.
- Strength = red tiles adjacent to own leader + sent tiles. Ties: defender
  wins.
- Winner gains 1 red point. Loser's leader leaves the board.
- Then treasure rule on that kingdom.

### Place a civilisation tile

- Empty cell; blue only on river, all other colours only on land.
- May not join three or more kingdoms.
- If it joins two kingdoms: unification marker; resolve same-colour conflicts
  (below); the tile scores nothing. If it joins fewer than two kingdoms: score
  1 point of the tile's colour to the matching-colour leader's owner in the
  resulting kingdom, else to the black leader's owner, else nobody.
- After conflict resolution: treasure rule, then monument check.

### War (external conflict)

- When the tile joins two kingdoms, for every colour where both kingdoms have
  a leader, there is a conflict.
- The active player chooses the resolution order when several colours
  conflict.
- Attacker = active player if involved, otherwise the involved player nearest
  clockwise from the active player. The other is defender.
- Attacker sends any number of tiles of the conflict colour, then defender.
- Strength = conflict-colour tiles in own kingdom (unification tile excluded) +
  sent tiles. Ties: defender wins.
- Winner gains 1 point of that colour. Loser's leader leaves the board.
- Every conflict-colour tile in the loser's kingdom is discarded and gives the
  winner one more point, except:
  - red temples bearing a treasure,
  - red temples adjacent to another leader (evaluated after the losing leader
    is removed),
  - facedown monument tiles.
- Discards may split the kingdom and remove other conflicts (leaders no longer
  connected).
- When all conflicts are done: remove the unification marker, leaving the real
  tile; no point for the tile; then treasure rule and monument check.

### Catastrophe

- Any cell that is empty or holds a tile, but not a treasure, monument, leader
  or existing catastrophe.
- Cell becomes permanently unusable. Any leader left without an adjacent temple
  leaves the board.
- Two per player per game.

### Swap

- Discard any number of tiles (0–6) face down and draw the same number.

### Monument build

- 2×2 same-colour tiles completed by the just-placed tile; monument must still
  be available and share the colour.
- The four tiles turn facedown (treasures stay); a leader left without an
  adjacent temple leaves the board. Facedown tiles still connect the kingdom
  but do not support leaders, do not count in wars and cannot be destroyed.

## Client state model

`gameData` is a JSON object (plain, not compressed — state is small):

```js
{
  v: 1,
  tiles: Int[176],        // 0 empty, 1 R, 2 B, 3 G, 4 K, 5 monument/facedown
  leaders: [{seat, colour}|null; 176],
  treasures: Bool[176],
  catastrophes: Bool[176],
  unification: number,     // -1 when none
  monuments: [{type:'RG', at: index}],
  availableMonuments: ['RG', ...],
  players: [{hand:{R,B,G,K}, score:{R,B,G,K}, treasures, catastrophes, leaders:{R:index|null,...}}],
  bag: {R,B,G,K},
  activeSeat: number,
  actionsUsed: number,      // 0,1,2
  pending: null | {kind,...},
  history: [{seat, text, ...}],
  gameOver: bool,
  finalStandings: null | [{seat, score, treasures, total}],
}
```

`pending` kinds: `treasure`, `revoltSupport`, `warOrder`, `warSupport`,
`monument`. `pending.seat` is the player who must decide; `nextPlayer` sent to
the server is that seat, so `is_current` follows the decision maker.

Treasure and monument checks are queued in rule order after the triggering
action; the active seat resumes control after a decision made by another seat.

Hands and colour scores are private: opponents' hands are shown as counts and
their scores as hidden until game end. (The server stores one public blob, as
the other Vue games do; a player inspecting the network payload can see more
than the UI shows.)

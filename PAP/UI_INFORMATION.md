# PAP UI information table

What a player must answer at each decision point (from `RULEBOOK.md`), which facts answer it, where they show, and how prominent they are in each phase.
One icon per concept (registry: `vuePAP/src/components/board/icons.js`), used identically on venue cards, player boards, the prompt panel and the history log.
Words live in tooltips; the screen shows icons, numbers and placement.

Prominence: **H** = highlighted / large / in the prompt panel, M = normal, L = receded (dimmed or collapsed).

## Always answerable

| Question | Facts | Where | Prominence |
|---|---|---|---|
| Whose turn, and what is asked? | active seat, step | prompt panel header, glow on that seat's board + player table row | H |
| Where are we? | Year n/7, phase | header: 4-phase track (Post → Shift → Street → Audit) with the current one lit | H |
| Am I winning? | Victory Points if the game ended now (★ VP pip), Recognized Profit vs rivals, 40 threshold | player table and each board header: VP pip; player table: Recognized bar with a 40 tick | M |
| Who acts first / who is watched? | First Player, Audit Watch, Administration | seat markers (distinct icons) on board header + player table | M |

## Morning Post

| Question | Facts | Where | Post | Other |
|---|---|---|---|---|
| Can I advance a Charter, and found it? | target good, my stock of it, slots used, threshold, leader can't found, already contributed | charter card: good icon with my stock count, progress slots, "you could found it" mark when my contribution completes it | H | L |
| Who sold where last Year (Expose)? | lastStreet.salesByVenue | venue card: seller dots for last Year | H (choices) | hidden |
| Can I buy a Franchise? | gap to leader ≥ 10 | prompt panel option only when eligible | H | — |
| What does this Year's Scare do? | yearFx | header scare banner + the affected venue tinted | H | M |

## Morning Shift

| Question | Facts | Where | Shift | Other |
|---|---|---|---|---|
| Who can still act? | staff not acted, not new | my board: idle meeples lit, used ones dimmed with the tile icon | H | L |
| What can I brew right now? | recipes affordable with current ingredients (Tier-2 Quicksilver rule), Kettle space | my recipes: affordable ones lit, unaffordable dimmed with the missing ingredient icon | H | L |
| Is my Kettle full? | potions / capacity | bottle slots | H | M |
| Can I upgrade or hire? | next tier cost vs stock, roster slots | cauldron: next-tier cost icons, ✓ when affordable; empty meeple outlines = open slots | H | L |
| Do I pay a toll? | first player or not | tile buttons show crown −1 badge | H | — |

## High Street

| Question | Facts | Where | Street | Other |
|---|---|---|---|---|
| Where can I sell? | tier, Wants, my potions | venue card ring: green = I qualify | H | L |
| Solo or contested? | eligible seats | venue card: eligible-seat dots; 1 dot (mine) = solo at Anchor, ≥2 = exchange | H | — |
| Will this sale hurt me? | potion poison vs venue tolerance (over = +3 net, or +1 when Levies are doubled, plus Levy and Warning), Panicked + Preference mismatch = Warning | on my qualifying potion per venue: ⚠ badge with the reason in tooltip; also in the sell/commit forms before confirming | H | — |
| What will win the bid? | my potency + Hype − price, rivals' count (not bids), Preference tie-break | commit form: live score, rival count, preference ✓/✗ | H | — |
| Extra customers? | Boone, Franchise, Desperate | venue badges: boone, desperate shape | H | M |

## Audit

| Question | Facts | Where | Audit | Other |
|---|---|---|---|---|
| Will I be condemned? | warnings (−1 if Tier 4, −1 if T9) vs reputation | my board: warnings vs reputation gauge, red when warnings > reputation, from Street onward | H | M (from Street) |
| What will spoil? | unprotected potions, protect slots, Backed Futures | Kettle: potions that will spoil marked with a ✗ during Audit | H | — |
| What do I owe? | levyOwed (doubled by S11) | my board: levy chip (own only; rivals see nothing) | H | L |
| Who becomes First Player / Watch? | net Recognized this Year, cumulative Recognized ≤ 40 | player table: this Year's earnings column during Audit | H | L |

## Hidden information (never shown for rivals)

Potion poison counts and total potency (which would reveal Poison by subtraction), hand contents (count only), unrevealed exchange commits, levy owed. Rival potions show their public recipe stars and Dispensation, with `?` for total potency, including in tooltips and accessible labels.

## Icon registry (one concept → one icon)

Cash `crown` · Recognized Profit `vp` (Crowns of profit, not VP; the VP pip is text, ★ VP n) · Hype `hype` (locked: + padlock) · Reputation `reputation` · Warning `warning` · Poison `poison` · Levy `levy` · Cauldron tier `cauldron-N` · Kettle slot `potion` · Ingredients `crystal` `toad` `quick` `banshee` · Staff `staff-<rank>` · Tiles `tile-<id>` · Anchor (max price) `anchor` · Serving overhead `overhead` · Poison tolerance `tolerance` · Founder's Cut `founderCut` · Civic Boone `boone` · Founder's Seal `seal` · First Player `firstPlayer` · Audit Watch `watch` · Administration `administration` · Franchise `franchise` · Public Review `review` · Testimonial `testimonial` · Apparatus `app-<id>` · Paperwork `paper-<id>` · Scare `scare` · Mood: calm ● circle, desperate ▲ triangle, panicked ✷ burst (shape + colour, colour-blind safe) · Preference `preference` · Reward recipe `back-recipe`.

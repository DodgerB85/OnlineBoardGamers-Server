# PAP engine spec

Source of truth for rules: `~/personal/bg-vibes/permits-and-poisons-rulebook.md` (copied to `PAP/RULEBOOK.md`).
This file fixes the data shapes, the step machine and the rulings where the rulebook is ambiguous.
Card text overrides the rulebook (rulebook §11).

## Architecture (client owns the rules)

- `vuePAP/src/js/engine/` is pure JS, no Vue, no DOM, no `Math.random`.
  - `cards.js` static card data
  - `rng.js` `mulberry32(seed)`; RNG state lives in `state.rng` so replay is deterministic
  - `state.js` `createGame(seed, playerNames, options)`, helpers (`player`, `log`, `gainHype`, `money`, `warn`...)
  - `steps.js` the step machine: `currentPrompt(state)`, `advance(state)`
  - `workshop.js`, `street.js`, `civic.js`, `audit.js`, `paper.js`, `scoring.js` action handlers
  - `index.js` exports `createGame`, `applyAction(state, seat, action) -> newState`, `currentPrompt(state)`, `legalActions(state, seat)`, `finalScores(state)`
- `applyAction` deep-clones (`structuredClone`), validates **everything before mutating**, throws `PAPError(msg)` on an illegal action. It never half-applies.
- Persistence: `gameData` = gzip+base64 JSON `{v:1, seed, options, players:[names], actions:[{seat, a, t}], state}`. `state` is a cache; replay = `createGame` + reduce `actions`.
- All turns are sequential: exactly one seat is "active" at any time. `allIsCurrentPlayers = [active seat's username]`. No simultaneous saves.
- Hidden information (trust-based, owner decision): sealed bids and poison counts are in `state`; the UI hides rivals' values until reveal. Never render another seat's `potions[].poison`, `commits`, or `hand` contents.

## State shape

```js
state = {
  v: 1, rng: <uint32>, year: 1..7, phase: 'post'|'shift'|'street'|'audit'|'over',
  step: <string>, queue: [ {step, seat, data} ],   // pending prompts, head is current
  first: seat, order: [seat...],                   // turn order this Year, order[0] = first
  watch: seat|null, administered: seat|null,
  players: [ {
    name, seat, cash: 20, recognized: 0, yearStartRecognized: 0, yearEarned: 0,
    hype: 0, lockedHype: 0, reputation: 0, warnings: 0, tier: 1, tierAtY7Start: 1,
    ingredients: {crystal, toad, quick, banshee},
    recipes: [recipeId],                 // public recipe pool
    staff: [ {id, rank:'apprentice'|'journeyman'|'master', hiredYear, tile:null|tileId, actedThisYear, everWorked} ],
    potions: [ {id, recipe, disp:null|dispId, poison:0..3, potency, protected:0, backedFutures:false, reoffered:false, fireWard:false} ],
    hand: [paperId], dispensations: [dispId], apparatus: [appId], testimonials: [testiId],
    seals: [venueId], franchise: false, upgradedThisYear: false,
    sales: [ {venue, overTolerance:bool, year} ],   // this Year's High Street, private until Expose window closes
    levyOwed: 0, exchangesEntered: 0, desperateVolume: 0,
    usedOnce: {}   // once-per-Year flags: secondKettle, fractionator, greenThumb, t7, t9, t10
  } ],
  venues: [ {id, customer:custId|null, mood:'calm'|'desperate'|'panicked', servedThisYear:0,
             unservedLastYear:false, boone:false, founder:null|seat, standingSince: year, overflow:false} ],
  council: { open: [ {charterId, progress, contributedBy:[seat], venue} ], review: null|{caller, frozen:seat, opportunities} },
  decks: { customer:[], customerDiscard:[], paper:[], paperDiscard:[], side:[], scare:[], scareDiscard:[], testimonial:[], testimonialMarket:[],
           charter:[], charterDiscard:[], dispensations:[], apparatus:[], marketRecipes:[] },
  yearFx: {scare:null|scareId, panic, allPanicked, calmToDesperate, surcharge, doubleLevies, craftExtraIngredient, pitchBlocked},  // this Year's Scare effects
  exchange: null | { venue, eligible:[seat], commits: {seat: {potionId, price, hype, bribe:bool}|'pass'}, toCommit:[seat] },
  lastStreet: { salesByVenue: {venueId: [seat]} },   // public: who sold where (for Expose targeting)
  log: [ {y, seat, key, args} ],                        // public log; never contains poison counts or unrevealed bids
  result: null | {scores, winner}
}
```

## Step machine (one active seat per prompt)

Year y:

1. **post.review** — if eligible caller (4–5p: 2nd in Recognized; 3p: lowest-Recognized non-leader; 2p: none) prompt `callReview|pass`. If called, each rival who earned a Seal in the immediately previous Year, in turn order: `rally|pass`.
2. **post.council** — seats in ascending cumulative Recognized (ties: later in turn order first). Prompt: choose any subset of open charters to contribute to (one unit each), `done`. Each contribution: pay the good, +1 Hype, progress +1; on reaching threshold resolve pass immediately (Boone, Seal to the contributor unless they are the RP leader or frozen), then queue **post.bylaw**.
3. **post.bylaw** — draw 3 candidate charters. Each seal holder (in ascending Recognized) votes `votes = seals.length` for a candidate. Most votes wins; tie → candidate voted for by the lowest-Recognized tied voter. No seal holders → first candidate. Losers go to the bottom of the charter deck.
4. **post.events** (auto) — reveal 1 Scare, apply. Testimonials are bought with Hype (step 7), not revealed.
5. **post.refresh** (auto) — Year 1: no-op (dealt at setup). Later: discard sold + unserved; refill; replacement for unserved enters `desperate`. 2p: also refresh the longest-standing customer. Overflow venues always get a fresh Workhouse/Golem-Pound customer.
6. **post.draw** (auto) — each seat draws 1 paper; if over hand limit (4, Plinth 5) queue `post.discard` for that seat.
7. **post.choices** — reverse turn order, each seat: any of `buyFranchise`, `expose{seat,venue}`, `backedFutures{potionId}` (needs a potion: only carried-over ones), `bribeScare{venue}`, `pamphlet{...}`, `plantTestimonial{testiId}`, `demonstration{venue}`, `inspection{seat}`, then `done`.
8. **shift** — forward turn order, each seat: `assign{staffId, tile, choice}` repeated (resolved immediately), `done`. Access Toll 1 Crown per assignment to streetAlchemist/cauldronWorks unless first player.
9. **street.solo** — classify each venue: eligible seats = tier ≥ venue tier and holds a potion meeting Wants. Turn order, each seat: `soloSale{venue,potionId}` on venues where they are the only eligible seat, `dump{potionId}`, `sabotage{seat,potionId}`, `done`.
10. **street.exchange** — for each venue with ≥2 eligible seats (venue order: workhouse, golem, lantern, fever, odditorium, nobles, overflow…), each eligible seat that has not yet entered an exchange this Year, in turn order: `commit{potionId, price 1..anchor, hype, bribe}` or `pass`. After all, reveal + resolve.
11. **street.extra** — per venue with a spare slot (Boone or Franchise, cap 2 customers, non-stacking) and per Desperate winner: queue `extraSale{potionId}|pass` prompts.
12. **street.reoffer** — each exchange loser in venue order: `reoffer{venue, potionId}|pass` onto an unserved customer they qualify for (solo, at Anchor).
13. **street.end** (auto) — decline penalty: every seat that was eligible at a venue whose customer stayed unserved and did not sell/commit there: −1 Reputation. Mark unserved customers.
14. **audit.paper** — turn order: play `favor{…}`, `expedite{…}`, `done`.
15. **audit.condemn** — for seats with warnings > reputation after cancels: `payCondemnation|discardJourneyman`.
16. **audit.spoil** — Tier 2+ (and Cold-Room Rack) seats choose which potions to protect: `protect{potionIds}`.
17. **audit.auto** (auto) — levies, ruin check, administration, recalibrate first player, watch, cleanup, year++. After Year 7 → `over` with `result`.
18. **admin.seize** — at the start of the next Year, the administered seat names a rival: `nameRival{seat}`; that rival then `takeIngredient{kind}`.

## Rulings (ambiguities resolved; keep this list current)

R1. Demand magnet (T1–T6): your winning sales at that venue are paid the Anchor instead of your committed price.
R2. Testimonials market: 3 face up; planting costs 3 Hype; refill from deck.
R3. Pamphlet (2 Hype): retarget this Year's Panic to another fixed venue, OR force a named rival's next sale this Year to make a Reliability check.
R4. Demonstration (4 Hype): deal a customer into an empty venue now.
R5. Desperate extra sales: same seat, same customer, paid Anchor each, bounded by Kettle capacity across the Phase.
R6. Boone extra slot: after the venue's first sale, any other eligible seat (turn order) may make one solo sale there at Anchor. Franchise extra slot: only the franchise holder, any venue they qualify for, one customer, at Anchor. Both at one venue: the franchise slot is used, the Boone yields.
R6a. Founder's Cut: the Founder gains the venue's printed Hype cut on every sale at that venue while the Boone is live, whoever sells.
R7. Charters: 10 cards in `cards.js` (`CHARTERS`); each names a venue, a target good and a threshold 3–5.
R8. Auto spoilage choice is never made silently: Tier 2+ seats always get the `audit.spoil` prompt when they hold unsold potions.
R9. Exchange tie-break 3 ("earlier position in the venue's Phase C order") = earlier in this Year's turn order.
R10. Recalibration tie "who reached the tied amount first" = earlier in the outgoing turn order.
R11. S13: blocks the named rival's first sale attempt this High Street (the potion may re-offer).
R12. T10 / Whistling Cork "ignore Wants" still requires the venue Tier.
R12a. Customer ★ Wants are a minimum potency bar (design doc §8.1, Appendix D; rulebook Setup step 5 calls them potency Wants): `★` = potency ≥ 1, `★★`/`★★+` = ≥ 2, `★★★` = ≥ 3, counting Poison markers and potency Dispensations.
R12b. The Curator of Regrets (O22) Wants The Grievance Elixir only; the printed "Grievance / Cordial" let it Want its own reward (owner ruling).
R13. Hire cost and rank: the acting piece may hire its own rank or lower; the hire cannot act until next Year (`hiredYear === year` → cannot be assigned).
R14. One Review opportunity = one full `post.council` stage (the Council contributions in a Year). Each Rally adds one such stage. Rally eligibility comes from a `seal` log event in the immediately previous Year; an older permanent Seal alone does not qualify. At expiry the frozen leader's barred contribution goes to the first open Charter they have not contributed to whose venue has no live Boone, counts double, and founds nothing.
R14a. `rulesVersion` is stored in game options. New games use version 2, whose Rally eligibility is the prior-Year Seal rule above. Imported saves without a version use version 1 and retain live-Boone Rally eligibility; replay frames use the same version as the saved game.
R15. Calling a Review spends the caller's first Council contribution: their first `contribute` records the slot on the chosen Charter with no goods, Hype or progress.
R16. A Charter whose venue has a live Boone takes no contributions until the Boone fades at Audit (exclusivity).
R17. A venue carries at most one Founder's Seal. The Founder's Cut is 0 for the current Recognized leader and for a frozen seat.
R18. Bribe and the retarget Pamphlet move this Year's Panic to another fixed venue (Scares name fixed venues only, so "a rival's venue" has no referent).
R19. Expose is once per target venue per Year (`usedOnce['expose:<venue>']` on the target).
R20. Inspection Notice: a target who cannot pay all outstanding Levies in full takes a Warning and the Levies stay owed.
R30. Audit order: Favor "order" puts the rival before the Favor player, Expediting "last" moves the rival to the end (`s.auditOrder`; only levy settlement reads it). Expediting "skipFee" waives 2 Crowns of levy per card (`p.skipLevy` count) and costs 1 Crown operating.
R31. Favor restitution is stored on the Favor player (`p.restitutionFrom`) and cleared at the next Audit's `audit.paper`, so it covers the following High Street's Sabotage.
R32. Levy shortfall: a seat pays what it has and each unpaid 2 Crowns is one Warning. Paying 2 Crowns per excess Warning leaves the Warnings standing; discarding a Journeyman cancels the excess with `cancelWarning` (Reputation restored). With neither affordable, the seat pays all its cash and keeps the excess.
R33. Backed Futures: the designated potion keeps `backedFutures` (and its 2 locked Hype) until it sells or spoils; sale code must call `releaseBackedFutures`. `backedAudits: 1` marks the Audit it survived without a Protect slot. Protect cannot target it.
R34. Administration's Warning is applied in the Audit that sets it. The Watch tie uses this Year's turn order (the order before the new one is set).
R35. Endgame: the softer -10 applies only where elimination would apply (leader at or above 40). Full ties on VP, Recognized and Cash go to the earlier seat. Worked-roster bonus is `workedCount === everEmployed`; Year 7 hires never work, so they block it.
R40. S14 (craft extra ingredient): the craft pays one extra ingredient of the first kind, in INGREDIENTS order, that the recipe costs.
R41. Tier 2+ Quicksilver counts double: a recipe's Quicksilver requirement q is paid with ceil(q/2) Quicksilver.
R42. Fractionator: the card says "2 of a different kind", so `to` names one kind twice, and that kind is not `from`.
R43. Swappers: `swap` is the number of units substituted (Toadstool paid as Quicksilver, or Quicksilver paid as Crystal). Doom-Recycled Banshee replaces the whole Banshee requirement with `swapPay`, two non-Banshee kinds.
R44. Once-per-Year abilities store the Year in `usedOnce` (`usedOnce.x === year` means spent), so nothing needs resetting.
R45. A side-deck draw that exceeds the hand limit queues `post.discard` for that seat once its shift ends.
R46. A drafted Market Recipe stays in the market. A drafted Dispensation or Apparatus leaves the deck.
R47. Promotion may target any idle staff member, including one hired this Year.
R48. Desperate extra units are volume to an already satisfied customer: no satisfaction Hype and no Franchise premium. Boone +1 Hype and Founder's Cut still apply per sale.
R49. The Franchise scale premium (+8) applies to every non-desperate sale by the holder: solo, Pricing Exchange win, Boone or franchise extra sale, and re-offer.
R50. Bribe: the bid counts as the spent Hype plus 2. It costs 2 Crowns operating, and the card is discarded at commit.
R51. Administration edge: a rival's `adminEdge` costs 1 Crown capital and scores +1 only if the administered seat also committed to that exchange. Both settle at reveal.
R52. The decline penalty (-1 Reputation) falls on seats that had a bid chance at an unserved venue: solo-eligible seats, and exchange seats prompted there. A seat that had already entered another exchange this Phase had no chance and is not penalised.
R53. S13: the blocked potion joins the re-offer list.

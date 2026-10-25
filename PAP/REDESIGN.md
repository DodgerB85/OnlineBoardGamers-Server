# Permits and Poisons redesign playtest

Keep the seven fiscal Years, hostile commerce, bureaucratic interference, Poison, and the threat of ruin. Give shops enough productive capacity to make those systems collide from Year 1. The first playtest candidate is **licensedMarket** in `experiments/engine.mjs`; it is an experimental rules supplement, separate from the live app.

The central economic decision is which customer to pursue, what it costs to make their potion, and how much margin to sacrifice to beat a rival. Growth should buy a better position in that contest. A player who expands too far, brews the wrong stock, or loses a price war should suffer consequences they can trace to those decisions.

## What survives

- The Customer Score: potency + committed Hype − price. The winner receives their committed price; everyone spends committed Hype.
- Physical ingredients, public recipes, hidden Poison, and differentiated customer Wants.
- Spoilage, serving overhead, levies, Expose, Sabotage, and scarce defensive resources.
- The Cash and Recognized Profit split. Reinvestment consumes liquidity; operating losses reduce both wealth and performance.
- Civic Charters, joint funding, competitive completion, and control over future Charter targets.
- A Final Audit that can disqualify an otherwise attractive workshop.

Do not add more rounds, more currencies, a technology tree, or a separate combat system to repair the opening.

## Why the current economy stalls

One Apprentice and no ingredients require three separate worker actions before the first potion: gather, promote, craft. With one action per Year, normal brewing starts in Year 3. Tier 1 also forbids hiring. The direct expansion sequence gathers in Year 1, promotes in Year 2, upgrades in Year 3, hires in Year 4, and uses the new worker in Year 5.

Those action costs would be reasonable in a longer game or one with more starting capacity. Together they consume most of this game's seven-Year investment horizon. Meanwhile, Condemnation and Administration can already punish a shop that has not brewed. The earlier Python economy simulation bypasses the production sequence entirely.

The sales phase has another choke point: a player can brew several potions but enter only one contested exchange. Extra stock consequently depends on private niches, exceptional volume rules, or other players failing to qualify. Increasing production alone does not guarantee more competition.

Finally, Tier gates close most of the city to a starting shop. They restrict opportunities to interact as well as protecting premium margins. Paid access can preserve the margin advantage without closing the market.

## Rules for the first table playtest

Use `RULEBOOK.md` except for the following replacements. All amounts below are initial playtest values.

### Start with founding partners

Each shop starts at Tier 1 with one Journeyman and one Apprentice, 20 Crowns, and the existing starting cards and two recipes. The first chosen recipe also supplies its printed ingredients once. These are loose ingredients, so the player may brew with them, invest them, or donate them.

Tier 1 allows two Apprentices and one Journeyman, at most three staff total. Tier 2 allows three Apprentices and two Journeymen, at most five total. Tier 3 and Tier 4 retain their current limits. Existing rank, promotion, hiring-cost, and new-hire timing rules remain.

The two original staff are founding partners. They draw their return from the shop's profits; they have no payroll charge. Mark those two pieces so recruited employees are distinguishable.

### Brew batches of up to two

A Journeyman or Master assigned to the Kettle may craft one or two potions. Choose and pay for each separately, including Poison and Dispensations. Recipes may differ. Both count against Kettle capacity. A batch grants no free ingredients, discounts, or spoilage protection.

The Second Kettle still grants exactly one additional potion without a worker; it does not grant another two-potion batch.

This makes production efficient enough to support competition while retaining the cost of taking a skilled worker away from upgrades, drafting, or recruitment. Tier 1 still protects no unsold potions.

### Rent missing permit Tiers

Any shop may attempt any venue if its potion meets the customer's Wants. When a real sale completes, subtract one Crown per missing Cauldron Tier as an operating permit charge:

`Permit charge = max(0, required venue Tier − shop Tier)`

The charge applies to solo, exchange, extra, Desperate, and re-offer sales. It is additional to serving overhead and never changes Customer Score, Anchor, Poison tolerance, or Reliability. Losing bidders pay no permit charge. Dumps have no permit charge.

For example, a Tier 1 shop selling clean at the Nobles' Ring for 9 pays 3 serving overhead and 3 permit charge, recognizing 3 profit. A Tier 4 shop makes 6 on the same sale. Upgrading therefore gives its owner room to undercut a rented competitor and still retain margin.

*The Temporary Certificate of Permanent Noncompliance is valid until the customer leaves.*

### Let stock limit pricing contests

Remove the limit of one contested exchange per shop per Year. A shop may enter successive venue exchanges while it holds qualifying potions. Keep the venue order, all-pay Hype, customer caps, and the rule that each losing potion may be re-offered only once to a different available customer.

Potions and Hype already limit participation. A shop that spends all its marketing power on the Workhouse can be vulnerable when the Fever Ward opens. Selling the versatile potion early can strand a more specialized one later.

### Charge recruited employees

At Audit, before Compliance Levies and Condemnation, each recruited employee hired in an earlier Year costs one Crown operating. A new hire starts drawing wages in the Year they first become eligible to act. Founding partners cost zero; leaving an eligible employee idle does not avoid wages.

Pay what Cash permits. Each started two Crowns of unpaid payroll causes one Warning, following the existing levy-shortfall convention. Then settle levies and resolve Condemnation normally. Payroll is not a Compliance Levy: Scares and Expediting Fees that modify levies do not modify payroll.

Hiring now purchases future productive capacity with a recurring liability. An extra Apprentice can supply the brewer, but also needs enough sales to justify their salary.

### Settle offences and remove automatic status punishment

Taking First Player no longer causes a Warning. Its existing toll relief and exchange tie priority remain. Remove the Audit Watch and Administration effects from this playtest. There is no automatic penalty for having lower Recognized Profit or choosing an investment Year.

When a player pays Condemnation, remove the excess Warnings they paid for. This settlement does not restore Reputation. The same offence is not billed again next Year. Favor cancellation retains its existing Reputation effect. Unsettled Warnings still impose their existing final VP penalty, and discarding a Journeyman remains the alternative to paying.

The experimental engine retains dormant Watch bookkeeping for compatibility with the existing step machine; it never puts a shop into Administration. No Watch marker is needed at the table.

### Remove the Franchise subsidy and test a reachable Audit

The Itinerant Franchise retains its existing two-Crown activation cost, trailing-player eligibility, and extra customer slot. Remove the eight-Crown premium on every sale. Trailing should offer a commercial opportunity, not multiply every successful sale by a subsidy larger than most normal margins.

Use a provisional Final Audit threshold of **20 Recognized Profit**. Preserve the current eligibility rule, including the fallback when every player is below the threshold, and the existing scoring formula. Twenty is a test value: reaching it must depend on successful commerce, and it must remain realistically attainable under price competition. Forty was never reached in the candidate's initial or holdout samples.

*The Board has halved the target. It has doubled the font size of FAILURE.*

## A first Year worth playing

Suppose a shop chooses Gnome-Scale Cream first. It starts with one Crystal and one Toadstool. Its Apprentice can gather another Crystal and Toadstool, letting the Journeyman brew two Creams. The player then has to find two customers or exploit a legitimate volume opportunity. Winning both means income; losing both can mean four ingredients spoiled at Audit.

Alternatively, the Apprentice can recruit and the Journeyman can brew the one supplied potion. The new employee starts contributing next Year and also starts drawing wages. Later, assigning the Journeyman to upgrade means giving up a potential two-potion batch. That is a substantial investment decision in an operating business.

## Experimental results

The runner plays through the actual PAP engine, modified only in disposable copies. It never creates sale bids without potions. Each variant uses the same seeds and rotating mixtures of simple lean, growth, Poison, and marketing policies. The numbers below are diagnostic comparisons, not forecasts for expert players or evidence of balanced strategies.

Initial sample: seeds 0–19, 20 four-player games per variant.

| Variant | Cumulative real sales per player at Year 7 | Contested sales per game | Mean final Recognized Profit |
|---|---:|---:|---:|
| Current rules | 1.73 | 2.05 | 1.94 |
| Founding partners and opening ingredients only | 4.41 | 8.00 | 12.55 |
| Batch brewing, more contests, Audit changes, full payroll | 5.14 | 12.15 | −4.35 |
| Same package without payroll | 5.49 | 12.25 | 12.90 |
| Permit rental and payroll only for recruits | 6.80 | 17.75 | 14.76 |

Full payroll is rejected for this candidate: even at one Crown per employee, it produced payroll shortfalls in 10 of the 20 four-player games and 16 of the 20 five-player games. Starting a functioning business and immediately taxing its entire productive base did not repair the economy.

Batch brewing without better market access also left considerable stock unsold: the sample without payroll spoiled 1.98 potions per player. Permit rental reduced this to 0.51 while increasing sales. This supports testing accessible competition rather than simply making more stock.

The final candidate averaged 7.07 real sales per player and 23.20 contested sales per game at five players. Its separate four-player sample on seeds 100–119 averaged 7.04 sales per player and 18.30 contested sales per game. The same basic improvement survived those different seeds; the sample does not establish fairness, game length, or strategic depth.

The provisional threshold of 20 activated the Final Audit's eligibility restriction in 17 of the 20 initial four-player games, 19 of the 20 five-player games, and 19 of the 20 separate four-player games. This establishes that the rule participates in these samples; it does not establish that its eliminations feel fair.

These policies are deliberately limited: they do not search multiple Years ahead, bargain, coordinate Charter completions, fully exploit Dispensations or Apparatus, strategically dump stock, or optimize auction bids. The eight-Crown Franchise subsidy remains available to the baseline policies. Do not compare these actual-engine totals directly with the older Python simulator's totals as if the policies and rules were identical.

## What still needs design work

**Public procurement needs its own strategy test.** The current bots mostly donate surplus ingredients, so these results say little about whether founding Charters can support a strong commercial route. A Hype-funded Charter currently returns Hype for its contribution, making a one-Hype pledge net free. Test removing the Hype reward on Hype-paid contributions before pricing the civic route. That change is not in this candidate.

**Growth needs to pay through operations.** The candidate still has low average final Tier, about 1.4 in both initial player counts. Determine whether renting is too attractive, whether the policies invest badly, or whether Tier 3's cost and skilled-worker action are still too expensive. Do not increase Tier VP to conceal a weak operating investment.

**The first seat has a tactical advantage in Sabotage.** It can destroy stock before later seats get their solo-sale opportunity. Test whether this produces calculated vulnerability or simply makes early turn order too valuable. Rotating shop identities in a small bot sample is not a seat-balance test.

**Twenty is not a calibrated quota.** The Final Audit's role is to make operating performance matter, not to make one lucky subsidized sale eliminate everyone else. Measure who crosses it and whether it changes the winner before fixing the value. All of the candidate's normal Poison risks, losses, and operating costs must remain in that measurement.

## First human playtest

Play one four-player game with the rules above and no midgame rule changes. Assign no compulsory strategy. Record the actions and keep the first two Years slow enough to ask what each player expects their investment or bid to earn.

Record each shop's Year-end crafts, real sales, dumps, spoilage, operating profit, Cash, wages, Warnings, and Tier. For every expansion, record the sales it makes possible before Year 7. Mark every contested exchange and every action taken specifically to change a rival's prospects.

Use these provisional questions to decide the next revision:

1. Did players have a feasible brew or meaningful commercial investment in Year 1? Was the choice understandable?
2. Did at least half the completed game sales involve competition or deliberate avoidance of a rival's niche? If not, determine whether demand or the auction structure is separating the players.
3. Did an early hire and an early upgrade each have a plausible operating payback before Year 7? Did staying small also remain credible?
4. Did losing an exchange hurt without making the rest of the game mechanically pointless? Was Sabotage something players could anticipate and price into their choices?
5. Did the Final Audit create pressure during play? Would the same player have won if its elimination rule were absent?
6. Could each player explain their largest loss by naming their decision, their rival's decision, or a visible risk they accepted?

An immediate rejection signal is a clearly superior mandatory opening, repeated inability to sell despite reading the market correctly, or a political route that never matters. More sales alone is not success. Success is more consequential decisions about other players within a manageable game length.

## Reproduce the experiments

From the server repository root:

```sh
node --test PAP/experiments/engine.test.mjs
node PAP/experiments/run.mjs 20 4 /tmp/pap-results-4p.json
node PAP/experiments/run.mjs 20 5 /tmp/pap-results-5p.json
node PAP/experiments/run.mjs 20 4 /tmp/pap-holdout.json 100
```

`experiments/results-4p.json` and `results-5p.json` contain the initial aggregate samples. `results-holdout.json` contains the separate candidate sample. `example-replay.json` contains the exact actions, public engine log, and expected final result for a four-player candidate game with seed 42. The experiment tests check complete games at two, four, and five players, deterministic replay, ingredient availability, batch validation, permit charges, and fine settlement.

These scripts create temporary engine copies and delete them afterward. They do not change the live rules, build frontend assets, migrate saves, or modify `bg-vibes`. Porting the selected rules into the app will require versioned replay behavior, action UI and translations, rulebook synchronization, and dedicated regression tests.

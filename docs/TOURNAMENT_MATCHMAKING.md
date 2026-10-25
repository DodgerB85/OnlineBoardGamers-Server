# Tournament matchmaking

Standard tournament draws use three priorities:

1. **Points:** sort players by tournament points, strongest first, and fill the existing table sizes in order. Equal scores stay together; score bands mix only at table boundaries. The search swaps only players with equal points, preserving each table's point mix.
2. **Rematches:** minimize the total number of previous encounters between tablemates. A pair that has met twice counts as two encounters.
3. **Speed:** among draws with the same rematch total, minimize the slowest table's availability score. The calibrated formula remains sequential response waits + 21 × simultaneous response wait.

The search compares `(rematches, slowest_table_score)` in that order, rather than adding a rematch penalty to speed. It may explore worse draws temporarily, but always returns the best draw by these priorities. The old penalty of 72 remains only in MG's separate fixed-schedule optimizer.

Round 1 has equal points and no previous opponents, so speed can guide the entire draw. Byes and Mini table sizes are decided before optimization. Points apply during the existing PT/RR/TL points phase; knockout participants have equal placement priority. MG retains its existing schedule and round-two groups.

shortcut: the 30-second annealing search finds the best draw it encounters, not a proven global minimum of rematches or duration; upgrade to an exact solver if optimality becomes a requirement.

## Verification

Run the backend regression tests:

```sh
LOCAL_USER_SQLITE3=True .venv/bin/python manage.py test tests.test_tourny_generator tests.test_shared_functions tests.test_lobby --noinput
```

The adjacent `FCM_profile_sim` project contains `benchmark_swiss_matchmaking.py`. It uses the CSV's real availability profiles and the existing FCM game simulator, with generated tournament results and chronological opponent history. It compares the old unrestricted optimizer, points-only grouping, and layered draws with speed weights 1:1.4, 1:7, 1:21 and 1:42.

```sh
../FCM_profile_sim/.venv/bin/python ../FCM_profile_sim/benchmark_swiss_matchmaking.py
```

Results are saved beside the benchmark script. These experiments are model comparisons, not a reconstruction of a live Indonesia tournament or a prediction of its calendar duration.

### CSV comparison (2026-10-25)

The weight comparison used 195 available profiles, three pools (24, 40 and 80 players), two search/history seeds, rounds 1/2/4, three seconds per search and 2,400 simulated schedules per draw. That is 18 cases, each comparing six methods. All player/table-size and score-band assertions passed.

For the retained 1:21 speed weights, totals across six cases per round were:

| Round | Previous optimizer's rematches | Layered rematches | Mean simulated duration change versus previous optimizer | Versus arbitrary points-only tables |
|---|---:|---:|---:|---:|
| 1 | 0 | 0 | −2.10% | −4.92% |
| 2 | 31 | 0 | −0.80% | −7.35% |
| 4 | 67 | 17 | +1.57% | −6.93% |

Percentages are averaged over cases; negative means faster. Later-round point mixes exactly matched the points-only tables, whereas the previous unrestricted search mixed scores freely. Remaining rematches are the best found within the time budget, not proven unavoidable.

Across all 18 cases, speed weights 1:1.4, 1:7 and 1:42 changed simulated duration relative to 1:21 by −0.11%, +0.29% and +0.61%, respectively. No alternative consistently won across pools and seeds. Keep the existing 1:21 calibration; these results do not justify retuning it. The old rematch penalty of 72 is unnecessary for the standard draw's strict priorities and is retained for MG only.

Raw draws, metrics and paired Monte Carlo intervals are in `../FCM_profile_sim/swiss_matchmaking_results.json` (path from the repository root). Monte Carlo intervals describe simulation sampling uncertainty for these fixed cases, not uncertainty across other player pools, search runs, or real tournaments. Time-budget searches can execute different numbers of swaps on different runs.

### Production-budget check

The 80-player round-two case (seed 9001) was also run at 30 seconds per search with all four weight choices and 2,400 simulations per draw:

```sh
../FCM_profile_sim/.venv/bin/python ../FCM_profile_sim/benchmark_swiss_matchmaking.py --budget 30 --sizes 80 --rounds 2 --seeds 9001 --output ../FCM_profile_sim/swiss_production_budget_results.json
```

The previous optimizer had 7 repeat encounters and mixed points across tables. The layered 1:21 draw had 0 repeat encounters and entirely equal-score tables. Mean simulated round durations were 2,605.3 versus 2,607.4 hours: a 0.08% increase, within Monte Carlo uncertainty. The 1:42 draw was equivalent in duration; 1:1.4 and 1:7 were slower. This supports retaining 1:21, without claiming it is globally optimal.

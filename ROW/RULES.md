# Great Western Trail (GWT) Core Rules Engine Specification

This document serves as the authoritative source of truth for the game rules, legal actions, state transitions, and evaluation boundaries of Great Western Trail. It is structured specifically for ingest by an AI agent building a rule-enforcement engine.

---

## 1. Game State Schema Boundaries

### Player State
*   **Inventory**: Coins (Dollars), Temporary Certificates, Permanent Certificates (from Station Master Tiles).
*   **Deck Architecture**: 
    *   `Draw_Stack`: Ordered array of cattle/objective cards.
    *   `Hand`: Array of cards (Strictly capped by `Hand_Limit`; starts at 4, up to 6).
    *   `Discard_Pile`: Face-up collection array.
*   **Ecosystem Positions**:
    *   `Cattleman_Position`: Node ID on the trail.
    *   `Engine_Position`: Coordinate index on the railroad track (0 to 39).
*   **Worker Section**: Matrix grid representing hired personnel across 3 specialized rows:
    *   Row 0: Cowboys.
    *   Row 1: Craftsmen.
    *   Row 2: Engineers.
    *   *Note*: Grid positions 5 and 6 grant 4 Victory Points at game end.
*   **Player Board Matrix**: Grid of 14 placement discs covering upgrade states (White or Dark corners).

### Board/Global State
*   **Trail Network**: Directed graph structure of nodes representing Locations (Neutral Buildings, Private Buildings, Hazards, Teepees, and Kansas City). Spaces without tiles are passing segments, not independent location nodes.
*   **Cattle Market**: Open drafting pool pool row categorized by breeding values/colors.
*   **Job Market**: Row-based matrix containing available Worker Tiles. Includes tracking for `Job_Market_Token` position.
*   **Foresight Pool**: Array of 6 slots in Kansas City containing face-up incoming board tiles.

---

## 2. Main Turn Loop Sequence
Every player's turn must evaluate exactly three sequential phases. No phase may be skipped, out-of-order, or interleaved.

```
[Start Turn] ──> [Phase A: Movement] ──> [Phase B: Action Resolution] ──> [Phase C: Draw Hand] ──> [End Turn]
```

### Phase A: Movement Validation & Toll Calculation
The active player must mutate their `Cattleman_Position` according to these strict operational constraints:

1.  **Step Vector**: Movement must be strictly forward, matching the directed path vectors of the map graph. Backward movement is illegal during this phase.
2.  **Step Limits**: 
    $$\text{Steps} \ge 1 \quad \text{AND} \quad \text{Steps} \le \text{Player's Current Step Limit}$$
    *Note*: Empty trail spaces are completely ignored during step accounting; only nodes populated by a tile/location count as a step.
3.  **Kansas City Termination**: If the moving track intersects the Kansas City node, movement must instantly stop there, forfeiting any unused steps.
4.  **Toll Evaluation (Hands)**: 
    When moving onto or over any location node displaying a Green or Black hand icon, a fee evaluation is triggered immediately.
    *   **Recipients**: 
        *   If the node is a Hazard or Teepee: Fee is paid to the Bank.
        *   If the node is an Opponent's Private Building: Fee is paid directly to that Player.
    *   **Toll Matrix**:

        | Player Count | Green Hand Fee | Black Hand Fee |
        | :--- | :--- | :--- |
        | **2 Players** | \$2 | \$2 |
        | **3 Players** | \$2 | \$1 |
        | **4 Players** | \$1 | \$2 |
    *   **Insolvency Rule**: If a player's wallet falls below the required fee amount, they must pay all remaining coins to the recipient, wallet changes to \$0, and movement continues uninterrupted. Tolls are *never* owed or paid retroactively if the player gains money later on the same tile.

### Phase B: Action Resolution
Action choices are conditionally dictated by the node type of the current `Cattleman_Position`.

```
                  Is Cattleman at a Location?
                     /                  \
         [Yes: Check Node Type]       [No: Kansas City]
             /            \                     |
[Neutral or Own Color]   [Opponent, Hazard, Teepee]  [Execute 5 Subphases]
       /        \                  |
[Local Actions] [Auxiliary]   [Auxiliary Only]
```

#### Node Evaluation Branching:
*   **Case 1: Neutral Building OR Private Building of Player's Own Color**
    *   *Option B1*: Execute the Local Actions printed on the tile. Multiple actions separated by full dividers may be executed once each in any arbitrary order. If an action shows a split white slash (`/`), the player must pick only one.
    *   *Option B2*: Forfeit all local tile actions to execute exactly *one* single unlocked `Auxiliary Action` from the side of the Player Board.
*   **Case 2: Opponent's Private Building, Hazard Tile, or Teepee Tile**
    *   The player is explicitly barred from using local tile features. They can *only* choose to execute one single unlocked `Auxiliary Action`.
*   **Case 3: Kansas City Node**
    *   The player must process all 5 sequential Kansas City subphases in numerical order:

#### The 5 Kansas City Subphases:
1.  **Foresight 1**: Select 1 tile from Foresight Spot 1; instantly deploy it to its corresponding game board section.
2.  **Foresight 2**: Select 1 tile from Foresight Spot 2; instantly deploy it to its corresponding game board section.
3.  **Foresight 3**: Select 1 tile from Foresight Spot 3; instantly deploy it to its corresponding game board section.
4.  **Income Resolution**: 
    *   The player reveals their full hand.
    *   Compute the unique subset of cattle types in hand. Duplicate card types contribute \$0 to the calculation.
    *   Sum the unique cattle breeding values.
    *   *Optional Modification*: Player can permanently decrease their temporary certificates to add a 1:1 value bump to the breeding total. Permanent certificates add their value automatically.
    *   Bank pays the player cash equal to this calculated total.
    *   All cards in hand are dumped into the player's `Discard_Pile`.
5.  **Delivery**:
    *   Select a valid delivery city crest whose designated city value is $\le$ the calculated total breeding income value.
    *   *Validation Check*: The chosen city must not already contain one of the player's discs, unless it is Kansas City or San Francisco.
    *   Remove a disc from the player board matrix to unlock its underlying upgrade benefit, then place it onto the chosen city space. Discs taken from slots with *dark corners* can only target cities with dark-corner crests.
    *   Evaluate **Engine Transport Costs**:
        $$\text{If } \text{Engine\_Position} \ge \text{City\_Crest\_Index} \longrightarrow \text{Cost} = \$0$$
        $$\text{If } \text{Engine\_Position} < \text{City\_Crest\_Index} \longrightarrow \text{Cost} = \$1 \times \text{number of visible red crosses between engine and city value}$$
    *   Mutate player state: Pay the transport cost to the bank.
    *   Reset `Cattleman_Position` to the starting horseman tile in the lower-right corner.
    *   Refill the empty Kansas City foresight spaces with face-up matching tiles from the Kansas City supply.

### Phase C: Draw Hand Optimization
*   Compare current `Hand` size against `Hand_Limit`.
*   Draw cards from `Draw_Stack` until `Hand` size equals `Hand_Limit`.
*   **Authoritative Deck Cycling Rule**: Do *not* auto-recycle the `Discard_Pile` when the `Draw_Stack` reaches zero. The discard pile must only be shuffled and transformed into a new face-down `Draw_Stack` at the exact frame a draw action is required and the draw stack is completely empty.

---

## 3. Core Engine Action Mechanics

### Hiring Workers
*   **Illegal Targets**: Worker tiles sitting in the row currently occupied by the `Job_Market_Token` cannot be selected.
*   **Cost Calculation**: Base cost is noted on the right side of the targeted worker's row, mutated by modifiers on the triggering action icon (\$0 change, +\$2 premium, or -\$1 discount).
*   **Placement Mechanics**: Deploy the worker to the leftmost vacant slot in its matching row type. If an immediate action is uncovered by this placement, resolve it instantly or forfeit it. If a row is full, the action is illegal.

### Deploying & Upgrading Private Buildings
*   **Validation**: To place building N, the player must have a count of craftsmen in their craftsman row $\ge$ the number printed in the tile's top-left corner.
*   **Deployment (Empty Space)**: Pay \$2 per craftsman specified on the tile, then place it onto an unpopulated building space on the board.
*   **Upgrading (Replacement)**: A player can swap an existing private tile on the board with a higher-valued tile from their personal supply. The craftsman row count must meet/exceed the differential required. Pay \$2 per craftsman differential. The replaced tile is permanently purged to the box.

### Engine Track & Station Master Mechanics
*   **Forward Movement**: Engine moves forward up to a maximum cap equal to the total number of engineers currently in the player's engineer row.
*   **Collision Detection**: Track nodes can only hold 1 engine at a time. During path evaluations, any track space containing an opponent's engine is treated as non-existent and skipped entirely for free.
*   **Station Upgrades**: Stopping on a turnout space presents an immediate optional choice to upgrade the station:
    *   Pay the explicit upgrade cost listed next to the station space.
    *   Deploy a player disc onto the station space (abiding by white/dark corner parameter matching rules).
    *   *Station Master Drafting*: If a Station Master Tile is present, the player can acquire it by removing their rightmost worker from any worker row. Swap the worker tile into the station slot, and add the Station Master Tile face up to your play area. Uncovered slots can be re-filled later.
*   **Terminal Loop (Space 39)**: Reaching Space 39 terminates engine forward momentum. Player resolves the upgrade choice, then must move the engine backwards to any vacant space on the track, immediately triggering a \$3 payout from the bank.

### Indian Trade & Hazard Removal
*   **Teepee Trade**: Select 1 teepee tile from the board's trade zone. Collect or pay the value indicated by the track overhead. If the track is empty, the action cannot be performed.
*   **Hazard Abatement**: Purge 1 hazard tile from a board section. If the triggering action displays a coin cost, pay it to the bank; if not, clear it free of charge. Add the tile to your scoring pile.

### Playing Objective Cards
*   **Permitted Windows**: Objective cards can be played from hand only at two specific intervals: Before Phase A movement, or immediately before/after executing any single action block during Phase B. Playing them mid-action or during Phase C is strictly illegal.
*   **Resolution**: Move the card face up to the personal objective area, resolve its top-left immediate bonus (or forfeit it). At game end, unfulfilled tasks on played cards penalize the player with negative victory points.

---

## 4. Game End Trigger & Final Scoring Mechanics

### End of Game Trigger
When processing Kansas City subphases 2 or 3, if a worker tile is placed into the final empty space of a job market row, it pushes the `Job_Market_Token` along the red arrow out of the matrix.
*   The active player claims the `Job_Market_Token` (+2 VP at scoring).
*   The active player completes their current turn normally.
*   Every other player receives exactly one final standard turn. Players reaching Kansas City during this final round skip worker drafting entirely if only worker slots remain.

### Final Scoring Breakdown
An automated script must evaluate exactly 11 distinct scoring properties to determine the winner:

1.  **Liquid Wealth**: 1 VP per full \$5 in player possession.
2.  **Private Infrastructure**: Sum of victory points printed on all deployed private building tiles.
3.  **Transit Logistics**: Sum of positive/negative victory points uncovered on city crests containing player discs.
4.  **Railroad Stations**: Sum of victory points listed next to upgraded train stations holding player discs.
5.  **Hazard Mitigation**: Sum of victory points on collected hazard tiles.
6.  **Herd Value**: Search full player deck (`Draw_Stack` + `Hand` + `Discard_Pile`) and sum the point icons on all cattle cards.
7.  **Objective Evaluation**: Combine all objective cards in play (including unplayed deck cards the player chooses to count). Earn positive points for fully completed task combinations; subtract negative point penalties for any unfulfilled card sets.
8.  **Station Mastery**: Evaluate and sum the customized scoring tasks listed on the lower halves of acquired Station Master Tiles.
9.  **Personnel Scaling**: Gain 4 VPs for every worker located in slots 5 or 6 of the worker section grid.
10. **Player Board Upgrades**: Gain 3 VPs if the player successfully cleared the specific designated disc slot on their player board.
11. **Endgame Token**: 2 VPs to the holder of the `Job_Market_Token`.

*Tie-Breaker Rule*: In the event of a point tie, the victory is shared equally among tied players.
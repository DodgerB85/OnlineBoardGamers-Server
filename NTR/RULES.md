# Napoleon's Triumph - Rules Reference

**Source:** NT_Annotated_Rules_v1.4.pdf + QuickReferencepage1-3.jpg  
**Location:** `/NTR/RULES.md` (this file)

---

## Table of Contents
1. [Game Overview](#game-overview)
2. [Components & Unit Types](#components--unit-types)
3. [Map & Locales](#map--locales)
4. [Approaches & Movement](#approaches--movement)
5. [Commands & Command Limits](#commands--command-limits)
6. [Road Movement](#road-movement)
7. [Reinforcements](#reinforcements)
8. [Attacks](#attacks)
9. [Attack Procedure (Step-by-Step)](#attack-procedure-step-by-step)
10. [Retreats](#retreats)
11. [Morale](#morale)
12. [Night Round](#night-round)
13. [Elite Units](#elite-units)
14. [Winning the Game](#winning-the-game)
15. [Optional Rules](#optional-rules)
16. [Team Play](#team-play)
17. [Quick Reference Summary](#quick-reference-summary)

---

## Game Overview

**Napoleon's Triumph** simulates the Battle of Austerlitz (December 1-2, 1805).  
- **2 players** (Allied vs French), up to **8 players** with Team Play  
- **10 rounds** maximum (Round 1-10), with Night round between Dec 1-2  
- **Decisive Victory:** Demoralize enemy army (morale reaches 0)  
- **Marginal Victory:** Control objective locales after Round 10

### Scenarios
| Scenario | Date | Description |
|----------|------|-------------|
| **dec_01** | 1 Dec 1805 (Evening) | Allies concentrated on Pratzen Heights; French deployed before Austerlitz |
| **dec_02** | 2 Dec 1805 (Morning) | Historical battle morning; Allies moving southward |

---

## Components & Unit Types

### Unit Types
| Type | Strength | Special Rules |
|------|----------|---------------|
| **Commander** | 0 | Required for Corps Moves; provides command points |
| **Infantry** | 1-3 | Standard foot units |
| **Guard Infantry** | 3 | Elite; 4 morale penalty first commitment; cannot pair with non-Guard in attacks/counter-attacks |
| **Cavalry** | 1-3 | High mobility; 2 morale penalty first commitment (heavy cav = 3-strength); can counter-attack regardless of initial result |
| **Artillery** | 1 | Operates from approaches; cannot lead Corps Move attacks; bombardment doesn't force retreat |

### Unit States
- **Face-down (hidden):** Strength concealed from opponent (Fog of War)
- **Face-up (revealed):** Strength visible; turned face-up when leading attack/defense/counter-attack
- **Reserve:** In locale center, not blocking approaches
- **Blocking Approach:** Occupying an approach, controlling that path

### Corps
Units grouped under a Commander. Corps Move activates all units in corps simultaneously.

**Allied Corps (4):** Austrian, Russian 1st, Russian 2nd, Russian 3rd

**French Corps (8 total):**
- **On-map at start (6):** Imperial Guard, II Corps (Marmont), III Corps (Davout), IV Corps (Soult), V Corps (Lannes), Cavalry Reserve (Murat)
- **Reinforcements (2):** I Corps (Bernadotte), VI Corps (Davout) — enter per Time Track

---

## Map & Locales

### Locale Properties
- **Terrain:** Clear, Rough, Wooded, Hill, Town, Fort, Stream, River
- **Capacity:** Max units (varies by locale)
- **Objective:** Starred locales (red, black, green, blue) for marginal victory
- **Deployment Zones:** Allied (North/Center/South), French (West/Center/East)
- **Reserve Area:** Center of locale
- **Approach Sides:** Each approach has two sides (attacker/defender side)

### Key Locales
- **Pratzen Heights** (Hill, Objective) - Central high ground
- **Santon Hill** (Hill, Objective, Fort) - French left flank
- **Austerlitz** (Town, Objective) - French right
- **Telnitz/Sokolnitz** (Town) - Southern towns

---

## Approaches & Movement

### Approach Types
| Type | Capacity | Terrain Examples |
|------|----------|------------------|
| **Wide** | 3 units/side | Clear, Rough, Wooded, Stream, Road |
| **Narrow** | 1 unit/side | Clear, Rough, Wooded, Stream, River, Road |

### Terrain Penalties (Obstruction)
When defender **blocks** the approach:
- **Cavalry** leading attack/defense/counter-attack: -1 penalty
- **Infantry** leading attack: -1 penalty
- **Artillery** penalty if defense approach occupied

### Movement Basics
- **Normal Move:** 1 locale per turn (into reserve or blocking approach)
- **From Reserve:** Can move to any adjacent approach or adjacent locale's reserve
- **From Blocking Approach:** Can move to reserve in current locale OR reserve in adjacent locale across blocked approach
- **Into Enemy Locale:** = Attack (see Attacks)
- **Impassable Approaches:** Cannot cross

### Road Movement
- **Start/End:** Must start in reserve, end in reserve (unless all cavalry)
- **Main Road:** Up to 3 locales
- **Local Road:** Up to 2 locales
- **Mixed:** Up to 2 locales
- **Road Congestion Rules (corps with 2+ units):**
  1. Cannot enter locale if reserve contains units that moved there earlier this turn
  2. After corps enters, no other units can move into/through that reserve this turn
  3. Must stop if adjacent locale has enemy corps (2+ units)
- **Cavalry by Road:** Can end blocking approach (must be crossed by same road)
- **Cavalry Attack by Road:** Must be feint; can continue if defender retreated

---

## Commands & Command Limits

### Command Types
| Command | Cost | Description |
|---------|------|-------------|
| **Corps Move** | 1 Corps Command | Move all units in a corps (must have Commander) |
| **Detach Move** | 1 Corps Command | Detach unit(s) from corps and move them; **cannot use road movement** |
| **Attach** | 1 Corps Command | Attach detached unit to corps; **not a move command** (unit can move then attach same turn) |
| **Unit Move** | 1 Independent Command | Move single detached unit; can use road movement |

### Command Limits (per turn)
| Side | Corps Commands | Independent Commands |
|------|----------------|---------------------|
| **Allied** | 5 | 3 |
| **French** | Unlimited (1 per commander) | 4 |

*With Team Play: limits are shared by team (senior players use first)*

### Combined Attacks
- **2+ Corps Moves** may combine if corps start in same position and attack across same approach
- **2 Unit Moves** may combine if both units are artillery blocking same attack approach
- Each command in a combined move still counts separately against command limits

### Detachment Limits
- **Allied:** 3 detachments per game (from original rules; PDF does not specify)
- **French:** 5 detachments per game (from original rules; PDF specifies up to 6 at setup)
- *Team Play: shared by team (senior players use first)*

---

## Reinforcements

### French Reinforcements
- Enter on **blue entry locales** per Time Track
- If time < scenario start: eligible from Round 1
- **Optional:** Player may delay entry (makes marginal victory easier if none enter)
- **Double Move:** French reinforcements get **2 commands on entry turn** (2nd after 1st completes; need not be consecutive)
- **French Fixed Battery:** Selected by French CinC at setup (Step 9); must be turned face-up and repositioned to block an approach in its set-up locale; may not move during game

### Allied Reinforcements (1 Dec scenario)
- Enter on **red entry locales** from Round 1

### Entry Rules
- Must use **road movement** to enter
- Cannot use **enemy-occupied** entry locale
- Require **commands** (Corps Move or Unit Move)
- Different pieces may use different entry locales

---

## Attacks

### Attack Concepts
- **Attack Command:** The move command causing the attack
- **Defense Locale:** Target enemy-occupied locale
- **Attack Locale:** Origin locale
- **Defense Approach:** Defender's side of approached crossed
- **Attack Approach:** Attacker's side of same approach
- **Defense Reserve:** Reserve area of defense locale
- **Attack Reserve:** Reserve area of attack locale

### Attack Flexibility
- Attacker can use **subset** of units in attack locale
- Sequential attacks from multiple approaches are key
- Units can feint, attack from reserve, counter-attack without moving

---

## Attack Procedure (Step-by-Step)

### Step 0: Combined Attacks (Before Step 1)
- **2+ Corps Moves** may combine if corps start in same position and attack across same approach
- **2 Unit Moves** may combine if both units are artillery blocking same attack approach
- Each command in a combined move still counts separately against command limits

### Step 1: Attack Declaration (Attacker)
- Name **attack approach** only (not which units)
- **Guard Attack Option:** Declare if Guard Infantry present; reveal one Guard unit (face-up then down); cannot be feint; Guard must lead; no feint if attack approach obstructed

### Step 2: Retreat Option (Defender)
- **Defend:** Name defending pieces (all pieces blocking defense approach MUST be named)
- **Retreat:** If no defending pieces named (see Retreats)
- **Restrictions on Defending Pieces:**
  - Blocking defense approach → all must be named
  - Reserve pieces cannot be named if approach is blocked
  - Max 1 detached unit from reserve
  - Commander cannot be sole defending piece
  - Cannot name pieces already used to defend another approach this turn
  - Cannot name pieces that retreated *after combat* this turn

### Step 3: Feint Option (Attacker)
- May declare **feint** (mandatory if attack by cavalry road move)
- If feint: attacker makes declaration but pieces stay in attack locale (or in place if started blocking approach)
- Defender may advance reserve pieces to block defense approach (at least 1)
- **Ends attack** - remaining steps ignored

### Step 4: Defense Declaration (Defender)
- Name **Defense Leading Units** (from defending pieces named in Step 2)
- **Wide Approach:** 0, 1, or 2 units
- **Narrow Approach:** 0 or 1 unit
- Reserve units can pair only if same type & same corps
- Strength-1 infantry/cavalry cannot lead
- Leading units turned **face-up**

### Step 5: Attack Declaration (Attacker)
- Name **attack command(s)**, **attack width** (wide/narrow for wide approach), **Attack Leading Units**
- If narrow attack vs 2 defense leads: attacker chooses which to attack (other turned face-down, can counter-attack)
- **Restrictions on Attack Leading Units:**
  - From attacking pieces
  - Wide: 0-2 units; Narrow: 0-1 unit
  - Cannot pair unless same type
  - Strength-1 infantry/cavalry cannot lead
  - **Corps Move attack cannot be led by Artillery**
  - Artillery cannot lead from reserve (must block attack approach)
  - **Artillery cannot lead two turns in a row unless hill→non-hill**

### Step 6: Initial Result (IR)
```
IR = (Attacker lead strength) 
   - (Defender lead strength) 
   - (1 if infantry attacking & defenders blocking)
   - (Terrain penalty if defenders blocking & matches attack type)
```
- **Artillery attack:** Skip defender lead subtraction; go to Step 8

**Initial Winner:**
- IR > 0 → Attacker wins
- IR < 0 → Defender wins
- IR = 0 → Defender wins if blocking; else side with more named units wins (French win ties)

### Step 7: Counter-Attack (Defender) — *Not vs Artillery*
- Name 1-2 counter-attacking units (from Step 2 defending pieces, not leading units)
- Two only if same type & same corps
- **Infantry:** Only if attacker won IR
- **Cavalry:** Always allowed
- **Artillery:** Never
- Each counter-attacking unit takes **immediate 1-strength loss**
- Units turned face-up

### Step 8: Final Result (FR)
```
FR = IR - (sum of counter-attacking unit strengths)
```
Same winner determination as IR

### Step 9: Attacker Losses (Not vs Artillery)
```
Losses = (# defender lead units) + (|FR| if FR < 0)
```
**Applied to:**
1. Leading units (evenly; defender chooses odd)
2. Other named attacking units (attacker chooses)
3. Excess ignored

### Step 10: Defender Losses
```
Losses = (# attacker lead cav/inf) + (FR if FR > 0) - (1 per defender lead artillery)
```
**Applied to:**
1. Leading infantry/cavalry (evenly; attacker chooses odd)
2. Counter-attacking units (evenly; attacker chooses odd)
3. Other named defending units (defender chooses)

### Step 11: Completion
| Outcome | Result |
|---------|--------|
| **Artillery-led** | All pieces stay in place; defender doesn't retreat; attacker may make 2nd attack (non-artillery) same approach same turn with different units |
| **Attacker wins (non-artillery)** | All defender pieces retreat; attacker moves all named pieces into defense reserve |
| **Defender wins** | Attacker's blocking pieces withdraw to attack reserve (detached, except 1 per corps); defender may advance reserve pieces to block approach |

**Post-Attack:**
- All face-up units turned face-down
- Attacking pieces that stayed in attack locale = expended, cannot move again this turn
- Cavalry by road may continue if defender retreated

---

## Retreats

### When
- Defender loses attack and doesn't retreat before combat
- All defender pieces in locale must retreat

### Retreat Losses (Defender only)
| Unit/Position | Loss |
|---------------|------|
| **Artillery** | Eliminated |
| **Non-defense approach (narrow)** | 1 str from inf/cav on that approach |
| **Non-defense approach (wide)** | 2 str from inf/cav on that approach |
| **Reserve (non-defending inf, narrow def approach)** | 1 str from group |
| **Reserve (non-defending inf, wide def approach)** | 2 str from group |
| **Cavalry in reserve** | No loss |

### Retreat Movement
- Into reserve of adjacent locale(s)
- **Cannot:** Into attack locale, across impassable, into enemy-occupied, exceed capacity
- **Eliminated:** If no legal retreat locale
- **Corps:** All but 1 unit detached (player chooses which stays)
- Units turned face-up during retreat, face-down at end

---

## Morale

- **Starting Morale:** Allied 12, French 12
- **Morale Loss:** 1 per strength point lost in attack + retreat
- **Demoralization:** Next morale loss when at 1 → game ends (decisive victory)
  - *Exception:* Final demoralizing loss cannot come from artillery attack
- **French Reinforcements:** +4 morale when first reinforcement enters
- **Night Round:** Regain half morale losses (round down), max +4

---

## Night Round
- **Between Dec 1-2** (Round 5.5)
- **No attacks allowed**
- **Morale recovery:** Half losses regained (round down), max +4

---

## Elite Units

### Heavy Cavalry (3-strength cav)
- **First commitment:** -2 morale (before normal losses)
- Cannot reduce morale below 1
- "Committed" = lead attack/defense/counter-attack, retreat, or take loss

### Guard Infantry (3-strength inf, Guard symbol)
- **First commitment:** -4 morale (before normal losses)
- Cannot reduce morale below 1
- Cannot pair with non-Guard infantry in attack lead or counter-attack
- **Guard Attack:** Declare in Step 1; reveal Guard unit; cannot be feint; Guard must lead; 1 subtracted from strength of defender's 1-2 step leading units
- **Guard Attack restrictions:** Cannot be declared if attack approach is obstructed
- **If Guard Attack is defeated:** Attacking army loses **3 additional morale points** and **cannot declare any more Guard Attacks** for the rest of the game
- If reduced to 2/1 step → becomes normal infantry, loses Guard abilities

---

## Winning the Game

### Decisive Victory
- Army demoralized (morale reaches 0) → immediate end

### Marginal Victory (after Round 10)
**Objective Control Requirements:**
1. Occupied by corps with ≥1 infantry/artillery
2. Road path to main [red] reinforcement entry locale (not enemy-occupied)

**Without French Reinforcements:**
- **Allied wins:** Controls ≥1 blue star AND French control 0 green/red/black
- **French wins:** Otherwise

**With French Reinforcements:**
- **French wins:** Allies control 0 blue stars AND French control ≥1 green, ≥1 red, ≥1 black
- **Allied wins:** Otherwise

---

## Optional Rules

### Game Balance
- **Morale Auction:** During setup step 2; bid morale penalty for side choice
- **Mutual Agreement:** Reduce initial morale by agreed amount

### The Santon (French Fixed Battery)
- Sets up in **reserve** on Santon Hill (setup step 9)
- Can lead attack/defense **from reserve** across any of the 3 approaches
- **Approach penalties apply** to attacks into the locale even when defending pieces are in reserve
- Other than the French fixed battery, artillery units occupying the Santon locale cannot lead an attack or defense

---

## Team Play (2-4 per side)

### Setup
1. **Conference** (private): Agree on rank order (CinC = most senior), plans, corps assignments
2. Reveal rank order & corps assignments to opponent
3. **1 Dec Scenario:** Second conference before Night round (can change assignments)

### During Play
- **Order Passing:** CinC writes one order/player/turn (attack/defend + terrain nouns)
- Orders read at start of **next** team turn
- Not required to obey; cannot encode secret messages
- **Turn Order:** Seniority (most senior first)
- **Command Limits:** Shared by team (senior uses first)
- **Corps Commands:** Only for own corps
- **Independent Commands:** Only if player has closest corps commander to unit
- **Detachments:** Team limit (senior uses first)

### Attack Control
- Defender retreat decision: Player with nearest corps commander (senior wins tie)
- After defense declared: Control passes to senior player with corps commander among defending pieces
- Corps from different players cannot combine attacks

---

## Quick Reference Summary

### Command Limits per Turn
| | Allied | French |
|---|--------|--------|
| Corps Commands | 5 | Unlimited (1 per commander) |
| Independent Commands | 3 | 4 |
| Detachments (game) | 3* | 5* |

*Per-game detachment limits from original rules; PDF only specifies French may detach up to 6 at setup. Team Play: shared team limit (senior uses first).

### Approach Capacity
| Type | Capacity (per side) | Notes |
|------|---------------------|-------|
| Wide | 3 | PDF: "as wide as two pieces"; QR play aid: 3 |
| Narrow | 1 | |

### Road Movement Distance
| Road Type | Max Locales |
|-----------|-------------|
| Main Road | 3 |
| Local Road | 2 |
| Mixed | 2 |

### Attack Leading Unit Limits
| Approach | Attack Width | Max Lead Units |
|----------|--------------|----------------|
| Narrow | Narrow | 1 |
| Wide | Narrow | 1 |
| Wide | Wide | 2 |

### Defense Leading Unit Limits
| Approach | Max Lead Units |
|----------|----------------|
| Narrow | 1 |
| Wide | 2 |

### Morale Penalties (First Commitment)
| Unit | Penalty |
|------|---------|
| Heavy Cavalry | -2 (min morale 1) |
| Guard Infantry | -4 (min morale 1) |
| French Reinforcements Enter | +4 |

### Retreat Losses
| Situation | Loss |
|-----------|------|
| Artillery | Eliminated |
| Non-defense approach (narrow) | 1 str (inf/cav) |
| Non-defense approach (wide) | 2 str (inf/cav) |
| Reserve non-defending inf (narrow def) | 1 str (group) |
| Reserve non-defending inf (wide def) | 2 str (group) |
| Cavalry in reserve | None |

### Marginal Victory Conditions
| French Reinforcements | Allied Wins If | French Wins If |
|----------------------|----------------|----------------|
| **No** | ≥1 blue star AND French 0 green/red/black | Otherwise |
| **Yes** | Otherwise | 0 blue stars AND ≥1 green AND ≥1 red AND ≥1 black |

---

## File Locations

| File | Path |
|------|------|
| **This Rules File** | `/NTR/RULES.md` |
| **Annotated Rules PDF** | `/NTR/NT_Annotated_Rules_v1.4.pdf` |
| **Quick Reference 1** | `/NTR/QuickReferencepage1.jpg` |
| **Quick Reference 2** | `/NTR/QuickReferencepage2.jpg` |
| **Quick Reference 3** | `/NTR/QuickReferencepage3.jpg` |
| **Scenario Config** | `/NTR/ntr_engine/scenarios.py` |
| **Map Topology** | `/NTR/ntr_engine/map_topology.py` |
| **Game Constants** | `/NTR/NTRconstants.py` |

---

## Quick Reference Images

The three quick reference JPG files contain visual summaries:
- **Page 1:** Command limits, movement, approach types, unit types
- **Page 2:** Attack procedure flowchart, combat calculations
- **Page 3:** Retreat rules, morale, victory conditions, optional rules

Refer to these images for quick visual lookup during play.

---

*Last updated: 2026-10-27 — Audited against NT_Annotated_Rules_v1.4.pdf (30 pages) + QuickReferencepage1-3.jpg via Tesseract OCR. Key fixes: French command limits (unlimited corps/4 ind), French corps list (6 on-map + 2 reinforcements), Guard Attack defeat penalty (-3 morale + no more Guard Attacks), combined attacks, Detach Move no road, Attach not a move, French reinforcement double move, Santon fixed battery details.*
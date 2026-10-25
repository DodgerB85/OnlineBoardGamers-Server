# Bus — Rules

> Text extracted from `BUS/static/BUS/Bus_Rules.pdf` (2 PDF pages) on 2026-10-24.
> Component photographs, diagrams and credits are omitted; consult the PDF for those.
> Page markers refer to PDF pages, not printed page numbers.

<!-- PDF page 1 -->

## Introduction

In a rapidly expanding city, it’s crucial for public transit to keep up with growth, lest the city become choked with traffic.

Each of you has been put in charge of a bus line. Extend your bus line, add more buses, and get passengers where they need to go at that time of day — it’s the only way to earn points! As the city sprawls, new buildings are erected, and that means more destinations for more passengers. You may want to spend some of your finite supply of actions to choose which buildings appear, and where they go, so passengers need to use your line to reach their next destination….

## Assembly

Before your first game, attach the clock hand to the clock face on the board using the fastener.

## Setting Up

Place the gameboard in the middle of the table. Each player chooses a color and takes the Score disc, 5 buses, 20 Action markers, and 25 Bus Line markers of that color. Place the 5 Time stones on their spaces on the time-control device attached to the clock (3-player game: Use only 4 Time stones; it doesn’t matter which space you leave empty). Point the clock hand at the house. Place 4 passengers around Central Park: 1 passenger on each roundabout.

Each player: Place your Score disc on space 0 of the Score track on the left side of the gameboard. Place 1 of your buses on 1 of your spaces in the Buses area on the right side of the gameboard.

The last person to ride a bus takes the Start bus and will go first (or choose randomly).

Turn order is clockwise, starting with this player.

## First Buildings

One time around in turn order, each player chooses 2 unoccupied, lowest-number construction sites (the lowest number is 1 at this stage), and places a building on each — each building can be any type (house, office or pub).

## First Bus Lines

One time around in turn order, each player places one of their Bus Line markers on any street — even if another Bus Line marker is already on it.

Then, one time around in reverse turn order, each player places a second Bus Line marker continuing from one of the ends of their previous marker. You must place this second marker in an unoccupied street* if you can; otherwise, it doesn’t matter how many other players’ bus lines are on the chosen street.

*    Exception: If your bus line ends at the same intersection as another player’s bus line, but coming from a different direction, you may continue your bus line alongside theirs, rather than onto an unoccupied street.

## Play

Each round of the game comprises two phases: Select Actions, then Resolve Actions.

### Phase 1: Select Actions

In turn order, each player selects an action by placing one of their Action markers on a space along the right side of the gameboard (the actions are explained in Phase 2: Resolve Actions). The actions New Bus, Stop Time, and Starting Player each have only 1 space. The other actions have spaces labeled A–F, and we’ll call these actions multi-use actions; when you select a multi-use action, place your Action marker on the empty space earliest in the alphabet (e.g. A for the first player to choose it, B for the second, and so on).

The board layout and resolution order are easiest to read from this table (UI names are used):

| Action | Spaces left to right | Resolution | Action power |
| --- | --- | --- | --- |
| Line Expansion | F E D C B A | left to right (F first, A last) | A = M, B = M−1, C = M−2, ... |
| New Bus | single space | after Line Expansion | add 1 bus |
| Passengers | A B C D E F | left to right (A first) | A = M, B = M−1, C = M−2, ... |
| New Building | F E D C B A | left to right (F first, A last) | A = M, B = M−1, C = M−2, ... |
| Stop Time | single space | after New Building | stop time or advance the clock |
| Vrrooomm! | A B C D E F | left to right (A first) | up to your number of buses |
| Starting Player | single space | last | take the Start bus |

A always has the highest action power, but for Line Expansion and New Building it resolves last. In a 5-player game, add 1 to the Line Expansion action power only, and apply that +1 **before** checking whether the power is ≤ 0.

Repeat this process so everyone places a second Action marker (you can even choose the same action again).

After these first two mandatory Action markers, continue in turn order, either dropping out of action selection, or placing another Action marker. You are allowed to place as many Action markers as you like during a round, but placed Action markers are spent, never to be recovered, and when you have no more Action markers, you will take no more actions for the rest of the game!

Once everyone has dropped out of action selection, continue to the next phase.

### Phase 2: Resolve Actions

Resolve the actions from top to bottom on the gameboard, starting with Line Expansion and ending with Starting Player.

For multi-use actions, resolve them left to right, despite alphabetical order. This means that for Line Expansion and New Building, the last person to select it will resolve it first; for Passengers and Vrrooomm!, the first to select it will resolve it first.

When it is time for one of your Action markers to resolve its action, you must resolve it as fully as possible; you cannot opt to do fewer actions.

Some multi-use actions have dwindling action power, which you can tell by the negative numbers depicted beneath most of its spaces.

This means that the Action marker on A lets its owner perform the action M times; B, M − 1 times; C, M − 2, etc. If your action power is less than or equal to 0, you won’t perform the action at all, so pay attention!

M is the bus maximum, defined as the number of buses that the person with the most has in the Buses area. In other words, the maximum number of buses in a column there. At the beginning of the game, this will be 1, but by the end, it could be as many as 5. See example under Action: Line Expansion.

### Action: Line Expansion

You can only pick up passengers on your bus line, and you can only deliver them to buildings on your bus line. Inconveniently, City Council demands as little bus line overlap as possible, in an attempt to serve everyone, everywhere in the city.

Line Expansion is an action with dwindling action power. A is on the right, so the first to resolve the action gets to do it the least.

Example: This action has 4 Action markers placed, which means spaces A–D are occupied by Green, Purple, Blue, Purple, respectively. If Purple has 2 buses; Blue, 3; and Green, 1; then M = 3. So, because Action markers resolve left to right, Purple, who is on space D, gets to expand their bus line first, but 3 − 3 = 0; in their excitement to go first, Purple didn’t notice that they weren’t going to get to place any Bus Line markers! Blue, on C, gets to place 3 − 2 = 1 Bus Line marker. Purple’s other marker (on B) gets to extend the purple line 3 − 1 = 2 times, and Green’s (on A) gets to extend the green line 3 times.

<!-- PDF page 2 -->

Each time you resolve an Action marker here, you must extend your bus line a number of streets equal to its action power (5-player game: action power + 1, but only for Line Expansion). The rules you respected in First Bus Lines still apply, but there are two more, as well. So you have them all in one place, here they are:

1. The line must be set up so a bus could travel from one end of the line to the other by taking each street on the line exactly once.

Specifically:

a. Your bus line must always be a non-branching line of Bus Line markers; however, it can loop to cross itself.

b. Your bus line cannot overlap itself; that is to say that you can’t have 2 of your own Bus Line markers on the same street.

2. If your bus line ever forms a loop, both ends still exist. Place a spent Action marker on the Bus Line marker end that touches another part of your line (if that’s both ends, mark both). Once that end has been extended to an unambiguous location, remove the Action marker from it (return it to the box).

3. You must place each Bus Line marker on an unoccupied street* if you can; otherwise, it doesn’t matter how many other players’ bus lines are on the chosen street.

*    Exception: If your bus line ends at the same intersection as another player’s bus line, but coming from a different direction, you may continue your bus line alongside theirs for 1 street, rather than onto an unoccupied street.

Example: Blue can extend their bus line from A or B. From A, the only option is in the direction of the blue arrow, because A is in the middle of the red line. From B, there are three options (blue arrows): down-right onto the empty street; up-right (using the exception) to overlap the abutting yellow line; up-left onto the empty street. This last option would create a partial-line loop, so Blue would place a spent Action marker on the new Bus Line marker, so everyone would be able to see where the end is (both for Blue extending it later, and for other players to use the exception to overlap that final segment).

Red can extend their bus line from C or D. From C, all streets are occupied (by the yellow line), so with no empty streets, either direction is permissible (red arrows). From D, there is only one option, because there is one unoccupied street (red arrow).

Example (partial-line loop): Continuing from the prior example, let’s say Blue extends from B up-left, creating a partial-line loop. Blue places a spent Action marker on the end of the bus line to make it clear to everyone where it is. The next time Blue extends their bus line, it can either be from A, same as before, or from E. From E, Blue’s only options are the 2 empty streets (blue arrows).

Example (full-line loop): In this example (left), Purple is extending their bus line on the shaded street, forming a full-line loop. Purple can choose whether the line was extended from A to B, or from B to A.

If Purple says it’s from A to B (center), they place a spent Action marker on each end of their bus line where it meets at B, so it’s clear where the ends are. The next time Purple extends their bus line, it will be from B onto one of the adjoining streets (purple arrows).

If Purple says it’s from B to A (right), they place a spent Action marker on each end of their bus line where it meets at A. The next time Purple extends their bus line, it will be from A onto one of the adjoining streets (purple arrows).

### Action: New Bus

The more buses you have, the more passengers you can transport!

When you resolve your Action marker here, you must add 1 of your buses to 1 of your empty spaces here. If you had (or were tied for) the most buses, your new bus increases the bus maximum (M) immediately, which will affect subsequent dwindling-action-power actions this round!

Online implementation: if all 5 of your buses are already in the Buses area, choosing this action is still legal as a block, but no bus is added. The history records that no bus was added.

### Action: Passengers

New passengers stream into the city by train.

The train stations bustle with passengers rushing home, or to work, or out for a drink.

Passengers is an action with dwindling action power. A is on the left, so the first to resolve the action gets to do it the most.

Each time you resolve an Action marker here, you must add a number of passengers equal to its action power (if the supply runs out, do not place any more). Each passenger must go on a train station of your choice (there are 2 on the map), and it doesn’t matter whether your bus line connects to the station(s).

### Action: New Building

This city is developing quickly. Houses, offices, and pubs seem to pop up constantly!

New Building is an action with dwindling action power. A is on the right, so the first to resolve the action gets to do it the least.

Each time you resolve an Action marker here, you must erect a number of buildings equal to its action power. Each building must go on a lowest-number unoccupied construction site (it doesn’t have to be on anyone’s bus line).

At the beginning of the game, this will be 1; however, once the 1s are full, you must build on 2, and so on.

If all construction sites are occupied, the game ends at the end of this round.

### Action: Stop Time

In this strange universe, someone with a scientific bent, but little regard for cosmic consequences has created a device that can stretch time. They’re thrilled to demonstrate it for anyone curious, even the local bus companies!

When you resolve your Action marker here, you choose whether to pause the cadence of house → office → pub → house…. If you pause time, take a Time stone from the clock; it will count as −1 point for you at the end of the game. If you took the final Time stone from the clock, the game ends immediately due to rupture of the space-time continuum.

Otherwise, advance the clock to the next building type clockwise: house → office → pub → house.

If nobody chose this action, the clock advances one step automatically at the end of the round.

Either way, passengers prepare to travel to their new destination (or same destination, if you paused time):

1. Move all passengers that are on Building discs to stand on/near the intersection there.

2. Each passenger standing at the same intersection as their destination (as indicated by the clock hand), steps right in if the building is empty: Stand the passenger on the unoccupied Building disc.

Only 1 passenger per building!

Passengers still outside buildings will need to catch a bus to get to their destination!

Online implementation details:
- Passengers on Building discs move out to their intersection at the end of the round (in the Starting Player phase), whether or not the Stop Time action was chosen.
- Passengers at an intersection with an empty matching building step in at the start of the Vrrooomm! phase.
- The −1 point for a Time stone is applied to the Score track immediately when the stone is taken. The displayed score therefore already includes all Time stone penalties (this differs from the printed rules, which deduct them only at the end).

### Action: Vrrooomm!

Run your buses along your bus line, transporting passengers where they need to go right now, and earning you points!

Each time you resolve an Action marker here, you must try to use each of your buses to transport 1 passenger to their destination (an empty building of the type indicated by the clock hand), and stand them on the unoccupied Building disc. For each passenger you transport, earn 1 point. You can transport a passenger if all of the following are true:

- The passenger is at an intersection, not already standing on a Building disc.

- The passenger is at an intersection on your bus line.

- An empty building of the specified type is on your bus line.

Only 1 passenger per bus!

In other words, you can transport a waiting passenger on your bus line to an empty building of the right type on your bus line.

Note: You do not actually move your bus pieces on the map. If it helps you to do so, you could, but put them back in the Buses area after your turn.

Example 1: The person who selected the Stop Time action allows time to march forward, and now passengers want to go to work (left). All passengers on Building discs step into the adjacent intersection. Then 2 of the passengers at A simply step onto the office beside them.

The passenger at B enters 1 of the offices at B.

The passenger at E enters the office at E, having freshly left home there. The 3rd passenger at A and the passengers at D, F, and G will need to ride to work, so they move into their respective intersections to try to catch a bus.

Example 2: Now it’s time to resolve the Vrrooomm! action (right). Yellow is first, and has 3 buses; unfortunately, the passenger at D is the only one who needs a ride on the yellow line. Yellow moves the passenger from D to occupy the office at C. +1 point for Yellow.

Green has 2 buses, and there are multiple passengers (1 at A, 4 at the train station) eager to ride the green line. Unfortunately, the only available office on the green line is at B, so Green chooses to move a passenger from the train station to the office at B. +1 point.

Blue has 3 passengers (1 at F, 2 at G) awaiting rides on the blue line to 3 offices on the blue line, but blue only has 2 buses. Blue moves the passenger from F to an office, and 1 of the passengers at G to an office. +2 points.

### Action: Starting Player

Spending an action now grants you first choice next round!

When you resolve your Action marker here, take the Start bus; you will be the starting player next round.

If nobody chose this action, pass the Start bus clockwise.

Return all spent Action markers to the box.

If only 1 player still has Action markers at the end of the round, the game ends immediately.

## End of the Game

The game can end in 1 of 3 ways:

- If all construction sites are occupied by buildings, the game ends at the end of the round.

- If the clock has no more Time stones, the game ends immediately.

- If only 1 player has Action markers at the end of the round, the game ends immediately.

Each Time stone you have is −1 point, but don’t move down on the Score track. The player with the most points wins. If tied, the tied player with the most Time stones wins. If still tied, the tied player whose Score marker is lowest in its stack wins (they reached that score first).

Online implementation: the Score track is updated immediately when a Time stone is taken, so the online score is already net of Time stones. Final ranking is therefore: highest net score, then most Time stones, then first to reach that net score. The online game uses the same ranking for the winner, the game-over table, the score discs, the history entry and the saved final positions.

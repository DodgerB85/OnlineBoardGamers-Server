# Keyflower — Promo Tiles

> Rules compiled from the promo tile definitions used by the KFW implementation (`KFW/vueKFW/src/js/KFWreference.js`) and the tile images in `KFW/static/KFW/images/tiles/`.
> Promo tiles are optional. Add them to the matching season's tiles before setup.
> "Upgraded" means the tile has been flipped; the upgrade cost is listed with each upgradable tile.

## Spring

### Storyteller

- Basic: Get either one worker or one skill tile.
- Upgraded: Get one worker and one skill tile.
- Upgrade cost: 1 stone + 1 iron.

## Summer

### Trader (Help page: "Jeweller")

- Basic: Exchange one skill tile for one green worker.
- Upgraded: Exchange one skill tile for two green workers; the upgraded tile is also worth 3 VP at the end of the game.
- Upgrade cost: 1 gold.
- Note: the in-game Help page labels this tile "Jeweller", but the tile image and implementation call it "Trader". The base game's Jeweller is a separate winter scoring tile.

### Sorcerer

- Basic: Use the action of any adjacent village tile in the owner's village.
- Upgraded: Use the action of any village tile in the owner's village; the upgraded tile is also worth 5 VP at the end of the game.
- Upgrade cost: 2 skill tiles.
- You cannot place workers on the Sorcerer while it is being bid for, because it is not adjacent to any other tile at that point.

### Developer

- Basic: Score 2 VP for each upgrade icon on adjacent tiles.
- Upgraded: Score 3 VP for each upgrade icon on adjacent tiles.
- Upgrade cost: 1 wood.

### Summer Boat 7 (7a / 7b)

The two sides are alternative boats; use the side chosen for the game.

- Boat 7a: When you obtain resources or animals from another player's village, or at the end of a season from a turn-order tile or a boat, you may place them on any tile in your village instead of just your home tile.
- Boat 7b: At the end of summer, autumn and winter, receive 1 iron, 1 stone and 1 wood onto your home tile from the general supply.

## Autumn

### Talton Lodge

- Basic: Score 1 VP for each active worker icon and waving worker icon on your other tiles.
- Upgraded: Score 2 VP for each such icon.
- Upgrade cost: 2 workers.

## Winter

### Emporium

- At game end, score 3 VP for each set of 1 green worker and 2 workers of any colour allocated to this tile.

### Monument

- At game end, score 4 VP for each set of 1 gold and 2 resources of any type allocated to this tile.

### Beekeeper

- At game end, score 2 VP for each adjacent tile.

### The Glade

- At game end, score 5 VP for each adjacent Summer tile.

### The Glade in Winter

- At game end, score 3 VP for each adjacent Winter tile.

### Keyside

- Before final scoring, gain 3 wood, 3 stone, 3 iron and 3 gold.

### Delivery Man

- Starting on the Delivery Man tile, travel as far as possible along the road without travelling along the same length of road twice. Crossing over a length of road already travelled is permitted.
- Score 1 VP for each different tile on which you have travelled.

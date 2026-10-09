import { describe, expect, it } from "vitest";
import { ActionType, Game, JavaRandom, defaultOptions } from "./ROWindex";
import { canPlaceBuilding } from "./ROWmap";

function players(n) {
    const colors = ["RED", "BLUE", "YELLOW", "GREEN"];
    return Array.from({ length: n }, (_, i) => ({ name: `Player ${i + 1}`, color: colors[i], type: "HUMAN" }));
}
function setup() {
    const game = Game.start(players(2), defaultOptions(), new JavaRandom(0));
    const ps = game.currentPlayerState();
    ps.buildings = ["1a", "4a", "9a"];
    return { game, ps, empty: { kind: "BUILDING", building: null } };
}
describe("canPlaceBuilding (view preview of Game.placeBuilding)", () => {
    it("allows a building whose craftsmen and dollars are available", () => {
        const { game, ps, empty } = setup();
        // "1a" needs 1 craftsman and 2$ per craftsman; start has 1 craftsman and 6$.
        expect(canPlaceBuilding(game, ps.player, empty, "1a", ActionType.PLACE_BUILDING)).toBe(true);
    });
    it("rejects a building needing more craftsmen than the player has", () => {
        const { game, ps, empty } = setup();
        expect(canPlaceBuilding(game, ps.player, empty, "9a", ActionType.PLACE_BUILDING)).toBe(false);
    });
    it("charges 2$ per craftsman, 1$ cheap, 0$ free", () => {
        const { game, ps, empty } = setup();
        ps.balance = 1;
        expect(canPlaceBuilding(game, ps.player, empty, "1a", ActionType.PLACE_BUILDING)).toBe(false);
        expect(canPlaceBuilding(game, ps.player, empty, "1a", ActionType.PLACE_CHEAP_BUILDING)).toBe(true);
        expect(canPlaceBuilding(game, ps.player, empty, "1a", ActionType.PLACE_BUILDING_FOR_FREE)).toBe(true);
    });
    it("only replaces an own building with one of strictly more craftsmen", () => {
        const { game, ps } = setup();
        const occupied = (player, name = "1a") => ({ kind: "BUILDING", building: { name, player } });
        expect(canPlaceBuilding(game, ps.player, occupied(ps.player), "4a", ActionType.PLACE_BUILDING)).toBe(true);
        expect(canPlaceBuilding(game, ps.player, occupied(ps.player), "1a", ActionType.PLACE_BUILDING)).toBe(false);
        expect(canPlaceBuilding(game, ps.player, occupied(null, "A"), "1a", ActionType.PLACE_BUILDING)).toBe(false);
        expect(canPlaceBuilding(game, ps.player, occupied("Someone Else"), "4a", ActionType.PLACE_BUILDING)).toBe(false);
    });
});

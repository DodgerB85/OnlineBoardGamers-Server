import { describe, expect, it } from "vitest";
import { ActionType, Game, JavaRandom, defaultOptions } from "./ROWindex";
import { armedTrailMove, canPlaceBuilding, trailMoveTargets, trailRoute } from "./ROWmap";

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

describe("trailRoute", () => {
    function bareTrail() {
        const game = Game.start(players(2), defaultOptions(), new JavaRandom(0));
        for (const loc of game.getTrail().locations.values()) {
            loc.building = null;
            loc.hazard = null;
            loc.teepee = null;
        }
        return game.getTrail();
    }
    it("lists the whole walk, counting empty spots that cost no step", () => {
        expect(trailRoute(bareTrail(), "E", ["G"])).toEqual(["E", "E-1", "E-2", "F", "F-1", "G"]);
    });
    it("takes the direct edge when there is one", () => {
        expect(trailRoute(bareTrail(), "E", ["ROCKFALL-1"])).toEqual(["E", "ROCKFALL-1"]);
    });
    it("fills the gap between every pair of steps", () => {
        expect(trailRoute(bareTrail(), "E", ["ROCKFALL-1", "F"])).toEqual(["E", "ROCKFALL-1", "ROCKFALL-2", "ROCKFALL-3", "ROCKFALL-4", "ROCKFALL-RISK-1", "ROCKFALL-RISK-2", "F"]);
    });
    it("returns null where the steps do not join up", () => {
        expect(trailRoute(bareTrail(), "G", ["E"])).toBeNull();
    });
});

describe("armedTrailMove / trailMoveTargets (building moves on the trail)", () => {
    function withBlankTrail() {
        const game = Game.start(players(2), defaultOptions(), new JavaRandom(0));
        for (const loc of game.getTrail().locations.values()) {
            loc.building = null;
            loc.hazard = null;
            loc.teepee = null;
        }
        return game;
    }
    it("reports each building move's range, and leaves plain MOVE to the step limit", () => {
        const game = withBlankTrail();
        expect(game.moveStepLimit(ActionType.MOVE_1_FORWARD)).toBe(1);
        expect(game.moveStepLimit(ActionType.MOVE_5_FORWARD)).toBe(5);
        expect(game.moveStepLimit(ActionType.MOVE_3_FORWARD_WITHOUT_FEES)).toBe(3);
        expect(game.moveStepLimit(ActionType.MOVE)).toBeNull();
    });
    it("only offers a live armed move, never the mandatory MOVE", () => {
        const game = withBlankTrail();
        const live = [ActionType.MOVE_1_FORWARD];
        expect(armedTrailMove(game, live, ActionType.MOVE_1_FORWARD)).toEqual({ type: ActionType.MOVE_1_FORWARD, limit: 1 });
        expect(armedTrailMove(game, live, ActionType.MOVE_2_FORWARD)).toBeNull();
        expect(armedTrailMove(game, live, ActionType.MOVE)).toBeNull();
        expect(armedTrailMove(game, live, ActionType.BUY_CATTLE)).toBeNull();
        expect(armedTrailMove(game, live, null)).toBeNull();
    });
it("reaches only one step ahead for MOVE_1_FORWARD", () => {
        const game = withBlankTrail();
        const trail = game.getTrail();
        // Occupied, so it costs a step: F -> F-1/F-2 -> G -> G-1/G-2 -> KANSAS_CITY.
        trail.getLocation("G").building = { name: "1a", player: null };
        trail.movePlayer(game.currentPlayer, "F");
        // F-1 and F-2 are separate empty routes to the same occupied spot.
        const steps = trailMoveTargets(game, ActionType.MOVE_1_FORWARD).map((m) => m.steps);
        expect(steps.length).toBeGreaterThan(0);
        expect(steps.every((s) => s.length === 1 && s[0] === "G")).toBe(true);
    });
    it("reaches further for MOVE_3_FORWARD", () => {
        const game = withBlankTrail();
        const trail = game.getTrail();
        trail.getLocation("G").building = { name: "1a", player: null };
        trail.movePlayer(game.currentPlayer, "F");
        const steps = trailMoveTargets(game, ActionType.MOVE_3_FORWARD).map((m) => m.steps);
        expect(steps).toContainEqual(["G"]);
        expect(steps).toContainEqual(["G", "KANSAS_CITY"]);
    });
});

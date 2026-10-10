import { describe, expect, it } from "vitest";
import { ActionStack, ActionType, CattleType, Edition, Game, Hand, JavaRandom, OBJECTIVE_CARD_TYPES, PossibleAction, Worker, defaultOptions } from "./ROWindex";
import { playerBuildingInfo } from "./ROWdata";
function players(n) {
    const colors = ["RED", "BLUE", "YELLOW", "GREEN"];
    return Array.from({ length: n }, (_, i) => ({ name: `Player ${i + 1}`, color: colors[i], type: "HUMAN" }));
}
function freshGame(n = 2, seed = 1, extra = {}) {
    return Game.start(players(n), defaultOptions(Edition.FIRST, { buildings: "BEGINNER", ...extra }), new JavaRandom(seed));
}
describe("Card lookup matches by type only (Java findCattleCardInHand)", () => {
    it("discards a cattle card described by type alone", () => {
        const game = freshGame();
        const ps = game.currentPlayerState();
        ps.hand = [{ type: CattleType.DUTCH_BELT, points: 0, value: 2 }, { type: CattleType.JERSEY, points: 0, value: 1 }];
        ps.discardPile = [];
        game.state.actionStack = ActionStack.initial([PossibleAction.mandatory(ActionType.DISCARD_CARD)]);
        game.perform(game.currentPlayer, { type: ActionType.DISCARD_CARD, card: { type: CattleType.DUTCH_BELT } }, new JavaRandom(2));
        expect(ps.discardPile.some((c) => c.type === CattleType.DUTCH_BELT)).toBe(true);
        expect(ps.hand.some((c) => c.type === CattleType.DUTCH_BELT)).toBe(false);
    });
});
describe("REMOVE_CARD is hand-only (PlayerState.removeCard)", () => {
    it("refuses a card that is only in the discard pile", () => {
        const game = freshGame(2, 3);
        const ps = game.currentPlayerState();
        ps.hand = [{ type: CattleType.JERSEY, points: 0, value: 1 }];
        ps.discardPile = [{ type: CattleType.DUTCH_BELT, points: 0, value: 2 }];
        game.state.actionStack = ActionStack.initial([PossibleAction.mandatory(ActionType.REMOVE_CARD)]);
        expect(() => game.perform(game.currentPlayer, { type: ActionType.REMOVE_CARD, card: { type: CattleType.DUTCH_BELT } }, new JavaRandom(4))).toThrowError(/CARD_NOT_IN_HAND/);
    });
});
describe("Worker limit (PlayerState.addWorker)", () => {
    it("throws at six workers of a type", () => {
        const game = freshGame();
        const ps = game.currentPlayerState();
        ps.workers[Worker.COWBOY] = 6;
        expect(() => ps.gainWorker(Worker.COWBOY)).toThrowError(/WORKERS_EXCEED_LIMIT/);
    });
});
describe("One shared randomized building set (GWT.java:120)", () => {
    it("gives every human the same sides", () => {
        const game = Game.start(players(3), defaultOptions(Edition.FIRST, { buildings: "RANDOMIZED" }), new JavaRandom(6));
        const sets = game.state.playerOrder.map((n) => [...game.playerState(n).buildings].sort().join(","));
        expect(new Set(sets).size).toBe(1);
    });
});
describe("Second-edition building stats (PlayerBuilding 2e subclasses)", () => {
    it("uses the edition-specific hand / craftsmen / points", () => {
        expect(playerBuildingInfo("11a", Edition.FIRST).points).toBe(25);
        expect(playerBuildingInfo("11a", Edition.SECOND).points).toBe(20);
        expect(playerBuildingInfo("13a", Edition.FIRST).hand).toBe(Hand.GREEN);
        expect(playerBuildingInfo("13a", Edition.SECOND).hand).toBe(Hand.NONE);
        expect(playerBuildingInfo("13b", Edition.FIRST).craftsmen).toBe(2);
        expect(playerBuildingInfo("13b", Edition.SECOND).craftsmen).toBe(3);
    });
});
describe("UPGRADE_ANY_STATION_BEHIND_ENGINE walks the graph (Space.isAfter)", () => {
    it("agrees with the previous-space graph, not a numeric compare", () => {
        const game = freshGame();
        const rt = game.getRailroadTrack();
        expect(rt.isAfter("16", "4.5")).toBe(true);
        expect(rt.isAfter("4.5", "16")).toBe(false);
        expect(rt.isAfter("39", "33.5")).toBe(true);
        expect(rt.isAfter("4.5", "4.5")).toBe(false);
    });
});
describe("Optional objectives score from every pile (PlayerState.getOptionalObjectives)", () => {
    it("scores an objective card sitting in the discard pile", () => {
        const game = freshGame();
        const ps = game.currentPlayerState();
        ps.objectives = [];
        ps.hand = [];
        ps.drawStack = [];
        ps.discardPile = [OBJECTIVE_CARD_TYPES.AUX_SF]; // 1 San Francisco delivery, 5 points
        expect(game.scoreDetails(ps.player).OBJECTIVE_CARDS).toBe(0);
        game.getRailroadTrack().cities["SAN_FRANCISCO"] = [ps.player];
        expect(game.scoreDetails(ps.player).OBJECTIVE_CARDS).toBe(5);
    });
});
describe("forceEndTurn / leave (GWT.forceEndTurn / GWT.leave)", () => {
    it("forceEndTurn ends a turn that has nothing mandatory", () => {
        const game = freshGame(2, 31);
        const player = game.currentPlayer;
        game.state.actionStack = ActionStack.initial([]);
        game.forceEndTurn(player, new JavaRandom(32));
        expect(game.currentPlayer).not.toBe(player);
    });
    it("forceEndTurn plays through a mandatory action before ending", () => {
        const game = freshGame(2, 33);
        const player = game.currentPlayer;
        expect(() => game.forceEndTurn(player, new JavaRandom(34))).not.toThrow();
        expect(game.currentPlayer).not.toBe(player);
    });
    it("leave drops a player and ends the game when one remains", () => {
        const game = freshGame(2, 35);
        const leaver = game.state.playerOrder[1];
        game.leave(leaver, new JavaRandom(36));
        expect(game.state.playerOrder).not.toContain(leaver);
        expect(game.isEnded()).toBe(true);
    });
    it("leave by the current player advances the turn", () => {
        const game = freshGame(3, 37);
        const current = game.currentPlayer;
        game.leave(current, new JavaRandom(38));
        expect(game.state.playerOrder).not.toContain(current);
        expect(game.currentPlayer).not.toBe(current);
    });
});

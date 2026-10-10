import { describe, expect, it } from "vitest";
import { ActionStack, ActionType, CattleType, City, DiscColor, Edition, Game, JavaRandom, PossibleAction, UNLOCKABLE_INFO, Unlockable, defaultOptions } from "./ROWindex";
function players(n) {
    const colors = ["RED", "BLUE", "YELLOW", "GREEN"];
    return Array.from({ length: n }, (_, i) => ({ name: `Player ${i + 1}`, color: colors[i], type: "HUMAN" }));
}
/** Pick an unlockable disc the given unlock action is allowed to clear. */
function pickUnlock(ps, type, rttn) {
    const color = type === ActionType.UNLOCK_WHITE ? DiscColor.WHITE : null;
    return Object.values(Unlockable).find((u) => ps.canUnlock(u, rttn) && (!color || UNLOCKABLE_INFO[u].discColor === color));
}
/** Resolve the mandatory disc-removal chain that follows a city delivery. */
function clearDiscChain(game, player) {
    const ps = game.currentPlayerState();
    for (let i = 0; i < 5; i++) {
        const acts = game.possibleActions();
        const type = acts.has(ActionType.UNLOCK_WHITE) ? ActionType.UNLOCK_WHITE
            : acts.has(ActionType.UNLOCK_BLACK_OR_WHITE) ? ActionType.UNLOCK_BLACK_OR_WHITE : null;
        if (!type)
            break;
        const unlock = pickUnlock(ps, type, game.isRailsToTheNorth());
        if (!unlock)
            break;
        game.perform(player, { type, unlock }, new JavaRandom(100 + i));
    }
}
describe("UPGRADE_SIMMENTAL (second edition)", () => {
    it("upgrades a Simmental card in hand one step", () => {
        const game = Game.start(players(2), defaultOptions(Edition.SECOND, { simmental: true }), new JavaRandom(3));
        const player = game.currentPlayer;
        const ps = game.currentPlayerState();
        const simmental = { type: CattleType.SIMMENTAL, points: 3, value: 2 };
        const jersey = { type: CattleType.JERSEY, points: 0, value: 1 };
        ps.hand = [simmental, jersey];
        ps.discardPile = [];
        game.state.actionStack = ActionStack.initial([PossibleAction.repeat(0, 1, ActionType.UPGRADE_SIMMENTAL)]);
        expect(game.possibleActions().has(ActionType.UPGRADE_SIMMENTAL)).toBe(true);
        game.perform(player, { type: ActionType.UPGRADE_SIMMENTAL, card: simmental }, new JavaRandom(4));
        // The upgraded card is gained to the discard pile (Java: PlayerState.gainCard), and the
        // rest of the hand is discarded once no up-gradable Simmental is left in hand.
        expect(ps.discardPile.some((c) => c.type === CattleType.SIMMENTAL && c.value === 4 && c.points === 4)).toBe(true);
        expect(ps.hand.some((c) => c.type === CattleType.SIMMENTAL && c.value === 2)).toBe(false);
    });
});
describe("Rails to the North: New York City bonus station master", () => {
    it("delivers to NYC without crashing and offers a bonus station master tile", () => {
        const game = Game.start(players(2), defaultOptions(Edition.SECOND, { railsToTheNorth: true }), new JavaRandom(9));
        const player = game.currentPlayer;
        const ps = game.currentPlayerState();
        ps.hand = [
            { type: CattleType.TEXAS_LONGHORN, points: 5, value: 5 },
            { type: CattleType.WEST_HIGHLAND, points: 3, value: 4 },
            { type: CattleType.HOLSTEIN, points: 1, value: 3 },
            { type: CattleType.BROWN_SWISS, points: 2, value: 3 },
            { type: CattleType.AYRSHIRE, points: 3, value: 3 },
            { type: CattleType.GUERNSEY, points: 0, value: 2 },
        ];
        expect(ps.handValue()).toBeGreaterThanOrEqual(18); // NYC's city value
        const pile = game.getRailroadTrack().stationMasters;
        expect(pile.length).toBeGreaterThan(0);
        game.getTrail().movePlayer(player, "KANSAS_CITY");
        game.state.actionStack = ActionStack.initial([PossibleAction.mandatory(ActionType.DELIVER_TO_CITY)]);
        expect(() => game.perform(player, { type: ActionType.DELIVER_TO_CITY, city: City.NEW_YORK_CITY, certificates: 0 }, new JavaRandom(10))).not.toThrow();
        expect(game.getRailroadTrack().cities[City.NEW_YORK_CITY]).toContain(player);
        clearDiscChain(game, player);
        expect(game.possibleActions().has(ActionType.TAKE_BONUS_STATION_MASTER)).toBe(true);
        const tile = game.getRailroadTrack().stationMasters[0];
        game.perform(player, { type: ActionType.TAKE_BONUS_STATION_MASTER, stationMaster: tile }, new JavaRandom(11));
        expect(ps.stationMasters).toContain(tile);
        expect(game.getRailroadTrack().stationMasters).not.toContain(tile);
    });
});
describe("Player order (OBG server is master)", () => {
    it("keeps the incoming seat order when playerOrder is not RANDOMIZED", () => {
        const roster = players(4);
        const game = Game.start(roster, { ...defaultOptions(Edition.FIRST), buildings: "BEGINNER", playerOrder: "FIXED" }, new JavaRandom(1));
        const names = roster.map((p) => p.name);
        expect(game.state.playerOrder).toEqual(names);
        expect(game.state.players.map((p) => p.name)).toEqual(names);
        expect(game.state.currentPlayer).toBe(names[0]);
    });
    it("still shuffles for the reference RANDOMIZED option", () => {
        const roster = players(4);
        const game = Game.start(roster, { ...defaultOptions(Edition.FIRST), buildings: "BEGINNER", playerOrder: "RANDOMIZED" }, new JavaRandom(1));
        expect(game.state.playerOrder.length).toBe(4);
        expect([...game.state.playerOrder].sort()).toEqual([...roster.map((p) => p.name)].sort());
    });
});

describe("Rails to the North station master scoring + activation", () => {
    function rttnGame() {
        return Game.start(players(2), defaultOptions(Edition.SECOND, { railsToTheNorth: true }), new JavaRandom(21));
    }
    it("scores 5 VP per pair of exchange tokens", () => {
        const game = rttnGame();
        const ps = game.currentPlayerState();
        ps.stationMasters = ["PLACE_BRANCHLET_POINTS_PER_2_EXCHANGE_TOKENS"];
        ps.exchangeTokens = 5;
        expect(game.scoreDetails(ps.player).STATION_MASTERS).toBe(10);
    });
    it("scores 2 VP per distinct branchlet area", () => {
        const game = rttnGame();
        const ps = game.currentPlayerState();
        ps.stationMasters = ["GAIN_EXCHANGE_TOKEN_POINTS_PER_AREA"];
        // RTTN_TRACK towns 44 (GREEN) and 48 (BLUE) put the player in two distinct areas.
        game.getRailroadTrack().branchlets = { "44": [ps.player], "48": [ps.player] };
        expect(game.scoreDetails(ps.player).STATION_MASTERS).toBe(4);
    });
    it("grants the matching immediate action when appointed / taken", () => {
        const game = rttnGame();
        expect(game.stationMasterActivate("GAIN_EXCHANGE_TOKEN_POINTS_PER_AREA")).toHaveLength(1);
        expect(game.stationMasterActivate("PLACE_BRANCHLET_POINTS_PER_2_EXCHANGE_TOKENS")).toHaveLength(1);
        expect(game.stationMasterActivate("PERM_CERT_POINTS_FOR_EACH_2_CERTS")).toHaveLength(0);
    });
});

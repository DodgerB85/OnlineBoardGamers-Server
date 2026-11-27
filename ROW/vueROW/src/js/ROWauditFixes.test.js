import { describe, expect, it } from "vitest";
import {
	ActionStack,
	ActionType,
	CattleType,
	City,
	Edition,
	Game,
	JavaRandom,
	OBJECTIVE_CARD_TYPES,
	PossibleAction,
	Teepee,
	UNLOCKABLE_INFO,
	Unlockable,
	Worker,
	defaultOptions,
	playerBuildingAction,
} from "./ROWindex";
import * as map from "./ROWmap";
function players(n) {
	const colors = ["RED", "BLUE", "YELLOW", "GREEN"];
	return Array.from({ length: n }, (_, i) => ({ name: `Player ${i + 1}`, color: colors[i], type: "HUMAN" }));
}
function freshGame(n = 2, seed = 1) {
	return Game.start(players(n), defaultOptions(Edition.FIRST, { buildings: "BEGINNER" }), new JavaRandom(seed));
}
function arm(game, type) {
	game.state.actionStack = ActionStack.initial([PossibleAction.mandatory(type)]);
}
function run(game, action) {
	return game.perform(game.currentPlayer, action, new JavaRandom(99));
}
const cattle = (type, value) => ({ type, points: 0, value });

describe("Audit fixes: objective scoring", () => {
	it("scores every physical copy of an objective card", () => {
		const game = freshGame();
		const player = game.currentPlayer;
		const ps = game.currentPlayerState();
		ps.objectives = [];
		ps.hand = [OBJECTIVE_CARD_TYPES.AUX_SF, OBJECTIVE_CARD_TYPES.AUX_SF];
		ps.discardPile = [];
		ps.drawStack = [];
		game.getRailroadTrack().cities[City.SAN_FRANCISCO] = [player, player];

		const result = game.scoreObjectives(ps);
		expect(result.total).toBe(10);
		expect(result.committedCount).toBe(2);

		ps.stationMasters = ["REMOVE_HAZARD_OR_TEEPEE_POINTS_FOR_EACH_2_OBJECTIVE_CARDS"];
		expect(game.scoreDetails(player).STATION_MASTERS).toBe(3);
	});
});

describe("Audit fixes: remove-card auxiliary", () => {
	it("keeps the remove-card auxiliary clickable but fails before moving the engine", () => {
		const game = freshGame();
		const player = game.currentPlayer;
		const ps = game.currentPlayerState();
		ps.unlocked[Unlockable.AUX_MOVE_ENGINE_BACKWARDS_TO_REMOVE_CARD] = 1;
		ps.hand = [];
		game.getRailroadTrack().players[player] = "10";
		arm(game, ActionType.SINGLE_AUXILIARY_ACTION);
		run(game, { type: ActionType.SINGLE_AUXILIARY_ACTION });
		const to = [...game.getRailroadTrack().reachableSpacesBackwards("10", 1, 1)][0];

		expect(() => run(game, { type: ActionType.MOVE_ENGINE_1_BACKWARDS_TO_REMOVE_1_CARD, to })).toThrow(/CARD_NOT_IN_HAND/);
		expect(game.getRailroadTrack().currentSpace(player)).toBe("10");
	});

	it("tells the UI how many cards the remove-card auxiliary needs", () => {
		expect(map.auxiliaryCardsToRemove(ActionType.MOVE_ENGINE_1_BACKWARDS_TO_REMOVE_1_CARD)).toBe(1);
		expect(map.auxiliaryCardsToRemove(ActionType.MOVE_ENGINE_2_BACKWARDS_TO_REMOVE_2_CARDS)).toBe(2);
		expect(map.auxiliaryCardsToRemove(ActionType.MOVE_ENGINE_1_BACKWARDS_TO_REMOVE_1_CARD_AND_GAIN_1_DOLLAR)).toBe(0);
	});

	it("rejects the double remove-card auxiliary when only one card is in hand", () => {
		const game = freshGame();
		const player = game.currentPlayer;
		const ps = game.currentPlayerState();
		ps.unlocked[Unlockable.AUX_MOVE_ENGINE_BACKWARDS_TO_REMOVE_CARD] = 2;
		ps.hand = [cattle(CattleType.JERSEY, 1)];
		game.getRailroadTrack().players[player] = "10";
		arm(game, ActionType.SINGLE_OR_DOUBLE_AUXILIARY_ACTION);
		run(game, { type: ActionType.SINGLE_OR_DOUBLE_AUXILIARY_ACTION });
		const to = [...game.getRailroadTrack().reachableSpacesBackwards("10", 2, 2)][0];
		expect(() => run(game, { type: ActionType.MOVE_ENGINE_2_BACKWARDS_TO_REMOVE_2_CARDS, to })).toThrow(/CARD_NOT_IN_HAND/);
		expect(game.getRailroadTrack().currentSpace(player)).toBe("10");
	});
});

describe("Audit fixes: auxiliary action unlocking", () => {
	it("offers PAY_1_DOLLAR_TO_MOVE_ENGINE_1_FORWARD only when the forward disc is unlocked", () => {
		const game = freshGame();
		const ps = game.currentPlayerState();
		// At game start: AUX_GAIN_DOLLAR=1, AUX_DRAW_CARD_TO_DISCARD_CARD=1, others=0
		const singleOrDouble = game.unlockedSingleOrDoubleAuxiliaryActions(ps);
		const offered = new Set();
		for (const a of singleOrDouble) for (const act of a.getPossibleActions()) offered.add(act);
		
		// Base actions always available (pre-unlocked)
		expect(offered.has(ActionType.GAIN_1_DOLLAR)).toBe(true);
		expect(offered.has(ActionType.DRAW_CARD)).toBe(true);
		
		// Forward move requires disc unlock
		expect(offered.has(ActionType.PAY_1_DOLLAR_TO_MOVE_ENGINE_1_FORWARD)).toBe(false);
		expect(offered.has(ActionType.PAY_2_DOLLARS_TO_MOVE_ENGINE_2_FORWARD)).toBe(false);
		
		// Unlock first disc on forward row
		ps.unlocked[Unlockable.AUX_PAY_TO_MOVE_ENGINE_FORWARD] = 1;
		const afterUnlock = game.unlockedSingleOrDoubleAuxiliaryActions(ps);
		const offered2 = new Set();
		for (const a of afterUnlock) for (const act of a.getPossibleActions()) offered2.add(act);
		expect(offered2.has(ActionType.PAY_1_DOLLAR_TO_MOVE_ENGINE_1_FORWARD)).toBe(true);
		expect(offered2.has(ActionType.PAY_2_DOLLARS_TO_MOVE_ENGINE_2_FORWARD)).toBe(false);
		
		// Unlock second disc
		ps.unlocked[Unlockable.AUX_PAY_TO_MOVE_ENGINE_FORWARD] = 2;
		const afterUnlock2 = game.unlockedSingleOrDoubleAuxiliaryActions(ps);
		const offered3 = new Set();
		for (const a of afterUnlock2) for (const act of a.getPossibleActions()) offered3.add(act);
		expect(offered3.has(ActionType.PAY_2_DOLLARS_TO_MOVE_ENGINE_2_FORWARD)).toBe(true);
	});

	it("offers backwards move when that disc is unlocked, not forwards", () => {
		const game = freshGame();
		const ps = game.currentPlayerState();
		// Unlock backwards row only
		ps.unlocked[Unlockable.AUX_MOVE_ENGINE_BACKWARDS_TO_GAIN_CERT] = 1;
		
		const actions = game.unlockedSingleOrDoubleAuxiliaryActions(ps);
		const offered = new Set();
		for (const a of actions) for (const act of a.getPossibleActions()) offered.add(act);
		
		expect(offered.has(ActionType.PAY_1_DOLLAR_AND_MOVE_ENGINE_1_BACKWARDS_TO_GAIN_1_CERTIFICATE)).toBe(true);
		expect(offered.has(ActionType.PAY_1_DOLLAR_TO_MOVE_ENGINE_1_FORWARD)).toBe(false);
	});

	it("does not offer DRAW_2_CARDS unless both draw discs are unlocked", () => {
		const game = freshGame();
		const ps = game.currentPlayerState();
		// At start: AUX_DRAW_CARD_TO_DISCARD_CARD = 1 (one disc pre-cleared)
		const actions = game.unlockedSingleOrDoubleAuxiliaryActions(ps);
		const offered = new Set();
		for (const a of actions) for (const act of a.getPossibleActions()) offered.add(act);
		expect(offered.has(ActionType.DRAW_CARD)).toBe(true);
		expect(offered.has(ActionType.DRAW_2_CARDS)).toBe(false);
		
		// Unlock second draw disc
		ps.unlocked[Unlockable.AUX_DRAW_CARD_TO_DISCARD_CARD] = 2;
		const actions2 = game.unlockedSingleOrDoubleAuxiliaryActions(ps);
		const offered2 = new Set();
		for (const a of actions2) for (const act of a.getPossibleActions()) offered2.add(act);
		expect(offered2.has(ActionType.DRAW_2_CARDS)).toBe(true);
	});
});

describe("Audit fixes: 8a", () => {
	it("offers trade/aux plus the up-to-2 engine move", () => {
		const offered = playerBuildingAction("8a", Edition.FIRST, 3).getPossibleActions();
		expect(offered).toEqual(new Set([ActionType.TRADE_WITH_TRIBES, ActionType.SINGLE_OR_DOUBLE_AUXILIARY_ACTION, ActionType.MOVE_ENGINE_AT_MOST_2_FORWARD]));
	});
});

describe("Audit fixes: 8b copy", () => {
	function place(game, location, name) {
		game.getTrail().getLocation(location).building = { name, player: game.currentPlayer };
	}

	it("rejects Kansas City and other non-building adjacent locations", () => {
		const game = freshGame();
		const ps = game.currentPlayerState();
		place(game, "G-1", "8b");
		ps.activate("G-1");
		arm(game, ActionType.USE_ADJACENT_BUILDING);
		expect(() => run(game, { type: ActionType.USE_ADJACENT_BUILDING, location: "KANSAS_CITY" })).toThrow(/CANNOT_PERFORM_ACTION/);
	});

	it("does not let a copied 8b bounce back into an already activated 8b", () => {
		const game = freshGame();
		const ps = game.currentPlayerState();
		place(game, "G-1", "8b");
		place(game, "G", "8b");
		ps.activate("G-1");
		game.useAdjacentBuilding("G");
		expect(() => game.useAdjacentBuilding("G-1")).toThrow(/CANNOT_PERFORM_ACTION/);
	});

	it("copies local actions only, not the single-auxiliary alternative", () => {
		const game = freshGame();
		const ps = game.currentPlayerState();
		place(game, "B-1", "8b");
		place(game, "B-2", "1a");
		ps.activate("B-1");
		const result = game.useAdjacentBuilding("B-2");
		expect(JSON.stringify(result.actions)).not.toContain(ActionType.SINGLE_AUXILIARY_ACTION);
	});
});

describe("Audit fixes: Kansas City", () => {
	it("pays the Kansas City $6 on an extraordinary delivery", () => {
		const game = freshGame();
		const player = game.currentPlayer;
		const ps = game.currentPlayerState();
		ps.balance = 0;
		ps.lastEngineMove = 5;
		game.deliverToCity(City.KANSAS_CITY, 0);
		expect(game.getRailroadTrack().cities[City.KANSAS_CITY]).toEqual([player]);
		expect(ps.balance).toBe(6);
	});

	it("spends temporary certificates only on valid track steps", () => {
		const game = freshGame();
		const player = game.currentPlayer;
		const ps = game.currentPlayerState();
		ps.balance = 0;
		ps.tempCertificates = 3;
		ps.hand = [cattle(CattleType.TEXAS_LONGHORN, 5)];
		game.getTrail().movePlayer(player, "KANSAS_CITY");
		game.deliverToCity(City.KANSAS_CITY, 2);
		expect(ps.tempCertificates).toBe(1);
		expect(ps.balance).toBe(7 + 6); // 5 breeding + 2 certificates + KC $6
	});

	it("rejects a certificate total that is not on the track", () => {
		const game = freshGame();
		const player = game.currentPlayer;
		const ps = game.currentPlayerState();
		ps.tempCertificates = 6;
		ps.hand = [cattle(CattleType.TEXAS_LONGHORN, 5)];
		game.getTrail().movePlayer(player, "KANSAS_CITY");
		expect(() => game.deliverToCity(City.KANSAS_CITY, 1)).toThrow(/NOT_ENOUGH_CERTIFICATES/);
	});

	it("moves the cattleman to START immediately but refills foresight only at endTurn", () => {
		const game = freshGame();
		const player = game.currentPlayer;
		const ps = game.currentPlayerState();
		ps.balance = 20;
		ps.hand = [cattle(CattleType.TEXAS_LONGHORN, 5)];
		game.getTrail().movePlayer(player, "KANSAS_CITY");
		const foresights = game.getForesights();
		foresights.spaces[0][0] = null;
		const before = JSON.stringify(foresights.spaces);
		arm(game, ActionType.DELIVER_TO_CITY);
		run(game, { type: ActionType.DELIVER_TO_CITY, city: City.KANSAS_CITY, certificates: 0 });

		expect(game.getTrail().currentLocation(player)).toBe("START");
		expect(game.objectiveFromDisplayOnly()).toBe(true);
		expect(JSON.stringify(foresights.spaces)).toBe(before);

		game.state.actionStack.clear();
		game.endTurn(player, new JavaRandom(7));
		expect(foresights.spaces[0][0]).not.toBe(null);
	});

	it("rejects invalid certificate totals", () => {
		const game = freshGame();
		const player = game.currentPlayer;
		game.getTrail().movePlayer(player, "KANSAS_CITY");
		expect(() => game.deliverToCity(City.KANSAS_CITY, 0.5)).toThrow(/NOT_ENOUGH_CERTIFICATES/);
		expect(() => game.deliverToCity(City.KANSAS_CITY, 1)).toThrow(/NOT_ENOUGH_CERTIFICATES/);
	});
});

describe("Audit fixes: player count and foresight", () => {
	it("uses the original player count for job-market rows after a seat leaves", () => {
		const game = freshGame(4);
		const other = game.state.playerOrder.find((p) => p !== game.currentPlayer);
		game.leave(other, new JavaRandom(2));
		expect(game.state.playerOrder).toHaveLength(3);
		const jm = game.getJobMarket();
		jm.rows = Array.from({ length: 12 }, () => ({ workers: [] }));
		jm.currentRowIndex = 0;
		for (let i = 0; i < 3; i++)
			game.deployKcTile({ worker: Worker.COWBOY });
		expect(jm.rows[0].workers).toHaveLength(3);
		expect(jm.currentRowIndex).toBe(0);
		game.deployKcTile({ worker: Worker.COWBOY });
		expect(jm.currentRowIndex).toBe(1);
	});

	it("keeps worker tiles in foresight during final turns but makes them unselectable", () => {
		const game = freshGame();
		const fs = game.getForesights();
		game.state.jobMarket.currentRowIndex = 12;
		fs.spaces = [[{ worker: Worker.COWBOY }, null], [null, { teepee: Teepee.GREEN }], [null, null]];

		expect(game.foresightColumnHasChoice(0)).toBe(false);
		expect(game.foresightColumnHasChoice(1)).toBe(true);
		expect([...game.kansasCityAction().getPossibleActions()]).toEqual([ActionType.CHOOSE_FORESIGHT_2]);
		expect(() => game.chooseForesight(0, 0, new JavaRandom(3))).toThrow(/CANNOT_PERFORM_ACTION/);
		expect(fs.spaces[0][0]).toEqual({ worker: Worker.COWBOY });

		game.state.foresights.fillUp(game.state.kcSupply);
		expect(fs.spaces[0][0]).toEqual({ worker: Worker.COWBOY });
	});
});

describe("Audit fixes: objective sources", () => {
	it("requires a display card for 6b", () => {
		const game = freshGame();
		arm(game, ActionType.ADD_1_OBJECTIVE_CARD_TO_HAND);
		expect(() => run(game, { type: ActionType.ADD_1_OBJECTIVE_CARD_TO_HAND })).toThrow(/OBJECTIVE_CARD_NOT_AVAILABLE/);
		const card = game.getObjectiveCards().available[0];
		expect(() => run(game, { type: ActionType.ADD_1_OBJECTIVE_CARD_TO_HAND, objectiveCard: card })).not.toThrow();
	});

	it("requires a display card for an extraordinary-delivery green arrow", () => {
		const game = freshGame();
		game.currentPlayerState().lastEngineMove = 5;
		arm(game, ActionType.TAKE_OBJECTIVE_CARD);
		expect(() => run(game, { type: ActionType.TAKE_OBJECTIVE_CARD })).toThrow(/OBJECTIVE_CARD_NOT_AVAILABLE/);
		const card = game.getObjectiveCards().available[0];
		expect(() => run(game, { type: ActionType.TAKE_OBJECTIVE_CARD, objectiveCard: card })).not.toThrow();
	});

	it("keeps a normal Kansas City delivery display-only after moving to START", () => {
		const game = freshGame();
		const player = game.currentPlayer;
		const ps = game.currentPlayerState();
		ps.balance = 20;
		ps.hand = [cattle(CattleType.TEXAS_LONGHORN, 5)];
		game.getTrail().movePlayer(player, "KANSAS_CITY");
		arm(game, ActionType.DELIVER_TO_CITY);
		run(game, { type: ActionType.DELIVER_TO_CITY, city: City.KANSAS_CITY, certificates: 0 });
		expect(game.getTrail().currentLocation(player)).toBe("START");
		expect(game.objectiveFromDisplayOnly()).toBe(true);
		game.state.actionStack = ActionStack.initial([PossibleAction.mandatory(ActionType.TAKE_OBJECTIVE_CARD)]);
		expect(() => run(game, { type: ActionType.TAKE_OBJECTIVE_CARD })).toThrow(/OBJECTIVE_CARD_NOT_AVAILABLE/);
	});

	it("still allows a generic building action to draw the stack", () => {
		const game = freshGame();
		arm(game, ActionType.TAKE_OBJECTIVE_CARD);
		expect(() => run(game, { type: ActionType.TAKE_OBJECTIVE_CARD })).not.toThrow();
	});
});

describe("Audit fixes: objective play window", () => {
	it("closes the objective window between repeated Buy Cattle purchases", () => {
		const game = freshGame();
		const player = game.currentPlayer;
		const ps = game.currentPlayerState();
		ps.balance = 10;
		ps.workers[Worker.COWBOY] = 3;
		ps.hand = [OBJECTIVE_CARD_TYPES.GAIN2_4HH];
		const market = game.getCattleMarket();
		const card = cattle(CattleType.HOLSTEIN, 3);
		market.market = [card];
		game.state.actionStack = ActionStack.initial([PossibleAction.repeat(0, 4, ActionType.BUY_CATTLE)]);
		run(game, { type: ActionType.BUY_CATTLE, cattleCards: [card], cowboys: 1, dollars: 6 });

		expect(game.canPlayObjectiveCard()).toBe(false);
		expect(game.state.actionStack.hasStartedRepeat()).toBe(true);
		game.state.actionStack.skipAll();
		expect(game.canPlayObjectiveCard()).toBe(true);
	});
});

describe("Audit fixes: no-disc and station fallbacks", () => {
	it("rejects a station upgrade when no disc can be placed", () => {
		const game = freshGame();
		const player = game.currentPlayer;
		const ps = game.currentPlayerState();
		for (const u of Object.values(Unlockable)) ps.unlocked[u] = UNLOCKABLE_INFO[u].count;
		ps.balance = 20;
		game.getRailroadTrack().players[player] = "4.5";
		arm(game, ActionType.UPGRADE_STATION);
		expect(() => run(game, { type: ActionType.UPGRADE_STATION })).toThrow(/NO_DISC_AVAILABLE/);
		expect(game.currentPlayerState().balance).toBe(20);
		expect(game.getRailroadTrack().stations[0].upgradedBy).not.toContain(player);
	});

	it("rejects a delivery when no disc can be placed", () => {
		const game = freshGame();
		const player = game.currentPlayer;
		const ps = game.currentPlayerState();
		for (const u of Object.values(Unlockable)) ps.unlocked[u] = UNLOCKABLE_INFO[u].count;
		ps.balance = 20;
		ps.hand = [cattle(CattleType.TEXAS_LONGHORN, 5)];
		game.getTrail().movePlayer(player, "KANSAS_CITY");
		arm(game, ActionType.DELIVER_TO_CITY);
		expect(() => run(game, { type: ActionType.DELIVER_TO_CITY, city: City.KANSAS_CITY, certificates: 0 })).toThrow(/NO_DISC_AVAILABLE/);
		expect(game.currentPlayerState().balance).toBe(20);
		expect(game.getRailroadTrack().cities[City.KANSAS_CITY] ?? []).toEqual([]);
	});

	it("does not let a station upgrade use its own newly placed disc as the fallback", () => {
		const game = freshGame();
		const player = game.currentPlayer;
		const ps = game.currentPlayerState();
		for (const u of Object.values(Unlockable)) ps.unlocked[u] = UNLOCKABLE_INFO[u].count;
		ps.balance = 20;
		const stations = game.getRailroadTrack().stations;
		stations[1].upgradedBy = [player];
		game.getRailroadTrack().players[player] = "4.5";
		arm(game, ActionType.UPGRADE_STATION);
		run(game, { type: ActionType.UPGRADE_STATION });

		expect(game.currentPlayerState().pendingStationUpgrade).toBe(0);
		expect(() => run(game, { type: ActionType.DOWNGRADE_STATION, station: 0 })).toThrow(/STATION_MUST_BE_DIFFERENT/);
		expect(() => run(game, { type: ActionType.DOWNGRADE_STATION, station: 1 })).not.toThrow();
		expect(game.currentPlayerState().pendingStationUpgrade).toBe(null);
	});

	it("allows a later delivery to take the disc from the station just upgraded", () => {
		const game = freshGame();
		const player = game.currentPlayer;
		const ps = game.currentPlayerState();
		const station = game.getRailroadTrack().stations[0];
		station.upgradedBy = [player];
		ps.lastUpgradedStation = 0;
		arm(game, ActionType.DOWNGRADE_STATION);
		expect(() => run(game, { type: ActionType.DOWNGRADE_STATION, station: 0 })).not.toThrow();
		expect(station.upgradedBy).not.toContain(player);
	});
});

describe("Audit fixes: payload validation", () => {
	it("rejects a cattle card as PLAY_OBJECTIVE_CARD", () => {
		const game = freshGame();
		const ps = game.currentPlayerState();
		ps.hand = [OBJECTIVE_CARD_TYPES.GAIN2_4HH, cattle(CattleType.JERSEY, 1)];
		expect(() => run(game, { type: ActionType.PLAY_OBJECTIVE_CARD, objectiveCard: ps.hand[1] })).toThrow(/CARD_NOT_IN_HAND/);
	});

	it("rejects an unknown worker for APPOINT_STATION_MASTER", () => {
		const game = freshGame();
		const ps = game.currentPlayerState();
		const station = game.getRailroadTrack().stations[0];
		station.stationMaster = "GAIN_2_DOLLARS_POINT_FOR_EACH_WORKER";
		ps.lastUpgradedStation = 0;
		ps.workers[Worker.COWBOY] = 2;
		arm(game, ActionType.APPOINT_STATION_MASTER);
		expect(() => run(game, { type: ActionType.APPOINT_STATION_MASTER, worker: "WIZARD" })).toThrow(/WORKER_NOT_AVAILABLE/);
	});

	it("rejects an out-of-range foresight choice", () => {
		const game = freshGame();
		game.getForesights().spaces[0][0] = { teepee: Teepee.GREEN };
		arm(game, ActionType.CHOOSE_FORESIGHT_1);
		expect(() => run(game, { type: ActionType.CHOOSE_FORESIGHT_1, choice: 99 })).toThrow(/CANNOT_PERFORM_ACTION/);
	});

	it("rejects invalid building/hazard/trade/station/unlock targets", () => {
		const game = freshGame();
		arm(game, ActionType.DOWNGRADE_STATION);
		expect(() => run(game, { type: ActionType.DOWNGRADE_STATION, station: 999 })).toThrow(/STATION_NOT_ON_TRACK/);
		arm(game, ActionType.REMOVE_HAZARD);
		expect(() => run(game, { type: ActionType.REMOVE_HAZARD, location: "NOPE" })).toThrow(/NO_SUCH_LOCATION/);
		arm(game, ActionType.TRADE_WITH_TRIBES);
		expect(() => run(game, { type: ActionType.TRADE_WITH_TRIBES, location: "NOPE" })).toThrow(/NO_SUCH_LOCATION/);
		arm(game, ActionType.PLACE_BUILDING);
		expect(() => run(game, { type: ActionType.PLACE_BUILDING, location: "NOPE", building: "1a" })).toThrow(/NO_SUCH_LOCATION/);
		arm(game, ActionType.UNLOCK_WHITE);
		expect(() => run(game, { type: ActionType.UNLOCK_WHITE, unlock: "NOPE" })).toThrow(/MUST_PICK_WHITE_DISC/);
		arm(game, ActionType.UNLOCK_BLACK_OR_WHITE);
		expect(() => run(game, { type: ActionType.UNLOCK_BLACK_OR_WHITE, unlock: "NOPE" })).toThrow(/CANNOT_PERFORM_ACTION/);
		expect(() => game.deliverToCity("NOPE", 0)).toThrow(/CITY_NOT_ACCESSIBLE/);
	});
});

describe("Audit fixes: UI preview helpers", () => {
	it("excludes Kansas City from the objective-card trail move", () => {
		const game = freshGame();
		const player = game.currentPlayer;
		game.getTrail().movePlayer(player, "G-1");
		const objective = map.trailMoveTargets(game, ActionType.MOVE_3_FORWARD_WITHOUT_FEES);
		const normal = map.trailMoveTargets(game, ActionType.MOVE_3_FORWARD);
		expect(objective.some((m) => map.moveDestination(m) === "KANSAS_CITY")).toBe(false);
		expect(normal.some((m) => map.moveDestination(m) === "KANSAS_CITY")).toBe(true);
		expect(map.trailMoveAllowed(ActionType.MOVE_3_FORWARD_WITHOUT_FEES, "KANSAS_CITY")).toBe(false);
		expect(map.trailMoveAllowed(ActionType.MOVE_3_FORWARD, "KANSAS_CITY")).toBe(true);

		const negative = game.getTrail().getLocation("TEEPEE--3");
		negative.teepee = Teepee.GREEN;
		expect(map.canAffordTrade(negative, 2)).toBe(false);
		expect(map.canAffordTrade(negative, 3)).toBe(true);
		const positive = game.getTrail().getLocation("TEEPEE-1");
		positive.teepee = Teepee.GREEN;
		expect(map.canAffordTrade(positive, 0)).toBe(true);
	});
});

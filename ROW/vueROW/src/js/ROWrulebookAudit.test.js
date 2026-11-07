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
	Unlockable,
	Worker,
	defaultOptions,
} from "./ROWindex";

function players(n) {
	const colors = ["RED", "BLUE", "YELLOW", "GREEN"];
	return Array.from({ length: n }, (_, i) => ({ name: `Player ${i + 1}`, color: colors[i], type: "HUMAN" }));
}

function freshGame(n = 2, seed = 1, edition = Edition.FIRST, extra = {}) {
	return Game.start(players(n), defaultOptions(edition, { buildings: "BEGINNER", ...extra }), new JavaRandom(seed));
}

function clearPlayerScore(ps) {
	ps.balance = 0;
	ps.hand = [];
	ps.drawStack = [];
	ps.discardPile = [];
	ps.objectives = [];
	ps.stationMasters = [];
	ps.teepees = [];
	ps.hazards = [];
	ps.workers = { [Worker.COWBOY]: 0, [Worker.CRAFTSMAN]: 0, [Worker.ENGINEER]: 0 };
	ps.jobMarketToken = false;
	ps.bid = null;
	ps.tempCertificates = 0;
	for (const u of Object.values(Unlockable)) ps.unlocked[u] = 0;
}

describe("Rulebook audit: step limit", () => {
	it("uses the player-count tile's +1/+1 for four players", () => {
		const game = freshGame(4);
		const ps = game.currentPlayerState();
		expect(game.getStepLimit()).toBe(4);
		ps.unlocked[Unlockable.EXTRA_STEP_DOLLARS] = 1;
		expect(game.getStepLimit()).toBe(5);
		ps.unlocked[Unlockable.EXTRA_STEP_POINTS] = 1;
		expect(game.getStepLimit()).toBe(6);
	});

	it("keeps the 2p/3p step tracks", () => {
		const game2 = freshGame(2);
		const ps2 = game2.currentPlayerState();
		expect(game2.getStepLimit()).toBe(3);
		ps2.unlocked[Unlockable.EXTRA_STEP_DOLLARS] = 1;
		expect(game2.getStepLimit()).toBe(4);
		ps2.unlocked[Unlockable.EXTRA_STEP_POINTS] = 1;
		expect(game2.getStepLimit()).toBe(5);

		const game3 = freshGame(3);
		const ps3 = game3.currentPlayerState();
		expect(game3.getStepLimit()).toBe(3);
		ps3.unlocked[Unlockable.EXTRA_STEP_DOLLARS] = 1;
		expect(game3.getStepLimit()).toBe(5);
		ps3.unlocked[Unlockable.EXTRA_STEP_POINTS] = 1;
		expect(game3.getStepLimit()).toBe(6);
	});
});

describe("Rulebook audit: station master permanent certificates", () => {
	it("counts every permanent-certificate upper half", () => {
		const game = freshGame();
		const ps = game.currentPlayerState();
		ps.stationMasters = [
			"PERM_CERT_POINTS_FOR_EACH_2_HAZARDS",
			"PERM_CERT_POINTS_FOR_TEEPEE_PAIRS",
			"PERM_CERT_POINTS_FOR_EACH_2_CERTS",
		];
		expect(ps.permanentCertificates()).toBe(3);
		expect(game.permanentCertificates(ps)).toBe(3);
		ps.stationMasters.push("PERM_CERT_POINTS_PER_2_STATIONS");
		expect(ps.permanentCertificates()).toBe(4);
		ps.stationMasters.push("TWO_PERM_CERTS");
		expect(ps.permanentCertificates()).toBe(6);
	});
});

describe("Rulebook audit: first-turn placement", () => {
	it("only offers neutral building locations", () => {
		const game = freshGame();
		const trail = game.getTrail();
		const player = game.currentPlayer;
		const other = game.state.playerOrder.find((n) => n !== player);
		const neutral = trail.getLocation("A");
		neutral.building = { name: "1a", player: other };
		const moves = trail.possibleMovesFrom(player, 0, 3, 2, null);
		expect(moves.some((m) => m.steps[0] === "A")).toBe(false);
	});

	it("rejects a private or empty building as the opening location", () => {
		const game = freshGame();
		const trail = game.getTrail();
		const player = game.currentPlayer;
		const other = game.state.playerOrder.find((n) => n !== player);
		const neutral = trail.getLocation("A");
		neutral.building = { name: "1a", player: other };
		game.state.currentPlayer = player;
		game.state.actionStack = ActionStack.initial([PossibleAction.mandatory(ActionType.MOVE)]);
		expect(() => game.perform(player, { type: ActionType.MOVE, steps: ["A"] }, new JavaRandom(2))).toThrow(/MUST_START_ON_NEUTRAL_BUILDING/);

		const empty = [...trail.locations.values()].find((l) => l.kind === "BUILDING" && !l.building);
		expect(empty).toBeTruthy();
		expect(() => game.perform(player, { type: ActionType.MOVE, steps: [empty.name] }, new JavaRandom(3))).toThrow(/LOCATION_EMPTY|MUST_START_ON_NEUTRAL_BUILDING/);
	});
});

describe("Rulebook audit: Kansas City income and delivery", () => {
	it("gains income, discards the hand, and then pays transport costs", () => {
		const game = freshGame();
		const player = game.currentPlayer;
		const ps = game.currentPlayerState();
		ps.balance = 0;
		ps.hand = [{ type: CattleType.TEXAS_LONGHORN, points: 5, value: 5 }];
		game.getTrail().movePlayer(player, "KANSAS_CITY");
		let handAtDelivery = null;
		const originalDeliveryActions = game.deliveryActions.bind(game);
		game.deliveryActions = (city) => {
			handAtDelivery = ps.hand.length;
			return originalDeliveryActions(city);
		};
		game.state.actionStack = ActionStack.initial([PossibleAction.mandatory(ActionType.DELIVER_TO_CITY)]);
		game.perform(player, { type: ActionType.DELIVER_TO_CITY, city: City.KANSAS_CITY, certificates: 0 }, new JavaRandom(4));
		// 5 income + 6 Kansas City crest bonus; no transport from the starting space.
		expect(ps.balance).toBe(11);
		expect(ps.hand).toHaveLength(0);
		expect(handAtDelivery).toBe(0);
	});

	it("always includes permanent certificates in income, even when no certificate is passed", () => {
		const game = freshGame();
		const player = game.currentPlayer;
		const ps = game.currentPlayerState();
		ps.balance = 0;
		ps.hand = [{ type: CattleType.TEXAS_LONGHORN, points: 5, value: 5 }];
		ps.stationMasters = ["PERM_CERT_POINTS_FOR_EACH_2_HAZARDS"];
		game.getTrail().movePlayer(player, "KANSAS_CITY");
		game.state.actionStack = ActionStack.initial([PossibleAction.mandatory(ActionType.DELIVER_TO_CITY)]);
		game.perform(player, { type: ActionType.DELIVER_TO_CITY, city: City.KANSAS_CITY, certificates: 0 }, new JavaRandom(40));
		expect(ps.balance).toBe(12); // 5 breeding + 1 permanent certificate + 6 KC
	});
});

describe("Rulebook audit: green-arrow objective cards", () => {
	it("queues two display actions when display 1 + stack 1 can refill", () => {
		const game = freshGame();
		const player = game.currentPlayer;
		const track = game.getRailroadTrack();
		track.cities[City.COLORADO_SPRINGS] = [player];
		track.cities[City.ALBUQUERQUE] = [player];
		game.getTrail().movePlayer(player, "KANSAS_CITY");
		const objs = game.getObjectiveCards();
		objs.available = [OBJECTIVE_CARD_TYPES.AUX_SF];
		objs.drawStack = [OBJECTIVE_CARD_TYPES.GAIN2_4HH];
		const actions = game.deliveryActions(City.SANTA_FE).filter((a) => a.action === ActionType.TAKE_OBJECTIVE_CARD);
		expect(actions).toHaveLength(2);
	});

	it("does not offer a display action when the display is empty", () => {
		const game = freshGame();
		const player = game.currentPlayer;
		const track = game.getRailroadTrack();
		track.cities[City.COLORADO_SPRINGS] = [player];
		track.cities[City.ALBUQUERQUE] = [player];
		game.getTrail().movePlayer(player, "KANSAS_CITY");
		const objs = game.getObjectiveCards();
		objs.available = [];
		objs.drawStack = [OBJECTIVE_CARD_TYPES.AUX_SF, OBJECTIVE_CARD_TYPES.GAIN2_4HH];
		expect(game.deliveryActions(City.SANTA_FE).filter((a) => a.action === ActionType.TAKE_OBJECTIVE_CARD)).toHaveLength(0);
	});

	it("blocks drawing the top of the stack for a first-edition delivery", () => {
		const game = freshGame();
		const player = game.currentPlayer;
		game.getTrail().movePlayer(player, "KANSAS_CITY");
		game.getObjectiveCards().available = [OBJECTIVE_CARD_TYPES.AUX_SF];
		game.state.actionStack = ActionStack.initial([PossibleAction.mandatory(ActionType.TAKE_OBJECTIVE_CARD)]);
		expect(() => game.perform(player, { type: ActionType.TAKE_OBJECTIVE_CARD }, new JavaRandom(5))).toThrow(/OBJECTIVE_CARD_NOT_AVAILABLE/);
		expect(() => game.perform(player, { type: ActionType.TAKE_OBJECTIVE_CARD, objectiveCard: OBJECTIVE_CARD_TYPES.AUX_SF }, new JavaRandom(6))).not.toThrow();
	});
});

describe("Rulebook audit: shared victory", () => {
	it("groups equal scores instead of breaking ties by balance", () => {
		const game = freshGame();
		for (const p of game.state.players) clearPlayerScore(game.playerState(p.name));
		game.getRailroadTrack().cities = {};
		for (const st of game.getRailroadTrack().stations) st.upgradedBy = [];
		expect(game.rankingGroups()).toEqual([game.state.players.map((p) => p.name)]);
		expect(game.ranking()).toEqual(game.state.players.map((p) => p.name));
	});
});

describe("Rulebook audit: private building replacement", () => {
	it("allows a higher-numbered tile with the same craftsman requirement", () => {
		const game = freshGame();
		const player = game.currentPlayer;
		const trail = game.getTrail();
		const loc = [...trail.locations.values()].find((l) => l.kind === "BUILDING" && !l.building);
		loc.building = { name: "2a", player };
		game.state.actionStack = ActionStack.initial([PossibleAction.mandatory(ActionType.PLACE_BUILDING)]);
		expect(() => game.perform(player, { type: ActionType.PLACE_BUILDING, location: loc.name, building: "3a" }, new JavaRandom(7))).not.toThrow();
		expect(loc.building.name).toBe("3a");
	});

	it("rejects a lower-numbered replacement", () => {
		const game = freshGame();
		const player = game.currentPlayer;
		const trail = game.getTrail();
		const loc = [...trail.locations.values()].find((l) => l.kind === "BUILDING" && !l.building);
		loc.building = { name: "3a", player };
		game.state.actionStack = ActionStack.initial([PossibleAction.mandatory(ActionType.PLACE_BUILDING)]);
		expect(() => game.perform(player, { type: ActionType.PLACE_BUILDING, location: loc.name, building: "2a" }, new JavaRandom(8))).toThrow(/REPLACEMENT_BUILDING_MUST_BE_HIGHER/);
	});
});

describe("Rulebook audit: hand fees", () => {
	it("does not charge a hand fee on your own building", () => {
		const game = freshGame();
		const player = game.currentPlayer;
		const trail = game.getTrail();
		trail.getLocation("A").building = { name: "4a", player };
		expect(trail.buildMove("START", ["A"], player, 10, 2).cost).toBe(0);
	});

	it("caps each hand fee against the remaining balance in path order", () => {
		const game = freshGame();
		const player = game.currentPlayer;
		const trail = game.getTrail();
		trail.getLocation("A").building = { name: "4a", player: "Other 1" };
		trail.getLocation("B").building = { name: "4a", player: "Other 2" };
		const move = trail.buildMove("START", ["A", "B"], player, 3, 2);
		expect(move.cost).toBe(0);
		expect(move.playerFees["Other 1"]).toBe(2);
		expect(move.playerFees["Other 2"]).toBe(1);
	});
});

describe("Rulebook audit: trade with the Indians", () => {
	it("requires full payment for a negative teepee value", () => {
		const game = freshGame();
		const player = game.currentPlayer;
		const ps = game.currentPlayerState();
		const loc = game.getTrail().getLocation("TEEPEE--3");
		loc.teepee = Teepee.GREEN;
		ps.balance = 2;
		game.state.actionStack = ActionStack.initial([PossibleAction.mandatory(ActionType.TRADE_WITH_TRIBES)]);
		expect(() => game.perform(player, { type: ActionType.TRADE_WITH_TRIBES, location: "TEEPEE--3" }, new JavaRandom(9))).toThrow(/NOT_ENOUGH_BALANCE/);
		const current = game.currentPlayerState();
		current.balance = 3;
		game.perform(player, { type: ActionType.TRADE_WITH_TRIBES, location: "TEEPEE--3" }, new JavaRandom(10));
		expect(current.balance).toBe(0);
		expect(current.teepees).toContain(Teepee.GREEN);
	});
});

describe("Rulebook audit: cattle buying", () => {
	it("rejects more than two cards for a pair price", () => {
		const game = freshGame();
		const market = game.getCattleMarket();
		const cards = [
			{ type: CattleType.HOLSTEIN, points: 1, value: 3 },
			{ type: CattleType.BROWN_SWISS, points: 2, value: 3 },
			{ type: CattleType.AYRSHIRE, points: 3, value: 3 },
		];
		market.market = cards;
		expect(() => market.buy(cards, 3, 5)).toThrow(/NOT_PAIR/);
	});

	it("allows two distinct cards with the same breeding value", () => {
		const game = freshGame();
		const market = game.getCattleMarket();
		const a = { type: CattleType.HOLSTEIN, points: 1, value: 3 };
		const b = { type: CattleType.AYRSHIRE, points: 3, value: 3 };
		market.market = [a, b];
		const cost = market.buy([a, b], 3, 5);
		expect(cost.pair).toBe(true);
		expect(market.market).toHaveLength(0);
	});
});

describe("Rulebook audit: objective-card discard", () => {
	it("rejects a non-objective card", () => {
		const game = freshGame();
		const player = game.currentPlayer;
		const ps = game.currentPlayerState();
		const cattle = { type: CattleType.JERSEY, points: 0, value: 1 };
		ps.hand = [cattle];
		game.state.actionStack = ActionStack.initial([PossibleAction.mandatory(ActionType.DISCARD_1_OBJECTIVE_CARD_TO_GAIN_2_CERTIFICATES)]);
		expect(() => game.perform(player, { type: ActionType.DISCARD_1_OBJECTIVE_CARD_TO_GAIN_2_CERTIFICATES, objectiveCard: cattle }, new JavaRandom(11))).toThrow(/CARD_NOT_IN_HAND/);
	});
});

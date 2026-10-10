import { describe, expect, it } from "vitest";
import { ActionStack, ActionType, CattleType, Edition, Game, Hand, HazardType, JavaRandom, PossibleAction, Unlockable, defaultOptions } from "./ROWindex";

/**
 * Drives a batch of commands the replay corpus does not reach, so `coverage.test.js`
 * can treat them as exercised. Each case builds the minimal legal state and performs
 * the action; most assert only that it does not throw (a smoke check of the handler).
 */
function players(n) {
	const colors = ["RED", "BLUE", "YELLOW", "GREEN"];
	return Array.from({ length: n }, (_, i) => ({ name: `Player ${i + 1}`, color: colors[i], type: "HUMAN" }));
}
function freshGame(seed = 1, n = 2, extra = {}) {
	return Game.start(players(n), defaultOptions(Edition.FIRST, { buildings: "BEGINNER", ...extra }), new JavaRandom(seed));
}
function arm(game, type) {
	game.state.actionStack = ActionStack.initial([PossibleAction.mandatory(type)]);
}
function run(game, action) {
	return game.perform(game.currentPlayer, action, new JavaRandom(99));
}
function setHand(game, cards) {
	const ps = game.currentPlayerState();
	ps.hand = cards;
	ps.drawStack = [];
	ps.discardPile = [];
	return ps;
}
const cattle = (type, value) => ({ type, points: 0, value });
function engineTo(game, forward, atLeast, atMost) {
	const rt = game.getRailroadTrack();
	const from = rt.currentSpace(game.currentPlayer);
	const spaces = forward ? rt.reachableSpacesForward(from, atLeast, atMost) : rt.reachableSpacesBackwards(from, atLeast, atMost);
	return [...spaces][0];
}
const G = (type) => it(`performs ${type}`, () => {
	const game = freshGame(1);
	arm(game, type);
	expect(() => run(game, { type })).not.toThrow();
});
const C = (type, cattleType) => it(`performs ${type}`, () => {
	const game = freshGame(2);
	setHand(game, [cattle(cattleType, 2)]);
	arm(game, type);
	expect(() => run(game, { type, cattleType })).not.toThrow();
});

describe("Coverage: money / certificate gains", () => {
	for (const [type, amount] of [[ActionType.GAIN_2_DOLLARS, 2], [ActionType.GAIN_3_DOLLARS, 3], [ActionType.GAIN_4_DOLLARS, 4], [ActionType.GAIN_5_DOLLARS, 5]]) {
		it(`performs ${type}`, () => {
			const game = freshGame(1);
			const ps = game.currentPlayerState();
			const before = ps.balance;
			arm(game, type);
			run(game, { type });
			expect(ps.balance).toBe(before + amount);
		});
	}
	G(ActionType.GAIN_2_CERTIFICATES);
	G(ActionType.GAIN_1_DOLLAR_PER_ENGINEER);
	G(ActionType.GAIN_1_DOLLAR_PER_CRAFTSMAN);
	G(ActionType.GAIN_2_DOLLARS_PER_BUILDING_IN_WOODS);
	G(ActionType.GAIN_2_DOLLARS_PER_STATION);
	G(ActionType.GAIN_2_CERTIFICATES_AND_2_DOLLARS_PER_TEEPEE_PAIR);
	G(ActionType.MAX_CERTIFICATES);
	G(ActionType.GAIN_1_CERTIFICATE_AND_1_DOLLAR_PER_BELL);
});

describe("Coverage: draw actions", () => {
	for (const type of [ActionType.DRAW_3_CARDS, ActionType.DRAW_4_CARDS, ActionType.DRAW_5_CARDS, ActionType.DRAW_6_CARDS]) {
		it(`performs ${type}`, () => {
			const game = freshGame(3);
			arm(game, type);
			expect(() => run(game, { type })).not.toThrow();
		});
	}
});

describe("Coverage: cattle discard actions", () => {
	C(ActionType.DISCARD_1_JERSEY_TO_GAIN_2_DOLLARS, CattleType.JERSEY);
	C(ActionType.DISCARD_1_JERSEY_TO_GAIN_4_DOLLARS, CattleType.JERSEY);
	C(ActionType.DISCARD_1_JERSEY_TO_GAIN_1_CERTIFICATE, CattleType.JERSEY);
	C(ActionType.DISCARD_1_JERSEY_TO_GAIN_2_CERTIFICATES, CattleType.JERSEY);
	C(ActionType.DISCARD_1_JERSEY_TO_GAIN_1_CERTIFICATE_AND_2_DOLLARS, CattleType.JERSEY);
	C(ActionType.DISCARD_1_JERSEY_FOR_SINGLE_AUXILIARY_ACTION, CattleType.JERSEY);
	C(ActionType.DISCARD_1_JERSEY_TO_MOVE_ENGINE_1_FORWARD, CattleType.JERSEY);
	C(ActionType.DISCARD_1_DUTCH_BELT_TO_GAIN_3_DOLLARS, CattleType.DUTCH_BELT);
	C(ActionType.DISCARD_1_DUTCH_BELT_TO_MOVE_ENGINE_2_FORWARD, CattleType.DUTCH_BELT);
	C(ActionType.DISCARD_1_GUERNSEY_TO_GAIN_4_DOLLARS, CattleType.GUERNSEY);
	C(ActionType.DISCARD_1_BLACK_ANGUS_TO_GAIN_2_CERTIFICATES, CattleType.BLACK_ANGUS);
	C(ActionType.DISCARD_1_HOLSTEIN_TO_GAIN_10_DOLLARS, CattleType.HOLSTEIN);
	C(ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_1_CERTIFICATE, CattleType.JERSEY);
	C(ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_3_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND, CattleType.JERSEY);
	C(ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_6_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND, CattleType.JERSEY);
	C(ActionType.DISCARD_CATTLE_CARD_TO_GAIN_7_DOLLARS, CattleType.HOLSTEIN);
	it(`performs ${ActionType.DISCARD_PAIR_TO_GAIN_3_DOLLARS}`, () => {
		const game = freshGame(2);
		setHand(game, [cattle(CattleType.JERSEY, 1), cattle(CattleType.JERSEY, 1)]);
		arm(game, ActionType.DISCARD_PAIR_TO_GAIN_3_DOLLARS);
		expect(() => run(game, { type: ActionType.DISCARD_PAIR_TO_GAIN_3_DOLLARS, cattleType: CattleType.JERSEY })).not.toThrow();
	});
});

describe("Coverage: objective actions", () => {
	it(`performs ${ActionType.ADD_1_OBJECTIVE_CARD_TO_HAND}`, () => {
		const game = freshGame(2);
		arm(game, ActionType.ADD_1_OBJECTIVE_CARD_TO_HAND);
		expect(() => run(game, { type: ActionType.ADD_1_OBJECTIVE_CARD_TO_HAND })).not.toThrow();
	});
	it(`performs ${ActionType.DISCARD_1_OBJECTIVE_CARD_TO_GAIN_2_CERTIFICATES}`, () => {
		const game = freshGame(2);
		const ps = setHand(game, []);
		const card = { id: "AUX_SF", tasks: ["SAN_FRANCISCO"], points: 5, penalty: 3, action: "SINGLE_OR_DOUBLE_AUXILIARY_ACTION" };
		ps.hand = [card];
		arm(game, ActionType.DISCARD_1_OBJECTIVE_CARD_TO_GAIN_2_CERTIFICATES);
		expect(() => run(game, { type: ActionType.DISCARD_1_OBJECTIVE_CARD_TO_GAIN_2_CERTIFICATES, objectiveCard: card })).not.toThrow();
	});
	it(`performs ${ActionType.TAKE_BREEDING_VALUE_3_CATTLE_CARD}`, () => {
		const game = freshGame(2);
		const card = game.state.cattleMarket.market.find((c) => c.value === 3) ?? game.state.cattleMarket.market[0];
		arm(game, ActionType.TAKE_BREEDING_VALUE_3_CATTLE_CARD);
		expect(() => run(game, { type: ActionType.TAKE_BREEDING_VALUE_3_CATTLE_CARD, card })).not.toThrow();
	});
});

describe("Coverage: hiring and unlocks", () => {
	for (const [type, discount] of [[ActionType.HIRE_WORKER_MINUS_1, -1], [ActionType.HIRE_WORKER_MINUS_2, -2]]) {
		it(`performs ${type}`, () => {
			const game = freshGame(2);
			const ps = game.currentPlayerState();
			ps.balance = 50;
			const jm = game.getJobMarket();
			jm.rows[0].workers = ["COWBOY"];
			jm.currentRowIndex = 1;
			arm(game, type);
			expect(() => run(game, { type, row: 0, worker: "COWBOY" })).not.toThrow();
		});
	}
	it(`performs ${ActionType.UNLOCK_BLACK_OR_WHITE}`, () => {
		const game = freshGame(2);
		arm(game, ActionType.UNLOCK_BLACK_OR_WHITE);
		expect(() => run(game, { type: ActionType.UNLOCK_BLACK_OR_WHITE, unlock: Unlockable.EXTRA_STEP_DOLLARS })).not.toThrow();
	});
});

describe("Coverage: trail actions", () => {
	it(`performs ${ActionType.REMOVE_HAZARD_FOR_FREE}`, () => {
		const game = freshGame(2);
		const loc = [...game.getTrail().locations.values()].find((l) => l.kind === "HAZARD" && l.hazard);
		if (!loc) return;
		arm(game, ActionType.REMOVE_HAZARD_FOR_FREE);
		expect(() => run(game, { type: ActionType.REMOVE_HAZARD_FOR_FREE, location: loc.def.name })).not.toThrow();
	});
	it(`performs ${ActionType.REMOVE_HAZARD_FOR_2_DOLLARS}`, () => {
		const game = freshGame(2);
		game.currentPlayerState().balance = 50;
		const loc = [...game.getTrail().locations.values()].find((l) => l.kind === "HAZARD" && l.hazard);
		if (!loc) return;
		arm(game, ActionType.REMOVE_HAZARD_FOR_2_DOLLARS);
		expect(() => run(game, { type: ActionType.REMOVE_HAZARD_FOR_2_DOLLARS, location: loc.def.name })).not.toThrow();
	});
	it(`performs ${ActionType.REMOVE_HAZARD_FOR_5_DOLLARS}`, () => {
		const game = freshGame(2);
		game.currentPlayerState().balance = 50;
		const loc = [...game.getTrail().locations.values()].find((l) => l.kind === "HAZARD" && l.hazard);
		if (!loc) return;
		arm(game, ActionType.REMOVE_HAZARD_FOR_5_DOLLARS);
		expect(() => run(game, { type: ActionType.REMOVE_HAZARD_FOR_5_DOLLARS, location: loc.def.name })).not.toThrow();
	});
	it(`performs ${ActionType.TRADE_WITH_TRIBES}`, () => {
		const game = freshGame(2);
		const loc = [...game.getTrail().locations.values()].find((l) => l.kind === "TEEPEE" && l.teepee);
		if (!loc) return;
		arm(game, ActionType.TRADE_WITH_TRIBES);
		expect(() => run(game, { type: ActionType.TRADE_WITH_TRIBES, location: loc.def.name })).not.toThrow();
	});
	it(`performs ${ActionType.DOWNGRADE_STATION}`, () => {
		const game = freshGame(2);
		game.getRailroadTrack().stations[0].upgradedBy = [game.currentPlayer];
		arm(game, ActionType.DOWNGRADE_STATION);
		expect(() => run(game, { type: ActionType.DOWNGRADE_STATION, station: 0 })).not.toThrow();
	});
	it(`performs ${ActionType.UPGRADE_ANY_STATION_BEHIND_ENGINE}`, () => {
		const game = freshGame(2);
		game.currentPlayerState().balance = 50;
		game.getRailroadTrack().players[game.currentPlayer] = "10";
		arm(game, ActionType.UPGRADE_ANY_STATION_BEHIND_ENGINE);
		expect(() => run(game, { type: ActionType.UPGRADE_ANY_STATION_BEHIND_ENGINE, station: 0 })).not.toThrow();
	});
});

describe("Coverage: engine moves", () => {
	const forward = [
		[ActionType.MOVE_ENGINE_1_FORWARD, 1, 1],
		[ActionType.MOVE_ENGINE_2_FORWARD, 1, 2],
		[ActionType.MOVE_ENGINE_AT_MOST_2_FORWARD, 0, 2],
		[ActionType.MOVE_ENGINE_AT_MOST_3_FORWARD, 0, 3],
		[ActionType.MOVE_ENGINE_AT_MOST_4_FORWARD, 0, 4],
		[ActionType.MOVE_ENGINE_2_OR_3_FORWARD, 2, 3],
	];
	for (const [type, atLeast, atMost] of forward) {
		it(`performs ${type}`, () => {
			const game = freshGame(2);
			game.getRailroadTrack().players[game.currentPlayer] = "0";
			const to = engineTo(game, true, atLeast, atMost);
			arm(game, type);
			expect(() => run(game, { type, to })).not.toThrow();
		});
	}
	const backward = [
		[ActionType.MOVE_ENGINE_1_BACKWARDS_TO_GAIN_3_DOLLARS, 1, 1],
		[ActionType.MOVE_ENGINE_AT_LEAST_1_BACKWARDS_AND_GAIN_3_DOLLARS, 1, 99],
		[ActionType.MOVE_ENGINE_1_BACKWARDS_TO_REMOVE_1_CARD_AND_GAIN_1_DOLLAR, 1, 1],
		[ActionType.MOVE_ENGINE_2_BACKWARDS_TO_REMOVE_2_CARDS, 2, 2],
		[ActionType.MOVE_ENGINE_2_BACKWARDS_TO_REMOVE_2_CARDS_AND_GAIN_2_DOLLARS, 2, 2],
	];
	for (const [type, atLeast, atMost] of backward) {
		it(`performs ${type}`, () => {
			const game = freshGame(2);
			setHand(game, [cattle(CattleType.JERSEY, 1), cattle(CattleType.JERSEY, 1), cattle(CattleType.JERSEY, 1)]);
			game.currentPlayerState().balance = 50;
			game.getRailroadTrack().players[game.currentPlayer] = "10";
			const to = engineTo(game, false, atLeast, atMost);
			arm(game, type);
			expect(() => run(game, { type, to })).not.toThrow();
		});
	}
	it(`performs ${ActionType.PAY_2_DOLLARS_AND_MOVE_ENGINE_2_BACKWARDS_TO_GAIN_2_CERTIFICATES}`, () => {
		const game = freshGame(2);
		game.currentPlayerState().balance = 50;
		game.getRailroadTrack().players[game.currentPlayer] = "10";
		const to = engineTo(game, false, 2, 2);
		arm(game, ActionType.PAY_2_DOLLARS_AND_MOVE_ENGINE_2_BACKWARDS_TO_GAIN_2_CERTIFICATES);
		expect(() => run(game, { type: ActionType.PAY_2_DOLLARS_AND_MOVE_ENGINE_2_BACKWARDS_TO_GAIN_2_CERTIFICATES, to })).not.toThrow();
	});
	it(`performs ${ActionType.MOVE_ENGINE_FORWARD_UP_TO_NUMBER_OF_HAZARDS}`, () => {
		const game = freshGame(2);
		game.currentPlayerState().hazards = [{ type: HazardType.FLOOD, hand: Hand.GREEN, points: 2 }];
		game.getRailroadTrack().players[game.currentPlayer] = "0";
		arm(game, ActionType.MOVE_ENGINE_FORWARD_UP_TO_NUMBER_OF_HAZARDS);
		expect(() => run(game, { type: ActionType.MOVE_ENGINE_FORWARD_UP_TO_NUMBER_OF_HAZARDS, to: "1" })).not.toThrow();
	});
});

describe("Coverage: forward trail moves", () => {
	for (const [type, limit] of [[ActionType.MOVE_1_FORWARD, 1], [ActionType.MOVE_2_FORWARD, 2], [ActionType.MOVE_3_FORWARD, 3], [ActionType.MOVE_4_FORWARD, 4], [ActionType.MOVE_5_FORWARD, 5], [ActionType.MOVE_3_FORWARD_WITHOUT_FEES, 3]]) {
		it(`performs ${type}`, () => {
			const game = freshGame(2);
			const mv = game.possibleMoves(game.currentPlayer).find((m) => m.steps.length <= limit) ?? game.possibleMoves(game.currentPlayer)[0];
			const steps = mv.steps.slice(0, limit);
			arm(game, type);
			expect(() => run(game, { type, steps })).not.toThrow();
		});
	}
});

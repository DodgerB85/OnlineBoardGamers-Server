// Public engine API. Pure: state in, new state out. See PAP/ENGINE_SPEC.md.
import * as C from './cards.js'
import { PAPError, require, log } from './state.js'
import { shuffle } from './rng.js'
import * as setup from './setup.js'
import * as civic from './civic.js'
import * as post from './post.js'
import * as workshop from './workshop.js'
import * as street from './street.js'
import * as audit from './audit.js'

export { PAPError }

// Year stages in order. A stage's enter() either resolves automatically or queues prompts.
export const STAGES = [
	'post.admin', 'post.review', 'post.council', 'post.events', 'post.refresh', 'post.draw', 'post.choices',
	'shift',
	'street.solo', 'street.exchange', 'street.extra', 'street.reoffer', 'street.end',
	'audit.paper', 'audit.condemn', 'audit.spoil', 'audit.auto',
]

const MODULES = [setup, civic, post, workshop, street, audit]
const ENTER = Object.assign({}, ...MODULES.map(m => m.enter || {}))
const ACTIONS = Object.assign({}, ...MODULES.map(m => m.actions || {}))

export function createGame(seed, names, options = {}) {
	require(names.length >= 2 && names.length <= 5, 'Permits & Poisons needs 2-5 players')
	const s = {
		v: 1, rng: seed >>> 0, serial: 0, year: 1, phase: 'setup', stage: -1, queue: [],
		options: { softerEnding: !!options.softerEnding, rulesVersion: options.rulesVersion ?? 2 },
		first: 0, order: names.map((_, i) => i), watch: null, administered: null,
		players: names.map((name, seat) => ({
			name, seat, cash: C.START_CASH, recognized: 0, yearStartRecognized: 0, yearEarned: 0,
			hype: 0, lockedHype: 0, reputation: 0, warnings: 0, tier: 1, tierAtY7Start: 1,
			ingredients: { crystal: 0, toad: 0, quick: 0, banshee: 0 },
			recipes: [], staff: [], potions: [], hand: [], dispensations: [], apparatus: [], testimonials: [],
			seals: [], franchise: false, upgradedThisYear: false, sales: [], levyOwed: 0,
			exchangesEntered: 0, desperateVolume: 0, usedOnce: {}, everEmployed: 0,
		})),
		venues: [], council: { open: [], review: null },
		decks: {}, yearFx: { scare: null }, exchange: null, lastStreet: { salesByVenue: {} },
		log: [], result: null,
	}
	setup.initialise(s, shuffle)
	advance(s)
	return s
}

export function currentPrompt(s) {
	return s.queue[0] || null
}

// The seat whose input the game is waiting for, or null when the game is over.
export function activeSeat(s) {
	return s.queue[0] ? s.queue[0].seat : null
}

export function applyAction(state, seat, action) {
	const prompt = currentPrompt(state)
	require(prompt, 'The game is over')
	require(prompt.seat === seat, 'It is not your turn')
	const handlers = ACTIONS[prompt.step]
	const handler = handlers && handlers[action.type]
	require(handler, 'Action ' + action.type + ' is not allowed now')
	const s = structuredClone(state)
	// Handlers return true when the prompt is finished; otherwise the same seat keeps acting.
	if (handler(s, seat, action, s.queue[0])) s.queue.shift()
	advance(s)
	return s
}

// Run automatic stages until some seat must decide, or the game ends.
export function advance(s) {
	while (s.queue.length === 0 && s.phase !== 'over') {
		if (s.phase === 'setup') {
			setup.finish(s, shuffle)
			s.stage = -1
		}
		s.stage += 1
		if (s.stage >= STAGES.length) s.stage = 0
		const name = STAGES[s.stage]
		s.phase = name.split('.')[0]
		const enter = ENTER[name]
		if (!enter) throw new PAPError('No handler for stage ' + name)
		enter(s, shuffle)
		if (s.result) {
			s.phase = 'over'
			s.queue = []
			log(s, null, 'gameOver', {})
		}
	}
}

export function legalActionTypes(s, seat) {
	const prompt = currentPrompt(s)
	if (!prompt || prompt.seat !== seat) return []
	return Object.keys(ACTIONS[prompt.step] || {})
}

export function replay(seed, names, options, actions) {
	let s = createGame(seed, names, options)
	for (const { seat, a } of actions) s = applyAction(s, seat, a)
	return s
}

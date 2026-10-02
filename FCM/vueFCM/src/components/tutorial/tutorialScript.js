/**
 * The FCM tutorial script.
 *
 * Read this file top to bottom and you have read the whole tutorial: what is
 * said, what is highlighted, and what has to happen before the next step.
 *
 * Step kinds
 *   talk   narration only. Waits for the user to press Next. Never auto-skipped,
 *          so an explanation always gets read even if the game blew past it.
 *   act    whoever is up acts, and the step completes when the game has moved
 *          past `at`. If it is FcmTutor's go, the engine plays one subphase of
 *          their turn per tick and shows their commentary, so the same step
 *          covers "you go first" and "FcmTutor goes first" phases without the
 *          script having to know which is which. (It does differ per phase: the
 *          tutor goes first during Setup Reserve and Turn Order.)
 *   tutor  like `act`, but framed as "watch FcmTutor's turn" with the commentary
 *          log as the main thing on screen.
 *   finish end of tutorial.
 *
 * `at(s, ctx)` - the boundary. s is the state snapshot built by FcmTutorial.js;
 * ctx.turn is the game turn at the moment this step became active (only needed
 * for steps that span a turn boundary). If `at` is already true when the step
 * becomes active the step is skipped - that is deliberate, and it is how the
 * tutorial survives subphases the game auto-skips for you.
 *
 * panel    CSS selector for the bit of UI to spotlight
 * squares  (s) => [board square indexes] to pulse in orange
 *
 * NB prose is English-only for now; it is not wired through i18n.
 */

import * as rf from "../../js/FCMreference"

const IN_WORKING_DAY = (s) => s.phase === rf.PHASE_WORKING_DAY

// "I have moved past subphase X" - works whether or not the player did anything,
// and works even if X was auto-skipped entirely.
const leftSubphase = (x) => (s) => !IN_WORKING_DAY(s) || s.subphase > x
const leftPhase = (x) => (s) => s.phase !== x

// FcmTutor has finished their whole working day: we are back in a working day,
// it is the player's go, and we are at least one turn further on than when the
// step started. tutorialScript.test.js guards this one.
const tutorDayDone = (s, ctx) => IN_WORKING_DAY(s) && s.myTurn && s.turn > ctx.turn

// Between turns there is a Restructuring and a Turn Order before the next working
// day. True once we are back in one, so a single step can cover both.
const betweenTurnsDone = (s) => s.phase !== rf.PHASE_RESTRUCTURING && s.phase !== rf.PHASE_TURN_ORDER

// The user has placed their restaurant. NB this cannot be "the phase is over" -
// the phase is not over until the TUTOR has placed too, and the tutor cannot act
// until the player presses End Turn, so a phase-based boundary here deadlocks.
const userPlaced = (s) => s.me.restaurants.length > 0

export const STEPS = [
	// ---------------------------------------------------------------- welcome
	{
		id: "welcome",
		kind: "talk",
		say: "Welcome to Food Chain Magnate. You are playing against FcmTutor, who takes a real turn and explains every move they make.",
	},
	{
		id: "goal",
		kind: "talk",
		say: "The goal is simple: whoever has the most cash when the game ends wins. You get cash by running restaurants, and restaurants need houses, houses need roads, and roads need trucks. This tutorial walks you through two full turns.",
	},

	// ------------------------------------------------------------- restaurant
	{
		id: "placeResto",
		kind: "act",
		panel: "#mapTilesDiv",
		say: (s) => `Place your restaurant. Rotate with the R key or the two arrows around the preview above the board, then click an orange square - it has to be a 2x2 block touching a road. There are ${s.legalHighlights.length} to choose from.`,
		squares: (s) => s.legalHighlights,
		at: (s) => userPlaced(s) || leftPhase(rf.PHASE_SETUP_RESTAURANT1)(s),
	},
	{
		id: "endTurnResto",
		kind: "act",
		panel: "#actionAreaDiv",
		say: "Placing the restaurant is only half of it - the phase does not end until you press End Turn. Do that now and FcmTutor can place theirs.",
		at: leftPhase(rf.PHASE_SETUP_RESTAURANT1),
	},

	// ------------------------------------------------------------ reserve card
	{
		id: "reserveIntro",
		kind: "talk",
		panel: "#actionAreaDiv",
		say: "Reserve cards. You get one, you keep it for the whole game, and it only pays out if the game ends while it is still in reserve. Treat it as a lottery ticket, not an income. FcmTutor picks first this phase - watch what they do.",
	},
	{
		id: "reservePick",
		kind: "act",
		panel: "#actionAreaDiv",
		say: "Now pick yours. There is no wrong answer - it is a one-off and you will not see it again.",
		at: leftPhase(rf.PHASE_SETUP_RESERVE),
	},

	// -------------------------------------------------------------- turn order
	{
		id: "turnOrderIntro",
		kind: "talk",
		panel: "#listDiv",
		say: "Turn order. Every player picks a slot each turn, and the slot decides when you act next turn. Going first means you get first pick of employees but get paid last, so it is a real decision, not a formality. FcmTutor picks first again.",
	},
	{
		id: "turnOrderPick",
		kind: "act",
		panel: "#listDiv",
		say: "Take the last free slot so you play before FcmTutor in the working day. It makes the rest of the tutorial easier to follow.",
		at: leftPhase(rf.PHASE_TURN_ORDER),
	},

	// ================================================================ TURN ONE
	{
		id: "turn1Intro",
		kind: "talk",
		say: "Turn 1. The working day is a fixed sequence of subphases and you go through all of them before passing the turn. Any subphase you have nobody for is skipped automatically - that is normal, not a bug, and you will see it happen below.",
	},
	{
		id: "hire1",
		kind: "act",
		panel: "#listDiv",
		say: (s) => `Hiring. You have ${s.recruitPoints} recruiting point${s.recruitPoints === 1 ? "" : "s"} and every hire costs one, so exactly ${s.recruitPoints === 1 ? "one person" : `${s.recruitPoints} people`}. Hires land on your beach - they do not start work today.`,
		at: leftSubphase(rf.SUBPHASE_HIRING),
	},
	{
		id: "train1",
		kind: "act",
		panel: "#listDiv",
		say: (s) => `Training. ${s.trainingPoints > 0 ? "Spend the points turning a trainee into a real employee." : "You have no training points and nothing worth training, so this skips itself. Training points come from a Trainer or a Coach in your structure."}`,
		at: leftSubphase(rf.SUBPHASE_TRAINING),
	},
	{
		id: "market1",
		kind: "talk",
		panel: "#actionAreaDiv",
		say: "Marketing. A marketer puts an advertising campaign on the board. It sits there all turn and only scores at Dinnertime, against the houses it can reach. You have no marketer yet, so this subphase skips itself - notice that it did.",
	},
	{
		id: "produce1",
		kind: "talk",
		panel: "#actionAreaDiv",
		say: "Producing. Your cooks and drivers make food and drinks into the fridge. You have no producers yet either. The thing worth remembering: food is not on the board, it is in the fridge, and only ten items fit.",
	},
	{
		id: "houses1",
		kind: "talk",
		panel: "#actionAreaDiv",
		say: "Building houses. A New Business Developer puts houses on empty road-side squares. You do not have one yet. Houses are what your campaigns will eventually sell to, so a developer is slow but steady money.",
	},
	{
		id: "endTurn1",
		kind: "act",
		panel: "#actionAreaDiv",
		say: "That is your whole working day. Press End Turn and hand over to FcmTutor.",
		at: leftPhase(rf.PHASE_WORKING_DAY),
	},
	{
		id: "tutorDay1",
		kind: "tutor",
		say: "FcmTutor's turn. Watch what they do with their points.",
		at: tutorDayDone,
	},

	// ============================================================ BETWEEN TURNS
	{
		id: "dinnerTime",
		kind: "talk",
		say: "Dinnertime. Every campaign on the board now tries to sell to the houses it can reach. The marketer with the best result wins the house and the rest go home with nothing. This is where marketing actually pays out.",
	},
	{
		id: "campaigns",
		kind: "talk",
		say: "Then all the campaigns are cleared off the board. Next turn starts with a clean map, but the houses they won stay yours.",
	},
	{
		id: "payday",
		kind: "talk",
		say: "Payday. Everyone who demands a salary has to be paid, in cash or in food. If you cannot pay you fire them, and firing is usually worse than paying. Nobody here has a salary yet, so this passes straight through.",
	},
	{
		id: "cleanUp",
		kind: "talk",
		say: "Clean-up. You can keep ten items in the fridge and anything over that goes in the bin. Resources you keep are resources you can use next turn to pay salaries with.",
	},
	{
		id: "restructure2",
		kind: "act",
		panel: "#listDiv",
		say: "Restructuring again. This is where the beach becomes real: anyone you recruited goes into a working slot now, and the top three slots are your executives, who open up extra slots underneath them. Nobody is on the beach yet, so just press Done.",
		at: betweenTurnsDone,
	},
	{
		id: "turn2Intro",
		kind: "talk",
		say: "Turn 2. You should have picked up an extra recruiting point somewhere, and FcmTutor now has a Recruiting Girl of their own. This is the turn where things start moving. The rest is condensed so you can see a whole turn go by quickly.",
	},

	// ================================================================ TURN TWO
	{
		id: "hire2",
		kind: "act",
		panel: "#listDiv",
		say: (s) => `Hiring again - ${s.recruitPoints} point${s.recruitPoints === 1 ? "" : "s"} this time. An Errand Boy is a good second hire: they collect drinks from the road.`,
		at: leftSubphase(rf.SUBPHASE_HIRING),
	},
	{
		id: "train2",
		kind: "act",
		panel: "#listDiv",
		say: (s) => (s.trainingPoints > 0 ? "Training. Spend your points turning a trainee into something useful - a Marketing Trainee becomes a Campaign Manager, for example." : "Training. Nothing to train yet."),
		at: leftSubphase(rf.SUBPHASE_TRAINING),
	},
	{
		id: "market2",
		kind: "act",
		panel: "#actionAreaDiv",
		say: "Marketing. If you have a marketer, pick a campaign and a food, then click a square on the board near houses. If you do not have one this skips and there is nothing to do.",
		squares: (s) => s.legalHighlights,
		at: leftSubphase(rf.SUBPHASE_MARKETING),
	},
	{
		id: "produce2",
		kind: "act",
		panel: "#mapTilesDiv",
		say: "Producing. Click a producer, then click the highlighted squares to drive out and collect whatever is within range. The closer your route runs to your restaurants, the more you pick up.",
		squares: (s) => s.legalHighlights,
		at: leftSubphase(rf.SUBPHASE_PRODUCE),
	},
	{
		id: "houses2",
		kind: "act",
		panel: "#mapTilesDiv",
		say: "Building. Pick a house from the list, then click an orange block next to a road. A garden goes on a house already on the board instead, which is quicker.",
		squares: (s) => s.legalHighlights,
		at: leftSubphase(rf.SUBPHASE_HOUSES),
	},
	{
		id: "endTurn2",
		kind: "act",
		panel: "#actionAreaDiv",
		say: "End your turn and let FcmTutor finish theirs.",
		at: leftPhase(rf.PHASE_WORKING_DAY),
	},
	{
		id: "tutorDay2",
		kind: "tutor",
		say: "FcmTutor's second turn.",
		at: tutorDayDone,
	},

	// ==================================================================== FINISH
	{
		id: "done",
		kind: "talk",
		say: "That is two full turns: setup, a working day, Dinnertime, campaigns, Payday and Clean-up, then all of it again with more money in play. That is the entire game loop. Everything after this is the same loop with more tiles, more expansions and harder decisions.",
	},
	{
		id: "handover",
		kind: "finish",
		say: "The tutorial is over, so take over both sides: you are now playing both you and FcmTutor, hotseat style, and you can keep going as long as you like. Nothing was saved - refreshing the page will start a fresh tutorial.",
	},
]
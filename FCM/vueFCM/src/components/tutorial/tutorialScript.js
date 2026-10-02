/**
 * The FCM tutorial script.
 *
 * Read this file top to bottom and you have read the whole tutorial: what is
 * said, what is highlighted, and what has to happen before the next step.
 *
 * Explanations are checked against the official rulebook, which is stored in this
 * repo at FCM/static/FCM/rules/FoodChainMagnate_rules.pdf and linked from
 * FCM/templates/FCM/FCMhelp.html. Keep them consistent with it.
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
		say: "You run fast food chains on a map of houses and roads. Advertise, sell the food, and the cash piles up. You win by holding the most cash when the bank runs out of money for the second time - so the aim is to keep the bank broke, not to build a big company.",
	},

	// ------------------------------------------------------------- restaurant
	{
		id: "placeResto",
		kind: "act",
		panel: "#mapTilesDiv",
		say: (s) => `Place your first restaurant. Rotate with the R key or the two arrows around the preview above the board, then click an orange square. It must sit on empty squares and its entrance must border a road. There are ${s.legalHighlights.length} to choose from.`,
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
		say: "Reserve cards. You chose three and now pick one to put face down next to the bank - the other two are discarded unseen. The values are added to the bank when it first runs dry, so a higher card buys you a longer game. The cards also show open slot counts, and whichever number appears most often becomes how many cards every CEO can hold for the rest of the game. Holding the card itself earns you nothing. FcmTutor picks first in this phase - watch them.",
	},
	{
		id: "reservePick",
		kind: "act",
		panel: "#actionAreaDiv",
		say: "Now pick yours. Higher value means the bank lasts longer, which means more turns to earn in - so take the biggest one you like.",
		at: leftPhase(rf.PHASE_SETUP_RESERVE),
	},

	// -------------------------------------------------------------- turn order
	{
		id: "turnOrderIntro",
		kind: "talk",
		panel: "#listDiv",
		say: "Turn order. You all re-pick your position on the turn order track each turn. Whoever has the most unused slots in their company chooses first, and where you sit decides when you act. Going first means first pick of employees, but you are paid last. FcmTutor chooses first this phase.",
	},
	{
		id: "turnOrderPick",
		kind: "act",
		panel: "#listDiv",
		say: "Take the remaining slot, so you play before FcmTutor in the working day. It makes the rest of the tutorial easier to follow.",
		at: leftPhase(rf.PHASE_TURN_ORDER),
	},

	// ================================================================ TURN ONE
	{
		id: "turn1Intro",
		kind: "talk",
		say: "Turn 1. The working day runs 9:00 to 5:00 and you go through the same fixed steps in the same order every time: recruit, train, start campaigns, get food and drinks, build houses, then place or move restaurants. Any step you have nobody for is skipped automatically - that is normal, not a bug, and you will see it happen below.",
	},
	{
		id: "hire1",
		kind: "act",
		panel: "#listDiv",
		say: (s) => `Recruiting. Your CEO gives one free recruitment every turn, and every recruitment card in your structure adds one more - a Recruiting Girl is one, a Recruiting Manager two, the HR Director four. You have ${s.recruitPoints} this turn, and each hire costs one, so exactly one person. New hires go onto your beach; they do not start work today.`,
		at: leftSubphase(rf.SUBPHASE_HIRING),
	},
	{
		id: "train1",
		kind: "act",
		panel: "#listDiv",
		say: (s) => `Training. ${s.trainingPoints > 0 ? "Spend a training action turning a trainee into a real employee." : "You have no Trainer, Coach or Guru, so you have no training actions at all - this skips itself. Only cards on your beach can be trained, and a card lists its own training options on its face."}`,
		at: leftSubphase(rf.SUBPHASE_TRAINING),
	},
	{
		id: "market1",
		kind: "talk",
		panel: "#actionAreaDiv",
		say: "Marketing. A marketer puts an advertising campaign on the board, advertising one food or drink. It does not sell anything itself - in its own phase after Dinnertime it puts demand tokens on the houses it can reach, and those houses then come out to eat. You have no marketer yet, so this subphase skips itself - notice that it did.",
	},
	{
		id: "produce1",
		kind: "talk",
		panel: "#actionAreaDiv",
		say: "Food and drinks. Your kitchen staff take food from the general stock, and your cart, truck and zeppelin pick up drinks printed on the map. Whatever you make sits in front of you and is available to every restaurant in your chain - it is not on the board, and it does not travel anywhere. You have nobody who makes anything yet, so this skips too.",
	},
	{
		id: "houses1",
		kind: "talk",
		panel: "#actionAreaDiv",
		say: "Building houses. A New Business Developer puts houses on empty squares. Two things to know: a house must be connected to a road, but there is no range limit at all, and you may choose which house to place. Houses are what your campaigns will eventually create demand on, so a developer is slow but very steady money.",
	},
	{
		id: "endTurn1",
		kind: "act",
		panel: "#actionAreaDiv",
		say: "That is your working day. Press End Turn and hand over to FcmTutor.",
		at: leftPhase(rf.PHASE_WORKING_DAY),
	},
	{
		id: "tutorDay1",
		kind: "tutor",
		say: "FcmTutor's turn. Watch what they do with their actions.",
		at: tutorDayDone,
	},

	// ============================================================ BETWEEN TURNS
	{
		id: "dinnerTime",
		kind: "talk",
		say: "Phase 4, Dinnertime. It is evening and the houses that have demand tokens go out to eat. A chain can only serve them if it has the right goods and a road connection to the house. Between chains the inhabitants go to the lowest price plus distance - each tile border you cross costs a step. Nobody decides anything here; it is all worked out.",
	},
	{
		id: "payday",
		kind: "talk",
		say: "Phase 5, Payday. Fire whoever you want, then pay $5 for every card in your structure or on your beach that carries a salary. You can never go negative - anyone you cannot afford simply goes, and the only one you are forced to keep is a marketeer you have already sent out. Unused recruitment actions from a Recruiting Manager or HR Director come off as $5 each.",
	},
	{
		id: "campaigns",
		kind: "talk",
		say: "Phase 6, Marketing Campaigns. This is where campaigns actually fire, lowest number first, dropping a demand token on each house they reach. Each house can only hold three - five if it has a garden - so a campaign that lands on a full house does nothing at all. A campaign runs for as long as its tokens last and can never be ended early.",
	},
	{
		id: "cleanUp",
		kind: "talk",
		say: "Phase 7, Clean-up. Every card comes back out of your structure and off your beach, and a drive-in flips over to open. Without the first-to-throw-away milestone you have to bin all your food and drinks; with it you get a freezer that holds ten tokens for future turns.",
	},
	{
		id: "restructure2",
		kind: "act",
		panel: "#listDiv",
		say: "Restructuring. Your CEO is at the top and holds up to three cards. Those can be managers, and each manager opens its own row of slots underneath - between two and ten, printed on the card. Cards under a manager must be normal staff; managers cannot report to other managers. Anyone still on the beach is working for nobody, so they get moved in. Nobody is on the beach yet, so just press Done.",
		at: betweenTurnsDone,
	},
	{
		id: "turn2Intro",
		kind: "talk",
		say: "Turn 2. You should have picked up an extra recruitment from somewhere, and FcmTutor now has a Recruiting Girl of their own. This is where things start moving. The rest is condensed so you can watch a whole turn go by.",
	},

	// ================================================================ TURN TWO
	{
		id: "hire2",
		kind: "act",
		panel: "#listDiv",
		say: (s) => `Recruiting again - ${s.recruitPoints} action${s.recruitPoints === 1 ? "" : "s"} this time. An Errand Boy is a good second hire: they bring you one drink a turn straight from the stock.`,
		at: leftSubphase(rf.SUBPHASE_HIRING),
	},
	{
		id: "train2",
		kind: "act",
		panel: "#listDiv",
		say: (s) => (s.trainingPoints > 0 ? "Training. Spend an action turning a trainee into something useful - a Marketing Trainee becomes a Campaign Manager, for example. In general you cannot train the same person twice in one turn." : "Training. Nothing to train yet."),
		at: leftSubphase(rf.SUBPHASE_TRAINING),
	},
	{
		id: "market2",
		kind: "act",
		panel: "#actionAreaDiv",
		say: "Marketing. If you have a marketer, pick a campaign, pick the food or drink it advertises, then click a square on the board near houses. If you do not have one this skips and there is nothing to do.",
		squares: (s) => s.legalHighlights,
		at: leftSubphase(rf.SUBPHASE_MARKETING),
	},
	{
		id: "produce2",
		kind: "act",
		panel: "#mapTilesDiv",
		say: "Food and drinks. Click a kitchen staffer to take from the stock, or click a cart operator and then click highlighted squares to drive a route along the roads - the cart reaches two tiles and lifts two drinks off every drink symbol it passes, straight beside the road. No U-turns, and it does not have to get back.",
		squares: (s) => s.legalHighlights,
		at: leftSubphase(rf.SUBPHASE_PRODUCE),
	},
	{
		id: "houses2",
		kind: "act",
		panel: "#mapTilesDiv",
		say: "Building. Pick a house from the list, then click an empty block connected to a road. A garden is the cheaper option - it goes on a house already printed on a map tile, touches it along two squares so the pair forms a 2x3 rectangle, and a house with a garden earns double the unit price.",
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
		say: "That is the whole game loop, twice: set up, a working day of recruit, train, market, produce, build, then Dinnertime, Payday, the campaigns firing, and Clean-up. The bank drains a little every time players earn, and the reserve cards decide how many turns you get before it runs dry for the second time. Everyone's default is to keep the bank broke - that is how you get to play.",
	},
	{
		id: "handover",
		kind: "finish",
		say: "The tutorial is over, so take over both sides: you are now playing both you and FcmTutor, hotseat style, and you can keep going as long as you like. Nothing was saved - refreshing the page will start a fresh tutorial.",
	},
]
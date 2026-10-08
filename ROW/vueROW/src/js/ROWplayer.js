/**
 * ROW player helpers. Mirrors the role of FCMplayer / RNB player modules.
 */
import { isCattleCard, isObjectiveCard } from "./ROWcore"
import { ActionType } from "./ROWreference"
import { useModelStore } from "../stores/ROWstore"
import { usePersonalStore } from "../stores/ROWpersonal"

export function playerState(name) {
	return useModelStore().getGame().playerState(name)
}

export function playerColour(name) {
	const g = useModelStore().game
	const p = g?.state.players.find((pl) => pl.name === name)
	return p ? p.color.toLowerCase() : "red"
}

/** Order players with the viewer's own seat first (matching the reference layout). */
export function boardPlayersOrder() {
	const store = useModelStore()
	const personal = usePersonalStore()
	const g = store.game
	if (!g) return []
	const order = g.state.playerOrder.length ? g.state.playerOrder : g.state.players.map((p) => p.name)
	const me = order.find((n) => n === personal.name) ?? order[0]
	return [me, ...order.filter((n) => n !== me)]
}

/** Whether a card can be selected with the currently chosen card action. */
export function canSelectCard(hand, card, selectedAction) {
	if (!selectedAction) return false
	const cattle = isCattleCard(card)
	switch (selectedAction) {
		case ActionType.DISCARD_CARD:
		case ActionType.REMOVE_CARD:
		case ActionType.UPGRADE_SIMMENTAL:
			return true
		case ActionType.DISCARD_1_OBJECTIVE_CARD_TO_GAIN_2_CERTIFICATES:
		case ActionType.PLAY_OBJECTIVE_CARD:
			return isObjectiveCard(card)
		case ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_3_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND:
		case ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_6_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND:
		case ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_1_CERTIFICATE:
		case ActionType.DISCARD_CATTLE_CARD_TO_GAIN_7_DOLLARS:
			return cattle
		case ActionType.DISCARD_PAIR_TO_GAIN_3_DOLLARS:
		case ActionType.DISCARD_PAIR_TO_GAIN_4_DOLLARS:
			return cattle && hand.filter(isCattleCard).filter((c) => c.type === card.type).length > 1
		default:
			return false
	}
}

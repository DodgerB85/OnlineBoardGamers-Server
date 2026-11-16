import * as rf from './FCMreference'
import * as rules from './FCMrules'
import * as model from './FCMmodel'
import * as plyr from './FCMplayer'
import * as funcs from './FCMfuncs'
import * as controller from './FCMcontroller'
import * as context from './FCMcontext'
import * as map from './FCMmap'
import { useModelStore } from '../stores/FCMstore'

export const modern = () => useModelStore().mediaLine.rulesVersion === 1
export const isPhone = number => rf.PHONE_CAMPAIGNS.includes(number)
export const groupOf = number => Math.floor((number - 30) / 3)
export const groupCards = group => [30 + group * 3, 31 + group * 3, 32 + group * 3]
export const pending = () => modern() && useModelStore().context.phoneGroupAction !== null && useModelStore().context.phoneGroupAction !== undefined
export function availableGroups(availability) {
 const s = useModelStore()
 return [0,1,2,3].filter(g => !s.mediaLine.phoneGroups[g] && groupCards(g).every(n=>availability.includes(n))).map(g=>groupCards(g)[0])
}
export function reserve(number, owner, marketer, good, duration) {
 const s = useModelStore(), group = groupOf(number)
 s.mediaLine.phoneGroups[group] = { owner, marketer, good, duration, cards: [] }
 s.availableMarketingCampaigns = s.availableMarketingCampaigns.filter(n=>!groupCards(group).includes(n))
 return s.mediaLine.phoneGroups[group]
}
// Input is the clicked origin. Storage/history retain the original top-left + boolean schema.
export function footprint(index, rotation) {
 if (!Number.isInteger(index) || !Number.isInteger(rotation) || rotation < 0 || rotation > 3) return null
 const [x,y] = map.giveCoord(index), [dx,dy] = [[1,0],[0,1],[-1,0],[0,-1]][rotation]
 if (x < 0 || y < 0 || x >= rf.ssW || y >= rf.ssH || x+dx < 0 || x+dx >= rf.ssW || y+dy < 0 || y+dy >= rf.ssH) return null
 return {index: map.giveIndex(x+Math.min(dx,0),y+Math.min(dy,0)), rotated: rotation%2 === 1, cells:[index,map.giveIndex(x+dx,y+dy)]}
}
export function legalOrientations(marketer, number) {
 return [0,1,2,3].map(rotation => ({rotation, rotated: rotation%2===1, positions: rules.givePossiblePositionsForMarketingCampaign(marketer,number,rotation%2===1,rotation)}))
}
// Per-step legal positions, never a global packing/optimal-layout solver.
export function place(index) {
 const s = useModelStore(), c = s.context, owner = controller.currentPlayerIndex()
 const number = c.campaign, group = groupOf(number), action = c.phoneGroupAction
 if (!Number.isInteger(number) || !isPhone(number) || !Number.isInteger(index) || typeof c.rotated !== 'boolean') return false
 const goods = [rf.LEMONADE,rf.COKE,rf.BEER,rf.PIZZA,rf.BURGER]
 if (s.startingOptions.friedChicken && plyr.hasMilestone(owner,rf.FIRST_FRIED_CHICKEN_SOLD)) goods.push(rf.FRIED_CHICKEN)
 if (!Number.isInteger(c.good) || !goods.includes(c.good) || !Number.isInteger(c.duration) || c.duration < 1 || c.duration > 3 || c.secondGood !== -1) return false
 if (action) {
  const lock = s.mediaLine.phoneGroups[action.group]
  if (!lock || action.group !== group || lock.owner !== owner || lock.marketer !== c.marketer || lock.good !== c.good || lock.duration !== c.duration || number !== groupCards(group)[lock.cards.length]) return false
 } else if (!availableGroups(s.availableMarketingCampaigns).includes(number) || !s.players[owner].employees.includes(c.marketer) || !rules.allowedCampaigns(c.marketer).includes(rf.PHONE)) return false
 if (!rules.givePossiblePositionsForMarketingCampaign(c.marketer,number,c.rotated,c.rotation).includes(index)) return false
 const placed = footprint(index,c.rotation)
 if (!placed || placed.rotated !== c.rotated) return false
 const first = !action
 // All checks above precede any mutation, including group/employee consumption.
 const lock = first ? reserve(number,owner,c.marketer,c.good,c.duration) : s.mediaLine.phoneGroups[group]
 if (first) {
  plyr.sendPlayerMarketerToMarket(owner,c.marketer,number,false,false)
 }
 model.addMarketingCampaign(number,placed.index,placed.rotated,c.good,c.duration)
 c.endOfDaySummaryData.market.marketed.push(number)
 lock.cards.push(number)
 const data = [number,funcs.exportIndex(placed.index),c.good,funcs.booleanToInt(placed.rotated),c.duration]
 if (!first) data.push(1)
 if (c.marketer !== rf.TELEMARKETER) data.push([c.marketer])
 model.addHistory(rf.HIST_START_MARKETING_CAMPAIGN,data,owner,0)
 rules.giveMarketingMilestones(owner,c.marketer)
 // Preserve independent first-good milestones.
 if (c.good === rf.BURGER) plyr.awardMilestone(owner,rf.FIRST_BURGER_MARKETED)
 else if (c.good === rf.PIZZA) plyr.awardMilestone(owner,rf.FIRST_PIZZA_MARKETED)
 else if (rf.DRINK.includes(c.good)) plyr.awardMilestone(owner,rf.FIRST_DRINK_MARKETED)
 c.justMarketed.push(number)
 context.clearAllHighlights()
 const next = groupCards(group)[lock.cards.length]
 const choices = next === undefined ? [] : legalOrientations(c.marketer,next)
 const choice = choices.find(o=>o.rotation === c.rotation && o.positions.length) || choices.find(o=>o.positions.length)
 if (choice) {
  c.phoneGroupAction = {group}; c.mediaLineSecondCall = true
  c.campaign = next; c.campaigns = [next]; c.rotated = choice.rotated; c.rotation = choice.rotation
  s.highlights.indexesToHighlightYellow = choice.positions
 } else {
  c.phoneGroupAction = null; c.mediaLineSecondCall = false
  controller.resetMarketingSelection()
 }
 return true
}
export function autoPlace(marketer, number, good, duration) {
 controller.selectMarketer(marketer,false)
 controller.chooseCampaign(number)
 controller.chooseGood(good)
 controller.chooseDuration(duration)
 let count=0
 const s=useModelStore()
 do {
  const choice=legalOrientations(s.context.marketer,s.context.campaign).find(o=>o.positions.length)
  if(!choice) break
  s.context.rotation=choice.rotation; s.context.rotated=choice.rotated
  if(!place(choice.positions[0])) break
  count++
 } while(pending() && count<3)
 return count
}

export function replayPlacement(owner, input) {
 const s=useModelStore(), param=[...input]
 const last=param.at(-1), marketer=Array.isArray(last)?last[0]:rf.TELEMARKETER
 if (Array.isArray(last) && last.length !== 1) throw new TypeError('Invalid phone marketer history')
 if(Array.isArray(last)) param.pop()
 const [number,wireIndex,good,rotation,duration,chain]=param, group=groupOf(number)
 const lock=s.mediaLine.phoneGroups[group]
 const index=Number.isInteger(wireIndex) ? funcs.importIndex(wireIndex) : -1
 if(wireIndex<0||index<0||index>=rf.ssW*rf.ssH||![rf.LEMONADE,rf.COKE,rf.BEER,rf.PIZZA,rf.BURGER,rf.FRIED_CHICKEN].includes(good)) throw new TypeError('Invalid phone history fields')
 if(!Number.isInteger(owner)||!s.players[owner]||!Number.isInteger(wireIndex)||!Number.isInteger(good)||![0,1].includes(rotation)||!Number.isInteger(duration)||duration<1||duration>3||![rf.TELEMARKETER,rf.TV_ANNOUNCER,rf.BRAND_DIRECTOR].includes(marketer)||![5,6].includes(param.length)) throw new TypeError('Invalid phone history')
 if(lock) {
  if(chain!==1||lock.owner!==owner||lock.marketer!==marketer||lock.good!==good||lock.duration!==duration||number!==groupCards(group)[lock.cards.length]) throw new TypeError('Invalid phone history chain')
 } else if(chain!==undefined||!availableGroups(s.availableMarketingCampaigns).includes(number)||!s.players[owner].employees.includes(marketer)) throw new TypeError('Invalid first phone history')
 const entry=lock||reserve(number,owner,marketer,good,duration)
 if(!lock) plyr.sendPlayerMarketerToMarket(owner,marketer,number,false,false)
 model.addMarketingCampaign(number,index,rotation===1,good,duration)
 entry.cards.push(number)
}

// Called after removal. Keep all cards/one employee locked until the final token expires.
export function recall(number) {
 const s = useModelStore(), group = groupOf(number), lock = s.mediaLine.phoneGroups[group]
 if (!lock) return false
 if (s.campaigns.some(c=>groupCards(group).includes(c.number))) return true
 const p = s.players[lock.owner]
 const i = p.marketers.findIndex(m=>groupCards(group).includes(m.campaign))
 if (i !== -1) { p.marketers.splice(i,1); p.beach.push(lock.marketer); if (p.additionalCampaignArrayIndex > i) p.additionalCampaignArrayIndex-- }
 for (const n of groupCards(group)) if (!s.availableMarketingCampaigns.includes(n)) s.availableMarketingCampaigns.push(n)
 s.availableMarketingCampaigns.sort((a,b)=>a-b)
 delete s.mediaLine.phoneGroups[group]
 return true
}

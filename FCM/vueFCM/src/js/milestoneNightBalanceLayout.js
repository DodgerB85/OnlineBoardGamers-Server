import * as rf from './FCMreference.js'
import { isBalancedNightShiftEnabled } from './milestoneNightBalance.js'

// Resource presentation only: never change supply, economic levels or training rules.
export function employeeLayout(options, availableEmployees) {
 const arrangement = [...rf.EMPLOYEE_ARRANGEMENT]
 if (!options.seniorBusinessDeveloper) {
  arrangement.splice(0, 5)
  arrangement[1] = rf.NEW_BUSINESS_DEVELOPER
 }
 const jazzSlot = options.seniorBusinessDeveloper ? 66 : 61
 if (availableEmployees[rf.B_MOVIE_STAR] < 0 && availableEmployees[rf.JAZZ_MUSICIAN] >= 0) {
  arrangement[jazzSlot] = rf.JAZZ_MUSICIAN
  arrangement[jazzSlot + 15] = -1
 }
 if (isBalancedNightShiftEnabled(options)) {
  arrangement[arrangement.indexOf(rf.NIGHT_SHIFT_MANAGER)] = -1
  const managerRow = Math.floor(arrangement.indexOf(rf.JUNIOR_VICE_PRESIDENT) / 5)
  arrangement.splice((managerRow + 1) * 5, 0, -1, -1, rf.NIGHT_SHIFT_MANAGER, -1, -1)
 }
 for (let i = 0; i < arrangement.length; i++) {
  const id = arrangement[i]
  if (id === rf.TEMPORARY_WORKER) {
   if (!options.laborMarket) arrangement[i] = -1
  } else if (id === rf.NIGHT_SHIFT_MANAGER && !options.nightShift) arrangement[i] = -1
  else if (id >= 0 && availableEmployees[id] === -1) arrangement[i] = -1
 }
 const rows = []
 for (let i = 0; i < arrangement.length; i += 5) {
  const row = arrangement.slice(i, i + 5)
  if (row.some(id => id >= 0)) rows.push(row)
 }
 return rows
}

// ID edges, not row offsets: compression must not move an endpoint off its card.
// The board's existing branches are preserved, including Junior VP → VP.
const chains = [
 [5,6,7,8,9], [1,rf.SENIOR_BUSINESS_DEVELOPER], [13,14,15,16], [23,24,25,26],
 [27,28,29], [30,31], [rf.SUSHI_COOK,rf.SUSHI_CHEF],
 [rf.NOODLE_COOK,rf.NOODLE_CHEF], [rf.DUMPLING_COOK,rf.DUMPLING_CHEF],
 [rf.FRIED_CHICKEN_COOK,rf.FRIED_CHICKEN_CHEF], [38,39,40],
 [13,rf.TELEMARKETER,rf.TV_ANNOUNCER,16],
]
const branches = [
 [5,1], [5,rf.HEADHUNTER], [5,11], [6,2], [6,18], [6,21], [6,12],
 [7,3], [7,22], [8,4], [8,19],
 ...[rf.MASS_MARKETEER,rf.RURAL_MARKETEER,rf.GOURMET_FOOD_CRITIC,rf.HAWKER_MARKETEER].map(id=>[13,id]),
 ...[41,42,43,rf.JAZZ_MUSICIAN].map(id=>[0,id]),
 ...[30,rf.SUSHI_COOK,rf.NOODLE_COOK,rf.DUMPLING_COOK,rf.FRIED_CHICKEN_COOK].map(id=>[27,id]),
 [28,rf.FRY_CHEF],
]
export function employeeConnections(rows, options) {
 const positions = new Map()
 rows.forEach((row,r)=>row.forEach((id,c)=>{if(id>=0)positions.set(id,{x:80+c*160,y:165+r*190})}))
 const edges = [...branches, ...chains.flatMap(chain=>chain.slice(1).map((id,i)=>[chain[i],id]))]
 if (isBalancedNightShiftEnabled(options)) edges.push([6,47])
 return edges.flatMap(([from,to])=>{
  const a=positions.get(from), b=positions.get(to)
  if (!a || !b) return []
  const dx=b.x-a.x, dy=b.y-a.y
  return [{type:'path', from, to, d:dy===0 ? `M ${a.x} ${a.y} h ${dx}` : `M ${a.x} ${a.y} h ${dx/2} v ${dy} h ${dx/2}`}]
 })
}

// Historical formatting keeps the old column-delta semantics for all other pairs.
// Accept decoded employee IDs (or -1 for hiring), never raw +50 history sources.
// HistoryEntry owns that decoding; employee IDs >=50 must remain intact here.
export function employeeTrainingSteps(decodedFrom, to, options) {
 if (to === rf.NIGHT_SHIFT_MANAGER && isBalancedNightShiftEnabled(options)) {
  if (decodedFrom === rf.MANAGEMENT_TRAINEE) return 2
  if (decodedFrom === rf.JUNIOR_VICE_PRESIDENT) return 1
 }
 const col = id => rf.EMPLOYEE_ARRANGEMENT.indexOf(id) % 5
 return decodedFrom === -1 ? col(to) : col(to) - col(decodedFrom)
}
// Visual column (1-based), independent of wages/headhunting/global level.
export function employeeDisplayLevel(id, options) {
 if (id === rf.NIGHT_SHIFT_MANAGER && isBalancedNightShiftEnabled(options)) return 3
 return rf.EMPLOYEE_ARRANGEMENT.indexOf(id) % 5 + 1
}


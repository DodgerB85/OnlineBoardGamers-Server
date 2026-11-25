import { beforeAll, afterEach, it, expect } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createRenderer, h, nextTick } from 'vue'
function node(type, text = '') { return { type, text, children: [], props: {}, parent: null } }
const renderer = createRenderer({
 createElement: node, createText: t => node('text', t), createComment: t => node('comment', t),
 setText: (n,t) => { n.text=t }, setElementText: (n,t) => { n.text=t; n.children=[] },
 patchProp: (n,k,_,v) => { n.props[k]=v },
 insert(n,p,a) { if(n.parent)n.parent.children.splice(n.parent.children.indexOf(n),1); const i=a?p.children.indexOf(a):-1;p.children.splice(i<0?p.children.length:i,0,n);n.parent=p },
 remove(n) { if(n.parent)n.parent.children.splice(n.parent.children.indexOf(n),1) },
 parentNode:n=>n.parent, nextSibling:n=>n.parent?.children[n.parent.children.indexOf(n)+1],
})
const text=n=>n.text+n.children.map(text).join('')
const all=(n,p)=>[...(p(n)?[n]:[]),...n.children.flatMap(c=>all(c,p))]
let Top, History, i18n, rf, useModelStore, app, root, store, pinia
beforeAll(async()=>{
 globalThis.window={performance,initData:{KickoutFlexiDataArray:[]}};globalThis.document={addEventListener(){}}
 ;({default:Top}=await import('./TopMenuViews.vue'))
 ;({default:History}=await import('./HistoryEntry.vue'))
 ;({default:i18n}=await import('../i18n.js'))
 rf=await import('../js/FCMreference.js')
 ;({useModelStore}=await import('../stores/FCMstore.js'))
})
afterEach(()=>{app?.unmount();app=null})
function fresh(overrides={}){
 pinia=createPinia();setActivePinia(pinia);store=useModelStore()
 Object.assign(store.startingOptions,{milestoneNightBalance:true,newMilestones:true,useMilestones:true,nightShift:true},overrides)
 store.availableEmployees=Array(70).fill(2);store.availableMilestones=[];store.viewSettings.showReserve=true
 store.players=[{name:'P0',colour:0,milestones:[],resources:[],employees:[],beach:[],marketers:[]}]
 i18n.global.locale.value='en'
}
async function mount(component=Top,props={}){
 root=node('root');app=renderer.createApp({render:()=>h(component,props)});app.use(pinia);app.use(i18n);app.mount(root);await nextTick()
}
const cls=(n,c)=>String(n.props.class||'').split(' ').includes(c)
const cards=()=>all(root,n=>cls(n,'expandedEmployeeAreaDiv'))
const card=id=>cards().find(n=>all(n,c=>c.type==='h3').some(c=>text(c)===rf.EMPLOYEES_STR[id].title))
async function expand(){all(root,n=>n.type==='button'&&text(n).includes(i18n.global.t('topMenuViews.expandEmployees')))[0].props.onClick();await nextTick()}
const rows=()=>all(root,n=>cls(n,'employeeLine'))
function position(id){const c=card(id);const row=c.parent;return [rows().indexOf(row),row.children.filter(n=>n.type==='div').indexOf(c)]}
it('balanced resource card47 moves to its unique third-level branch with real 6→47 SVG',async()=>{
 fresh();await mount();await expand()
 expect(cards().filter(n=>text(n).includes(rf.EMPLOYEES_STR[47].title))).toHaveLength(1)
 const [r,c]=position(47);expect(c).toBe(2)
 const [sr,sc]=position(6)
 const expected=`M ${80+sc*160} ${165+sr*190} h 80 v ${(r-sr)*190} h 80`
 expect(all(root,n=>n.type==='path').map(n=>n.props.d)).toContain(expected)
 expect(position(7)[0]).toBe(sr)
})

it('night off hides card47 even with stale supply, without mutating stock',async()=>{
 fresh({nightShift:false});await mount();expect(text(root)).not.toContain(rf.EMPLOYEES_STR[47].title)
 await expand();expect(card(47)).toBeUndefined();expect(store.availableEmployees[47]).toBe(2)
})
it('stock exhausted zero remains visible and unavailable minus one is removed',async()=>{
 fresh();store.availableEmployees[47]=0;await mount()
 const compact=all(root,n=>cls(n,'empSpan')&&text(n).includes(rf.EMPLOYEES_STR[47].title))[0]
 expect(text(compact)).toContain('(0)');expect(cls(compact,'noMoreEmployees')).toBe(true)
 await expand();expect(text(card(47))).toContain('0')
 store.availableEmployees[47]=-1;await nextTick();expect(card(47)).toBeUndefined()
 expect(store.availableEmployees[47]).toBe(-1)
})

it.each([false,true])('SPEC regression: real in-organisation employee60 to16 stays one step with balance=%s',async milestoneNightBalance=>{
 fresh({milestoneNightBalance});await mount(History,{entry:[rf.HIST_TRAIN,0,0,[110,16]]})
 expect(all(root,n=>n.type==='b').map(text)).toEqual(['>'])
 expect(text(root)).toContain(rf.EMPLOYEES_STR[60].title)
 expect(text(root)).toContain(rf.EMPLOYEES_STR[16].title)
 expect(text(root)).toContain(i18n.global.t('history.fromStructure'))
})

it.each([5,55])('real HistoryEntry renders two training steps from %s to47',async from=>{
 fresh();await mount(History,{entry:[rf.HIST_TRAIN,0,0,[from,47]]})
 expect(all(root,n=>n.type==='b').map(text)).toEqual(['2x >'])
 expect(text(root)).not.toContain('Choose one available')
})
it.each([6,56])('real HistoryEntry renders one training step from %s to47',async from=>{
 fresh();await mount(History,{entry:[rf.HIST_TRAIN,0,0,[from,47]]})
 expect(all(root,n=>n.type==='b').map(text)).toEqual(['>'])
})

// Raw history sources keep the existing +50 encoding. High decoded IDs are
// legal employees, not another encoding layer (109=>59, 110=>60, 104=>54).
const trainingHistoryCases=[
 {raw:5,to:9,decoded:5,legacy:'4x >'},
 {raw:55,to:9,decoded:5,legacy:'4x >'},
 {raw:6,to:9,decoded:6,legacy:'3x >'},
 {raw:56,to:9,decoded:6,legacy:'3x >'},
 {raw:13,to:16,decoded:13,legacy:'3x >'},
 {raw:63,to:16,decoded:13,legacy:'3x >'},
 {raw:109,to:60,decoded:59,legacy:'>'},
 {raw:110,to:16,decoded:60,legacy:'>'},
 {raw:109,to:16,decoded:59,legacy:'2x >'},
 {raw:104,to:55,decoded:54,legacy:'>'},
 {raw:99,to:50,decoded:49,legacy:'>'},
 {raw:-1,to:9,decoded:-1,legacy:'4x >'},
 {raw:5,to:47,decoded:5,legacy:'>',balanced:'2x >'},
 {raw:55,to:47,decoded:5,legacy:'>',balanced:'2x >'},
 {raw:6,to:47,decoded:6,legacy:'>',balanced:'>'},
 {raw:56,to:47,decoded:6,legacy:'>',balanced:'>'},
]
const historyMatrix=[false,true].flatMap(initial=>trainingHistoryCases.map(c=>({...c,initial})))
// HistoryEntry abbreviates some training targets (see empTitle(..., true)).
const trainingTargetTitle=id=>id===rf.EXECUTIVE_VICE_PRESIDENT?i18n.global.t('history.abbr.executiveVP'):rf.EMPLOYEES_STR[id].title
it.each(historyMatrix)('real raw HistoryEntry preserves source/text across both live gate directions: %j',async ({raw,to,decoded,legacy,balanced,initial})=>{
 fresh({milestoneNightBalance:initial})
 const entry=[rf.HIST_TRAIN,0,0,[raw,to]],before=JSON.stringify(entry)
 await mount(History,{entry})
 let oldText
 for(const enabled of [initial,!initial,initial]){
  store.startingOptions.milestoneNightBalance=enabled;await nextTick()
  expect(all(root,n=>n.type==='b').map(text)).toEqual([enabled?(balanced??legacy):legacy])
  const titles=decoded===-1?[trainingTargetTitle(to)]:[rf.EMPLOYEES_STR[decoded].title,trainingTargetTitle(to)]
  expect(all(root,n=>n.type==='span'&&cls(n,'compact')).map(text)).toEqual(titles)
  expect(text(root).includes(i18n.global.t('history.fromStructure'))).toBe(raw>=50)
  expect(text(root).includes(i18n.global.t('history.fromHiring'))).toBe(raw===-1)
  if(to!==47){if(oldText===undefined)oldText=text(root);expect(text(root)).toBe(oldText)}
  expect(JSON.stringify(entry)).toBe(before)
 }
})

it.each(['en','zh-hans','de','fr','es','it'])('resource expanded/compact/hover copy uses audited resolver live in %s',async lang=>{
 fresh();store.availableMilestones=[19,25];i18n.global.locale.value=lang
 const display=await import('../js/milestoneNightBalanceDisplay.js')
 await mount()
 const compact=all(root,n=>cls(n,'empSpan')&&text(n).includes(rf.EMPLOYEES_STR[47].title))[0]
 expect(compact.props.title).toBe(display.cardDetails('employee',47))
 const popup=compact.parent;popup.props.onMouseenter();await nextTick()
 expect(text(root)).toContain(display.cardDetails('employee',47))
 popup.props.onMouseleave();await nextTick();await expand()
 expect(text(card(47))).toContain(rf.EMPLOYEES_STR[47].description)
 expect(card(47).props.title).toBe(display.cardDetails('employee',47))
 all(root,n=>n.type==='button'&&text(n).includes(i18n.global.t('topMenuViews.expandMilestones')))[0].props.onClick();await nextTick()
 for(const id of [19,25]){
  const ms=all(root,n=>cls(n,'fullMilestoneSpan')&&text(n).includes(rf.MILESTONES_STR[id].title.toUpperCase()))[0]
  expect(ms.props.title).toBe(display.cardDetails('milestone',id))
  expect(text(ms)).toContain(rf.MILESTONES_STR[id].description)
 }
 store.startingOptions.milestoneNightBalance=false;await nextTick()
 expect(card(47).props.title).toBe('')
 expect(text(card(47))).toContain(i18n.global.t('employees.nightShiftManagerDesc'))
})

it('training-step helper uses decoded ids and the balanced night branch',async()=>{
 fresh();const layout=await import('../js/milestoneNightBalanceLayout.js')
 expect(layout.employeeTrainingSteps(5,47,store.startingOptions)).toBe(2)
 expect(layout.employeeTrainingSteps(6,47,store.startingOptions)).toBe(1)
 // The helper takes decoded employee IDs; +50 is decoded only by HistoryEntry.
 expect(layout.employeeTrainingSteps(59,60,store.startingOptions)).toBe(1)
 expect(layout.employeeTrainingSteps(60,16,store.startingOptions)).toBe(1)
 expect(layout.employeeTrainingSteps(54,55,store.startingOptions)).toBe(1)
 expect(rf.EMPLOYEE_ARRANGEMENT.indexOf(47)%5).toBe(0)
 expect(rf.HIREABLE_EMPLOYEES).toContain(47)
})

function legacyLayout(store){
	let employeeArrangement = structuredClone(rf.EMPLOYEE_ARRANGEMENT)

	// Senior Business Developer mod off: restore the original board layout
	// (drop the extra NBD/SBD top row, put NBD back next to the Night Shift
	// Manager so every other card stays in its usual spot)
	if (!store.startingOptions.seniorBusinessDeveloper) {
		employeeArrangement.splice(0, 5)
		employeeArrangement[1] = rf.NEW_BUSINESS_DEVELOPER
	}

	// If you have jazz musicians, but no movie star B, then combine them onto one line
	// (indexes shifted +5 by the Media Line marketer row, +5 more by the SBD
	// NBD/SBD top row when that mod is on)
	const jazzSlot = store.startingOptions.seniorBusinessDeveloper ? 66 : 61
	if (store.availableEmployees[rf.B_MOVIE_STAR] < 0 && store.availableEmployees[rf.JAZZ_MUSICIAN] >= 0) {
		employeeArrangement[jazzSlot] = rf.JAZZ_MUSICIAN
		employeeArrangement[jazzSlot + 15] = -1
	}

	// Remove from the general display any employee not in the game
	for (let i = 0; i < employeeArrangement.length; i++) {
		// Temporary Workers are player-owned cards, not part of the hireable supply.
		if (employeeArrangement[i] === rf.TEMPORARY_WORKER) {
			if (!store.startingOptions.laborMarket) employeeArrangement[i] = -1
			continue
		}
		if (employeeArrangement[i] > -1 && store.availableEmployees[employeeArrangement[i]] === -1) {
			employeeArrangement[i] = -1
		}
	}
	// Now remove groups of 5x -1's in a row
	for (let i = employeeArrangement.length - 5; i >= 0; i -= 5) {
		// Check the slice of 5 elements starting at this index
		const chunk = employeeArrangement.slice(i, i + 5)

		// If every item in this specific chunk is -1
		if (chunk.every((val) => val === -1)) {
			employeeArrangement.splice(i, 5)
		}
	}

	// Group into subArrs of length 5
	const groupedArrangement = []
	for (let i = 0; i < employeeArrangement.length; i += 5) {
		groupedArrangement.push(employeeArrangement.slice(i, i + 5))
	}

	return groupedArrangement
}

const gates=[{milestoneNightBalance:false},{newMilestones:false},{useMilestones:false},{milestoneNightBalance:undefined},{nightShift:false}]
it.each(gates)('old/short/disabled layout remains cell-for-cell unchanged: %j',async gate=>{
 fresh(gate);if(!store.startingOptions.nightShift)store.availableEmployees[47]=-1
 const {employeeLayout}=await import('../js/milestoneNightBalanceLayout.js')
 const globalBefore=JSON.stringify(rf.EMPLOYEE_ARRANGEMENT),stateBefore=JSON.stringify(store.$state)
 for(const seniorBusinessDeveloper of [false,true])for(const jazzOnly of [false,true]){
  const options={...store.startingOptions,seniorBusinessDeveloper}
  const supply=[...store.availableEmployees];if(jazzOnly)supply[41]=-1
  expect(employeeLayout(options,supply)).toEqual(legacyLayout({startingOptions:options,availableEmployees:supply}))
 }
 expect(JSON.stringify(rf.EMPLOYEE_ARRANGEMENT)).toBe(globalBefore)
 expect(JSON.stringify(store.$state)).toBe(stateBefore)
})
const combos=[false,true].flatMap(seniorBusinessDeveloper=>[false,true].flatMap(jazzOnly=>['all','base','sparse'].map(mode=>({seniorBusinessDeveloper,jazzOnly,mode}))))
it.each(combos)('real SVG endpoints follow final matrix through SBD/Jazz/empty-row compression: %j',async ({seniorBusinessDeveloper,jazzOnly,mode})=>{
 fresh({seniorBusinessDeveloper})
 if(mode!=='all')for(const id of [44,45,46,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65])store.availableEmployees[id]=-1
 if(mode==='sparse')for(const id of [0,1,2,3,4,10,11,12,17,18,19,20,21,22,41,42,43])store.availableEmployees[id]=-1
 if(jazzOnly)store.availableEmployees[41]=-1
 await mount();await expand()
 const byId=new Map()
 for(const row of rows())for(const c of row.children.filter(n=>n.type==='div'&&cls(n,'expandedEmployeeAreaDiv'))){
  const title=all(c,n=>n.type==='h3')[0];const id=rf.EMPLOYEES_STR.findIndex(e=>e?.title===text(title))
  expect(byId.has(id)).toBe(false);byId.set(id,position(id))
 }
 const points=new Map([...byId].map(([id,[r,c]])=>[`${80+c*160},${165+r*190}`,id]))
 const actual=[]
 for(const path of all(root,n=>n.type==='path')){
  const nums=path.props.d.match(/-?\d+(?:\.\d+)?/g).map(Number)
  const [x,y,dx,v,dx2]=nums;const end=nums.length===3?[x+dx,y]:[x+dx+dx2,y+v]
  expect(points.has(`${x},${y}`)).toBe(true);expect(points.has(end.join(',')), JSON.stringify({d:path.props.d,end,points:[...points]})).toBe(true)
  actual.push([points.get(`${x},${y}`),points.get(end.join(','))])
 }
 expect(actual.filter(([,to])=>to===47)).toEqual([[6,47]])
 expect(actual).toContainEqual([5,6]);expect(actual).toContainEqual([6,7])
 expect(actual).not.toContainEqual([5,47])
 expect(position(47)[1]).toBe(2)
 const countBefore=cards().length
 all(root,n=>n.type==='button'&&text(n).includes(i18n.global.t('topMenuViews.collapseEmployees')))[0].props.onClick();await nextTick()
 expect(all(root,n=>n.type==='svg')).toHaveLength(0)
 const compact=all(root,n=>cls(n,'empSpan')&&text(n).trim())
 expect(compact).toHaveLength(countBefore)
 await expand();expect(cards()).toHaveLength(countBefore)
})
it('no implicit inventory and source constant remains immutable across repeated getters',async()=>{
 fresh();store.availableEmployees[47]=-1
 const {employeeLayout}=await import('../js/milestoneNightBalanceLayout.js')
 const options=Object.freeze({...store.startingOptions});const supply=Object.freeze([...store.availableEmployees]);const baseline=JSON.stringify(rf.EMPLOYEE_ARRANGEMENT)
 const a=employeeLayout(options,supply);a[0][0]=999
 expect(employeeLayout(options,supply).flat()).not.toContain(999)
 expect(employeeLayout(options,supply).flat()).not.toContain(47)
 await mount();await expand();expect(card(47)).toBeUndefined()
 expect(store.availableEmployees[47]).toBe(-1)
 expect(JSON.stringify(rf.EMPLOYEE_ARRANGEMENT)).toBe(baseline)
})
it.each(gates)('real legacy HistoryEntry preserves original step formatting: %j',async gate=>{
 fresh(gate);const pairs=[5,47,6,47,55,47,56,47,5,9,6,7,-1,47,-1,9]
 await mount(History,{entry:[rf.HIST_TRAIN,0,0,pairs]})
 expect(all(root,n=>n.type==='b').map(text)).toEqual(['>','>','>','>','4x >','>','0x >','4x >'])
})
it('unique icon retains precedence and 47 never displays direct-recruit icon, with real stock',async()=>{
 fresh();store.availableEmployees[47]=1;await mount();await expand()
 const view=await import('../js/FCMview.js')
 const imgs=all(card(47),n=>n.type==='img').map(n=>n.props.src)
 expect(imgs).toContain(view.getImage('icon1x'));expect(imgs).not.toContain(view.getImage('iconRecruit'))
 expect(all(card(5),n=>n.type==='img').map(n=>n.props.src)).toContain(view.getImage('iconRecruit'))
 expect(all(card(9),n=>n.type==='img').map(n=>n.props.src)).toContain(view.getImage('icon1x'))
 expect(text(card(47))).toContain('1')
})

it('every existing branch is preserved as an ID edge while the balanced night branch is additive',async()=>{
 fresh({seniorBusinessDeveloper:true});const {employeeLayout,employeeConnections}=await import('../js/milestoneNightBalanceLayout.js')
 const oldOptions={...store.startingOptions,milestoneNightBalance:false}
 const legacy=employeeConnections(employeeLayout(oldOptions,store.availableEmployees),oldOptions).map(p=>[p.from,p.to])
 const expected=[
 [5,1],[5,57],[5,11],[6,2],[6,18],[6,21],[6,12],[7,3],[7,22],[8,4],[8,19],
 [13,46],[13,48],[13,44],[13,51],[0,41],[0,42],[0,43],[0,53],
 [27,30],[27,36],[27,34],[27,49],[27,54],[28,32],
 [5,6],[6,7],[7,8],[8,9],[1,61],[13,14],[14,15],[15,16],[23,24],[24,25],[25,26],
 [27,28],[28,29],[30,31],[36,37],[34,35],[49,50],[54,55],[38,39],[39,40],
 [13,59],[59,60],[60,16]]
 expect(legacy).toEqual(expected)
 const balanced=employeeConnections(employeeLayout(store.startingOptions,store.availableEmployees),store.startingOptions).map(p=>[p.from,p.to])
 expect(balanced).toEqual([...expected,[6,47]])
})

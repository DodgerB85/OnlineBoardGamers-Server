import { beforeAll, afterEach, it, expect, vi } from 'vitest'
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
let Popup, Details, i18n, rf, view, useModelStore, app, root, store, pinia
beforeAll(async()=>{
 globalThis.window={performance};globalThis.document={addEventListener(){}}
 ;({default:Popup}=await import('./utils/InfoPopup.vue'))
 ;({default:Details}=await import('./PlayerDetails.vue'))
 ;({default:i18n}=await import('../i18n.js'))
 rf=await import('../js/FCMreference.js');view=await import('../js/FCMview.js')
 ;({useModelStore}=await import('../stores/FCMstore.js'))
})
afterEach(()=>{ app?.unmount();app=null })
function fresh(){
 pinia=createPinia();setActivePinia(pinia);store=useModelStore()
 Object.assign(store.startingOptions,{milestoneNightBalance:true,newMilestones:true,useMilestones:true,nightShift:true})
 i18n.global.locale.value='en'
}
async function mount(component, props){
 root=node('root');app=renderer.createApp({render:()=>h(component,props)});app.use(pinia);app.use(i18n);app.mount(root)
 if(component===Popup){root.children[0].props.onMouseenter();await nextTick()}
 return text(root)
}
it('real PlayerDetails limits milestone25 to one working employee, not beach training',async()=>{
 fresh();store.players.push({milestones:[25],resources:[],marketers:[],beach:[],employees:[],ceoSlots:3})
 const result=await mount(Details,{playerIndexProp:0})
 expect(result).toContain('Train 1 on-duty employee of the same colour per round')
 const tooltip=all(root,n=>n.props.title).map(n=>n.props.title).join(' ')
 expect(tooltip).toContain('Train at most one on-duty employee per round, keeping their career colour and spending the normal training points;')
 expect(tooltip).not.toContain('Beach training')
})
it('real employee47 popup explains route, unchanged ability and full organisation capacity',async()=>{
 fresh();const result=await mount(Popup,{type:'employee',employeeId:47})
 expect(result).toContain('All employees who do not require a salary work twice')
 expect(result).toContain('Junior Vice President → Night Shift Manager')
 expect(result).toContain('cannot be hired directly')
 expect(result).toContain('entire organisation must fit after training')
 expect(result).not.toContain('two slots')
})
it.each(['en','zh-hans','de','fr','es','it'])('six-language display is live and has compact cards plus detailed tooltips: %s',async locale=>{
 fresh();const {messages}=await import('../locales/index.js')
 const display=await import('../js/milestoneNightBalanceDisplay.js')
 const keys=['marketingTrainee','lemonade','lemonadeDetails','nightShift','nightShiftDetails']
 for(const key of keys)expect(messages[locale].milestoneNightBalanceDisplay?.[key],key).toBeTypeOf('string')
 await mount(Popup,{type:'milestone',milestoneId:19})
 i18n.global.locale.value=locale;await nextTick()
 expect(text(root)).toContain(messages[locale].milestoneNightBalanceDisplay.marketingTrainee)
 expect(rf.MILESTONES_STR[19].title).toBe(i18n.global.t('milestones.firstMarketingTraineeTitle'))
 expect(rf.MILESTONES_STR[25].title).toBe(i18n.global.t('milestones.firstLemonadeSoldTitle'))
 expect(rf.EMPLOYEES_STR[47].title).toBe(i18n.global.t('employees.nightShiftManager'))
 const details=app.runWithContext(()=>({
  lemonade:display.cardDetails('milestone',25), nightShift:display.cardDetails('employee',47),
 }))
 expect(details.lemonade).toBe(messages[locale].milestoneNightBalanceDisplay.lemonadeDetails)
 expect(details.nightShift).toBe(messages[locale].milestoneNightBalanceDisplay.nightShiftDetails)
})
it.each(['en','zh-hans','de','fr','es','it'])('real image resolver keeps audited original assets in %s and old/new games',async locale=>{
 fresh();await mount(Popup,{type:'milestone',milestoneId:19})
 const display=await import('../js/milestoneNightBalanceDisplay.js')
 const fs=await import('node:fs');const {fileURLToPath}=await import('node:url')
 const cases=[['milestone',19,'m_icon01.png'],['milestone',25,'m_icon08.png'],['employee',47,'e_night_shift_manager.jpg']]
 for(const enabled of [true,false,true]){
  store.startingOptions.milestoneNightBalance=enabled;i18n.global.locale.value=locale;await nextTick()
  for(const [type,id,name] of cases){
   const url=display.cardImage(type,id)
   expect(url).toBe(view.getImage(type==='employee'?`emp_${id}`:rf.MILESTONES_STR[id].img))
   expect(url).toContain(name);expect(fs.existsSync(fileURLToPath(url))).toBe(true)
  }
 }
 expect(display.cardImage('milestone',18)).toBeNull()
 expect(view.getImage('emp_18')).toContain('e_recruiting_manager.jpg')
})
it.each(['missing','flag','new','use','night'])('same-store gates and getters are live without domain mutations: %s',async mode=>{
 fresh();store.players.push({milestones:[19,25],resources:[],marketers:[],beach:[47],employees:[47],ceoSlots:3})
 const legacy18=rf.MILESTONES_STR[18].description
 await mount(Details,{playerIndexProp:0})
 const enabled=text(root)
 if(mode==='missing')delete store.startingOptions.milestoneNightBalance
 if(mode==='flag')store.startingOptions.milestoneNightBalance=false
 if(mode==='new')store.startingOptions.newMilestones=false
 if(mode==='use')store.startingOptions.useMilestones=false
 if(mode==='night')store.startingOptions.nightShift=false
 await nextTick()
 const current=text(root)
 if(mode==='night'){
  expect(current).toContain('Choose one available Kitchen Trainee or Errand Boy')
  expect(current).not.toContain('Train from Junior VP')
 }else{
  expect(current).toContain(i18n.global.t('milestones.firstMarketingTraineeDesc'))
  expect(current).toContain(i18n.global.t('milestones.firstLemonadeSoldDesc'))
  expect(current).not.toContain('Choose one available Kitchen Trainee or Errand Boy')
 }
 expect(current).toContain(i18n.global.t('employees.nightShiftManagerDesc'))
 Object.assign(store.startingOptions,{milestoneNightBalance:true,newMilestones:true,useMilestones:true,nightShift:true})
 await nextTick();expect(text(root)).toBe(enabled)
 const before=JSON.stringify(store.$state);let mutations=0
 const stop=store.$subscribe(()=>mutations++,{flush:'sync'})
 app.runWithContext(()=>{
  for(let i=0;i<3;i++){
   for(const id of [18,19,25])void rf.MILESTONES_STR[id].description
   void rf.EMPLOYEES_STR[47].description
   view.getImage('emp_47')
  }
 })
 stop();expect(mutations).toBe(0);expect(JSON.stringify(store.$state)).toBe(before)
 expect(rf.MILESTONES_STR[18].description).toBe(legacy18)
 expect(rf.HIREABLE_EMPLOYEES).toContain(47)
})
it('display getters outside setup use the active game without Pinia context errors',async()=>{
 fresh();const error=vi.spyOn(console,'error')
 try {
  expect(rf.MILESTONES_STR[19].description).toContain('Choose one')
  expect(rf.EMPLOYEES_STR[47].description).toContain('no direct hire')
  expect(error).not.toHaveBeenCalled()
 } finally { error.mockRestore() }
})
it('locked Chinese lemonade card and tooltip are concise in the real popup',async()=>{
 fresh();i18n.global.locale.value='zh-hans'
 const result=await mount(Popup,{type:'milestone',milestoneId:25})
 expect(rf.MILESTONES_STR[25].title).toBe('首个卖出柠檬水')
 expect(rf.MILESTONES_STR[25].description).toBe('每回合能培训1名同色在岗员工')
 expect(result).toContain('每回合最多培训一名在岗员工，保持职业颜色并消耗原培训点；')
 expect(result).not.toContain('闲置')
})
it('dedicated balance module resolver is distinct from official milestone art',()=>{
 fresh();vi.stubGlobal('alert',vi.fn())
 expect(view.getImage('so_milestoneNightBalance')).toContain('so_milestoneNightBalance.svg')
 expect(view.getImage('so_milestoneNightBalance')).not.toBe(view.getImage('so_ketchupMS'))
})
it('real milestone19 popup replaces the double gift with one stock choice',async()=>{
 fresh();const result=await mount(Popup,{type:'milestone',milestoneId:19})
 expect(result).toContain('Choose one available Kitchen Trainee or Errand Boy')
 expect(result).not.toContain('milestoneNightBalanceDisplay.')
})

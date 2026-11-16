import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
vi.hoisted(()=>{globalThis.window={performance,initData:{KickoutFlexiDataArray:[]}};globalThis.document={addEventListener(){},createElement(){return {}}}})
import { createPinia, setActivePinia } from 'pinia'
import { createRenderer, h, nextTick } from 'vue'
import i18n from '../i18n'
import messages from '../locales/index.js'
import TopMenuViews from './TopMenuViews.vue'
import ActionAreaWorkingDay from './ActionAreaWorkingDay.vue'
import * as rf from '../js/FCMreference.js'
import * as model from '../js/FCMmodel.js'
import * as map from '../js/FCMmap.js'
import * as funcs from '../js/FCMfuncs.js'
import * as controller from '../js/FCMcontroller.js'
import * as view from '../js/FCMview.js'
import { useModelStore } from '../stores/FCMstore.js'
import { usePersonalStore } from '../stores/FCMpersonal.js'
function el(type,text=''){return {type,text,props:{},children:[],parent:null,style:{}}}
const renderer=createRenderer({createElement:el,createText:t=>el('text',t),createComment:t=>el('comment',t),setText:(n,t)=>n.text=t,setElementText:(n,t)=>{n.text=t;n.children=[]},patchProp:(n,k,_,v)=>n.props[k]=v,insert(n,p,a=null){if(n.parent)n.parent.children.splice(n.parent.children.indexOf(n),1);const i=a?p.children.indexOf(a):-1;p.children.splice(i<0?p.children.length:i,0,n);n.parent=p},remove(n){if(n.parent)n.parent.children.splice(n.parent.children.indexOf(n),1);n.parent=null},parentNode:n=>n.parent,nextSibling:n=>n.parent?.children[n.parent.children.indexOf(n)+1]})
const all=(r,p)=>[...(p(r)?[r]:[]),...r.children.flatMap(c=>all(c,p))]
const text=r=>r.text+' '+r.children.map(text).join(' ')
let app,root,store
beforeAll(()=>{globalThis.window={performance,initData:{KickoutFlexiDataArray:[]}};globalThis.document={addEventListener(){},createElement(){return {}}}})
afterEach(()=>{app?.unmount();app=null})
const START=[17,0,4,0,19,3,18,0,12,2,24,2,9,0,0,2,13,2]
function fresh(enabled=true,component=TopMenuViews){
 const pinia=createPinia();setActivePinia(pinia);store=useModelStore();usePersonalStore().pov=0
 model.setInternalStartingOptions(enabled?[rf.SO_SENIOR_BUSINESS_DEVELOPER]:[])
 model.setupNewGame({playerNames:['P0','P1'],startingMap:START});store.mapData.tiles=map.expandMapToFullGrid(START,2);map.initCoords()
 store.viewSettings.showReserve=true
 store.players[0].employees=[rf.SENIOR_BUSINESS_DEVELOPER];store.gameflow.phase=rf.PHASE_WORKING_DAY;store.gameflow.subphase=rf.SUBPHASE_SBD_HOUSES;store.gameflow.fullTurnOrder=[0,1];store.gameflow.turnOrder=[0,1]
 root=el('root');app=renderer.createApp({render:()=>h(component)});app.use(pinia);app.use(i18n);app.mount(root)
 return store
}
const cards=()=>all(root,n=>String(n.props.class||'').split(' ').includes('reserveApartment'))
function empty3x3(){const index=10+10*rf.ssW;for(let y=0;y<3;y++)for(let x=0;x<3;x++)store.mapData.coords[index+x+y*rf.ssW]=rf.EMPTY;return index}
describe('SBD available apartments — production reserve SFC',()=>{
 it('shows all three numbered 3×3 apartments only when enabled',()=>{fresh();expect(cards()).toHaveLength(3);expect(text(root)).toContain('15¾');expect(text(root)).toContain('21¾');expect(text(root)).toContain('27¾');expect(text(root)).toContain('3×3')})
 it('does not show apartment reserve when disabled',()=>{fresh(false);expect(cards()).toHaveLength(0);expect(all(root,n=>n.props['data-sbd-apartments']!==undefined)).toHaveLength(0)})
 it('reacts to placement, whole-model restore and exhausted stock',async()=>{
  fresh();const initial=funcs.simpleExportWholeFCMmodel(true)
  model.addApartment(rf.APARTMENT_15,empty3x3());await nextTick();expect(cards()).toHaveLength(2);expect(cards().map(text).join(' ')).not.toContain('15¾')
  const onePlaced=funcs.simpleExportWholeFCMmodel(true)
  funcs.simpleImportWholeFCMmodel(initial,true);await nextTick();expect(cards()).toHaveLength(3)
  funcs.simpleImportWholeFCMmodel(onePlaced,true);await nextTick();expect(cards()).toHaveLength(2)
  for(const [n,index] of [[rf.APARTMENT_21,15+5*rf.ssW],[rf.APARTMENT_27,20+10*rf.ssW]])model.addApartment(n,index)
  await nextTick();expect(cards()).toHaveLength(0);expect(text(root)).toContain('0')
 })
})
describe('SBD displayed marker terminology and artwork',()=>{
 it.each(Object.keys(messages))('%s has marker wording and unchanged history parameters',lang=>{const m=messages[lang];expect(m.items.moveOut).toContain('OUT');expect(m.items.chooseHouseToMoveOut).toBeTruthy();expect(m.employees.seniorBusinessDeveloperDesc).toContain('OUT');expect(m.history.movesOutHouse).toContain('OUT');expect([...m.history.movesOutHouse.matchAll(/\{(\w+)\}/g)].map(x=>x[1]).sort()).toEqual(['name','num','x','y']);if(lang==='zh-hans')expect(m.items.chooseHouseToMoveOut).toBe('选择没有需求的房屋或公寓')})
 it('selects actual Chinese and English x1 cards by locale',()=>{for(const lang of ['zh-hans','en']){i18n.global.locale.value=lang;expect(view.getImage(`emp_${rf.SENIOR_BUSINESS_DEVELOPER}`)).toContain(`e_senior_business_developer_x1_out_${lang==='en'?'en':'zh'}.png`)}})
 it('renders the marker action and no-demand prompt in the real action SFC',async()=>{i18n.global.locale.value='zh-hans';fresh(true,ActionAreaWorkingDay);store.players[0].employees=[rf.SENIOR_BUSINESS_DEVELOPER];store.gameflow.phase=rf.PHASE_WORKING_DAY;store.gameflow.subphase=rf.SUBPHASE_SBD_HOUSES;store.gameflow.fullTurnOrder=[0,1];store.gameflow.turnOrder=[0,1];controller.setupHousesAndGardensPhase();controller.selectMoveOutToBuild();await nextTick();expect(all(root,n=>n.props.alt==='放置 OUT 标记')).toHaveLength(1);expect(all(root,n=>n.props.title==='放置 OUT 标记')).toHaveLength(1);expect(text(root)).toContain('选择没有需求的房屋或公寓')})
})

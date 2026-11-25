import {beforeAll,afterEach,it,expect,vi} from 'vitest'
import {createPinia,setActivePinia} from 'pinia'
import {createRenderer,h,nextTick} from 'vue'
function node(type,text=''){return {type,text,children:[],props:{},parent:null}}
const renderer=createRenderer({
 createElement:node,createText:t=>node('text',t),createComment:t=>node('comment',t),
 setText:(n,t)=>{n.text=t},setElementText:(n,t)=>{n.text=t;n.children=[]},
 patchProp:(n,k,_,v)=>{n.props[k]=v},
 insert(n,p,a){if(n.parent)n.parent.children.splice(n.parent.children.indexOf(n),1);const i=a?p.children.indexOf(a):-1;p.children.splice(i<0?p.children.length:i,0,n);n.parent=p},
 remove(n){if(n.parent)n.parent.children.splice(n.parent.children.indexOf(n),1)},
 parentNode:n=>n.parent,nextSibling:n=>n.parent?.children[n.parent.children.indexOf(n)+1],
})
const text=n=>n.text+n.children.map(text).join('')
let HistoryEntry,i18n,rf,useModelStore,app,root
beforeAll(async()=>{
 globalThis.window={performance};globalThis.document={addEventListener(){}}
 vi.stubGlobal('fetch',()=>{throw Error('No services in Task5')})
 ;({default:HistoryEntry}=await import('./HistoryEntry.vue'))
 ;({default:i18n}=await import('../i18n.js'))
 rf=await import('../js/FCMreference.js')
 ;({useModelStore}=await import('../stores/FCMstore.js'))
})
afterEach(()=>{app?.unmount();app=null})
async function mount(payload,locale='en'){
 const pinia=createPinia();setActivePinia(pinia)
 const store=useModelStore();store.players.push({name:'P0',displayName:'P0',colour:0})
 i18n.global.locale.value=locale
 root=node('root');app=renderer.createApp({render:()=>h(HistoryEntry,{entry:[rf.HIST_NEW_MILESTONE,0,0,payload]})})
 app.use(pinia);app.use(i18n);app.mount(root);await nextTick()
 return text(root)
}
it.each(['en','zh-hans','de','es','fr','it'])('real HistoryEntry uses new reward messages in %s with no fallback and leaves legacy description intact',async locale=>{
 const {messages}=await import('../locales/index.js')
 for(const key of ['traineeRewardChosen','traineeRewardEmpty']) expect(messages[locale].history[key]).toBeTypeOf('string')
 for(const payload of [[19,27],[19,23],[19,null],[19],[18]]){
  app?.unmount();app=null
  const rendered=await mount(payload,locale)
  const old=rf.MILESTONES_STR[payload[0]].description
  if(payload.length===1)expect(rendered).toContain(old)
  else if(payload[1]===null)expect(rendered).toContain(i18n.global.t('history.traineeRewardEmpty'))
  else expect(rendered).toContain(i18n.global.t('history.traineeRewardChosen',{employee:rf.employeeName(payload[1])}))
 }
})
it('real HistoryEntry explains explicit empty-market null without replacing old 19 text',async()=>{
 const rendered=await mount([19,null])
 expect(rendered).toContain(i18n.global.t('history.traineeRewardEmpty'))
 expect(rendered).not.toContain(rf.MILESTONES_STR[19].description)
 app.unmount();app=null
 const legacy=await mount([19])
 expect(legacy).toContain(rf.MILESTONES_STR[19].description)
 expect(legacy).not.toContain(i18n.global.t('history.traineeRewardEmpty'))
})
it.each([27,23])('real HistoryEntry renders recorded single reward %i instead of old double-gift description',async employee=>{
 const rendered=await mount([19,employee])
 expect(rendered).toContain(i18n.global.t('history.traineeRewardChosen',{employee:rf.employeeName(employee)}))
 expect(rendered).not.toContain(rf.MILESTONES_STR[19].description)
})

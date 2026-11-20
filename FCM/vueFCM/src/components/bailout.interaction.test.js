import {beforeAll,afterEach,it,expect,vi} from 'vitest'
import {createPinia,setActivePinia} from 'pinia'
import {createRenderer,h,nextTick} from 'vue'
import fs from 'node:fs'
vi.mock('vue',async original=>({...await original(),Transition:(_, {slots})=>slots.default?.(),TransitionGroup:(_, {slots})=>slots.default?.()}))
const node=(type,text='')=>({type,text,props:{},children:[],parent:null,style:{},classList:{add(){},remove(){}}})
const renderer=createRenderer({createElement:node,createText:t=>node('text',t),createComment:t=>node('comment',t),setText:(n,t)=>n.text=t,setElementText:(n,t)=>{n.text=t;n.children=[]},patchProp:(n,k,o,v)=>n.props[k]=v,insert(n,p,a){if(n.parent)n.parent.children.splice(n.parent.children.indexOf(n),1);const i=a?p.children.indexOf(a):-1;p.children.splice(i<0?p.children.length:i,0,n);n.parent=p},remove(n){if(n.parent)n.parent.children.splice(n.parent.children.indexOf(n),1);n.parent=null},parentNode:n=>n.parent,nextSibling:n=>n.parent?.children[n.parent.children.indexOf(n)+1]})
const all=(n,p)=>[...(p(n)?[n]:[]),...n.children.flatMap(c=>all(c,p))]
let rf,model,map,rules,controller,funcs,useModelStore,usePersonalStore,ActionArea,PlayerLine,app,s,p,root,posts
beforeAll(async()=>{
 if(!globalThis.pako)(0,eval)(fs.readFileSync(new URL('../../../../Lobby/static/Lobby/common/pakoLib.js',import.meta.url),'utf8'))
 globalThis.alert=()=>{};globalThis.document={cookie:'',addEventListener(){},removeEventListener(){},getElementById(){return null}}
 globalThis.window={performance,initData:{gameData:'existing',bgStatsEnabled:0},addEventListener(){},removeEventListener(){}}
 rf=await import('../js/FCMreference');model=await import('../js/FCMmodel');map=await import('../js/FCMmap');rules=await import('../js/FCMrules');controller=await import('../js/FCMcontroller');funcs=await import('../js/FCMfuncs')
 ;({useModelStore}=await import('../stores/FCMstore'));({usePersonalStore}=await import('../stores/FCMpersonal'));({default:ActionArea}=await import('./ActionArea.vue'));({default:PlayerLine}=await import('./PlayerLine.vue'))
})
afterEach(()=>{app?.unmount();app=null;vi.unstubAllGlobals();vi.useRealTimers()})
function setup(mode='simul',count=3){
 vi.useFakeTimers();const pinia=createPinia();setActivePinia(pinia);s=useModelStore();p=usePersonalStore()
 model.setInternalStartingOptions([49]);const startingMap=map.generateRandomMap(count);const playerNames=Array.from({length:count},(_,i)=>'P'+i);window.initData={gameData:'existing',bgStatsEnabled:0,startingOptions:[49],startingMap,playerNames};model.setupNewGame({playerNames,startingMap})
 s.gameflow.turn=5;s.gameflow.phase=rf.PHASE_PAYDAY;s.gameflow.fullTurnOrder=count===3?[2,0,1]:Array.from({length:count},(_,i)=>i);s.gameflow.turnOrder=[...s.gameflow.fullTurnOrder]
 s.startingOptions.strictPaydayFridge=mode==='strict';p.trainingGame=mode==='training';p.pov=0;p.name='P0';p.latestUpdate='100';p.haltPlay=false;s.bankBroken=1;s.bank=0;rules.handleBankBreak(false)
 posts=[];const evidence=process.env.FCM_BAILOUT_EVIDENCE_DIR;if(evidence){fs.mkdirSync(evidence,{recursive:true});fs.writeFileSync(evidence+'/'+mode+'-initial.json',JSON.stringify({wire:funcs.exportFCMmodel(false,false),initData:window.initData,phase:s.gameflow.phase,turn:s.gameflow.turn}))}vi.stubGlobal('fetch',vi.fn(async(url,o)=>{posts.push(JSON.parse(o.body));if(evidence)fs.writeFileSync(evidence+'/'+mode+'-post.json',o.body);return {ok:true,json:async()=>({latestUpdate:101+posts.length,secondsToNextKickout:999})}}))
 root=node('root');app=renderer.createApp({render:()=>[h(ActionArea),h(PlayerLine)]});app.use(pinia);app.config.globalProperties.$t=(key,args)=>key+ (args?JSON.stringify(args):'');app.mount(root)
 return s
}
function claimButton(){return all(root,n=>n.type==='button'&&String(n.text).includes('bailoutDecline'))[0]}
function card(){return all(root,n=>String(n.props.class).includes('cardSummaryDiv')&&n.props.onClick)[0]}
it.each(['simul','strict','training'])('the real panel gates the independent queue ahead of %s phase',async mode=>{
 setup(mode);expect(controller.currentPlayerIndex()).toBe(2)
 expect(all(root,n=>String(n.props.class).split(' ').includes('currentPlayerGlow'))).toHaveLength(1)
 expect(p.canPlay()).toBe(mode==='training');expect(Boolean(card())).toBe(mode==='training')
 expect(all(root,n=>String(n.text).includes('P2')).length).toBeGreaterThan(0)
 p.pov=2;await nextTick();expect(p.canPlay()).toBe(true);expect(card()).toBeDefined()
 await card().props.onClick();await nextTick();expect(s.bailout.claims[2]).toBe(rf.CAMPAIGN_MANAGER)
 expect(posts).toHaveLength(1);if(process.env.FCM_BAILOUT_EVIDENCE_DIR)fs.writeFileSync(process.env.FCM_BAILOUT_EVIDENCE_DIR+'/'+mode+'-claim-post.json',JSON.stringify(posts[0]));expect(posts[0].nextPlayer).toEqual(['P0']);expect(s.gameflow.phase).toBe(rf.PHASE_PAYDAY);expect(s.gameflow.turnOrder).toEqual([2,0,1])
 const glow=all(root,n=>String(n.props.class).split(' ').includes('currentPlayerGlow'));expect(glow).toHaveLength(1);expect(all(glow[0],n=>n.text==='P0')).toHaveLength(1)
 expect(Boolean(claimButton())).toBe(mode==='training');expect(p.canPlay()).toBe(mode==='training')
 const wire=posts[0].gameData;funcs.importFCMmodel(wire,false,false);expect(rules.currentBailoutPlayer()).toBe(0);expect(s.players[2].beach.filter(e=>e===rf.CAMPAIGN_MANAGER)).toHaveLength(1)
})
it('pending queue blocks ordinary turn ending, auto-skips, phase advance and start-turn mutations',async()=>{
 setup('strict');const before=JSON.stringify([s.gameflow,s.players,s.context]);controller.actionAllPlayerSkips();controller.startPlayerTurn(false);await controller.endCurrentPhase();await controller.endPlayerTurn(true)
 expect(JSON.stringify([s.gameflow,s.players,s.context])).toBe(before);expect(posts).toHaveLength(0)
})
it('actual dinner pauses after installing the next phase and resumes without a second dinner',async()=>{
 setup('training');s.bailout.pending=false;s.bailout.claims={};s.bankBroken=1;s.bank=-1;s.gameflow.phase=rf.PHASE_WORKING_DAY;s.gameflow.turnOrder=[];s.history.splice(0)
 await controller.endCurrentPhase();expect(s.bailout.pending).toBe(true);expect(s.gameflow.phase).toBe(rf.PHASE_PIZZA_BOMB)
 const dinnerCount=s.history.filter(h=>h[0]===rf.HIST_DINNER_TIME).length;expect(dinnerCount).toBe(1)
 await controller.claimBailout(rf.CAMPAIGN_MANAGER);await controller.claimBailout(rf.CAMPAIGN_MANAGER);await controller.claimBailout(rf.CAMPAIGN_MANAGER)
 expect(s.bailout.pending).toBe(false);expect(s.gameflow.phase).toBe(rf.PHASE_PAYDAY);expect(s.gameflow.turn).toBe(5)
 expect(s.history.filter(h=>h[0]===rf.HIST_DINNER_TIME)).toHaveLength(dinnerCount);expect(s.history.filter(h=>h[0]===rf.HIST_BANK_BAILOUT)).toHaveLength(1);expect(s.bank).toBe(899)
 expect(s.history.filter(h=>h[0]===rf.HIST_SALARY||h[0]===rf.HIST_SALARY_STRICT)).toHaveLength(0)
})
it('failed save freezes the queue until the exact state is retried',async()=>{
 setup('training');vi.stubGlobal('fetch',vi.fn().mockRejectedValueOnce(new Error('offline')).mockImplementation(async(url,o)=>{posts.push(JSON.parse(o.body));return {ok:true,json:async()=>({latestUpdate:102,secondsToNextKickout:999})}}))
 await card().props.onClick();expect(p.haltPlay).toBe(true);const claimed=JSON.stringify(s.bailout);expect(await controller.claimBailout(-1)).toBe(false)
 await s.gameMessages.retrySave();expect(p.haltPlay).toBe(false);expect(JSON.stringify(s.bailout)).toBe(claimed);expect(posts.filter(post=>post.action==='saveNormal')).toHaveLength(1)
})
it.each(['network','HTTP503','syncError'])('first dinner queue save freezes unsaved claims and ordinary progress (%s)',async failure=>{
 setup('training');s.bailout.pending=false;s.bailout.claims={};s.bankBroken=1;s.bank=-1;s.gameflow.phase=rf.PHASE_WORKING_DAY;s.gameflow.turnOrder=[0];s.history.splice(0)
 vi.stubGlobal('fetch',vi.fn(async(url,o)=>{
  const post=JSON.parse(o.body);if(post.action!=='saveNormal')return {ok:true,json:async()=>({})};posts.push(post)
  if(posts.length===1){if(failure==='network')throw new Error('offline-install');if(failure==='HTTP503')return {ok:false,status:503,statusText:'Service Unavailable',text:async()=>''};return {ok:true,json:async()=>({syncError:true,latestUpdate:999})}}
  return {ok:true,json:async()=>({latestUpdate:1000,secondsToNextKickout:999})}
 }))
 await controller.endPlayerTurn(true);await nextTick()
 expect(s.bailout.pending).toBe(true);expect(p.haltPlay).toBe(true);expect(p.canPlay()).toBe(false);expect(card()).toBeUndefined()
 const frozen=JSON.stringify([s.gameflow,s.bailout,s.bank,s.bankBroken,s.players,s.availableEmployees,s.history,s.context])
 expect(s.history.filter(h=>h[0]===rf.HIST_DINNER_TIME)).toHaveLength(1);expect(s.history.filter(h=>h[0]===rf.HIST_BANK_BAILOUT)).toHaveLength(1);expect(s.bank).toBe(899);expect(s.bailout.claims).toEqual({})
 expect(await controller.claimBailout(rf.CAMPAIGN_MANAGER)).toBe(false);await controller.endPlayerTurn(true);await controller.endCurrentPhase();controller.actionAllPlayerSkips();controller.startPlayerTurn(false)
 expect(JSON.stringify([s.gameflow,s.bailout,s.bank,s.bankBroken,s.players,s.availableEmployees,s.history,s.context])).toBe(frozen);expect(posts).toHaveLength(1)
 if(failure==='syncError'){
  expect(s.gameMessages.retrySave).toBeFalsy();expect(s.gameMessages.errorText).toBeTruthy();expect(p.haltPlay).toBe(true)
 }else{
  expect(s.gameMessages.retrySave).toBeTypeOf('function');await s.gameMessages.retrySave();await nextTick()
  expect(posts).toHaveLength(2);expect(posts[1]).toEqual(posts[0]);expect(p.haltPlay).toBe(false);expect(p.canPlay()).toBe(true)
  expect(JSON.stringify([s.gameflow,s.bailout,s.bank,s.bankBroken,s.players,s.availableEmployees,s.history,s.context])).toBe(frozen)
  await controller.claimBailout(rf.CAMPAIGN_MANAGER);expect(posts).toHaveLength(3);expect(s.bailout.claims).toEqual({2:rf.CAMPAIGN_MANAGER});expect(s.players[2].beach.filter(e=>e===rf.CAMPAIGN_MANAGER)).toHaveLength(1)
  expect(s.history.filter(h=>h[0]===rf.HIST_DINNER_TIME)).toHaveLength(1);expect(s.history.filter(h=>h[0]===rf.HIST_BANK_BAILOUT)).toHaveLength(1);expect(s.bank).toBe(899)
 }
})
it('all supported languages have queue-specific messages without fallback',async()=>{
 const {messages}=await import('../locales/index');for(const lang of ['en','zh-hans','de','es','fr','it']){expect(messages[lang].actionArea.bailoutOrder).toBeTruthy();expect(messages[lang].actionArea.bailoutWaiting).toContain('{name}')}
})
it('queue also blocks independent pre-move and simul-save entry points',async()=>{
 setup();const io=await import('../backend/FCM_IO');await io.savePreTurn([[[-8],[]],[-8]]);await io.saveSimulMove([[[-8],[]],[-8]]);expect(posts).toHaveLength(0)
})
it('one remaining card produces a single persisted grant even when two clients share the snapshot',async()=>{
 setup('simul');p.pov=2;s.bailout.pool[rf.CAMPAIGN_MANAGER]=s.availableEmployees[rf.CAMPAIGN_MANAGER]=1
 const evidence=process.env.FCM_BAILOUT_EVIDENCE_DIR;if(evidence)fs.writeFileSync(evidence+'/last-one-initial.json',JSON.stringify({wire:funcs.exportFCMmodel(false,false)}))
 await controller.claimBailout(rf.CAMPAIGN_MANAGER);expect(s.bailout.pending).toBe(false);expect(s.availableEmployees[rf.CAMPAIGN_MANAGER]).toBe(0);expect(s.players[2].beach).toEqual([rf.CAMPAIGN_MANAGER]);expect(posts).toHaveLength(1)
 if(evidence)fs.writeFileSync(evidence+'/last-one-post.json',JSON.stringify(posts[0]))
})
it('all clients finish the queue into the untouched ordinary payday queue',async()=>{
 setup('simul');p.pov=2;await controller.claimBailout(rf.CAMPAIGN_MANAGER);p.pov=0;await controller.claimBailout(rf.CAMPAIGN_MANAGER)
 const evidence=process.env.FCM_BAILOUT_EVIDENCE_DIR;if(evidence)fs.writeFileSync(evidence+'/simul-before-final.json',JSON.stringify({wire:funcs.exportFCMmodel(false,false)}))
 p.pov=1;await controller.claimBailout(rf.CAMPAIGN_MANAGER);expect(s.bailout.pending).toBe(false);expect(s.gameflow.turnOrder).toEqual([2,0,1]);expect(s.gameflow.phase).toBe(rf.PHASE_PAYDAY);expect(posts.at(-1).nextPlayer).toEqual(['P2','P0','P1'])
 if(evidence)fs.writeFileSync(evidence+'/simul-final-post.json',JSON.stringify(posts.at(-1)))
})
it.each([4,6])('last card finishes the no-stock remainder with %i players and consecutive bots never block',async count=>{
 setup('training',count);s.bailout.pool[rf.CAMPAIGN_MANAGER]=s.availableEmployees[rf.CAMPAIGN_MANAGER]=1
 s.players[1].displayName=s.players[2].displayName=rf.BOT_NAME
 await card().props.onClick();await nextTick();expect(s.bailout.pending).toBe(false)
 expect(s.bailout.claims).toEqual(Object.fromEntries(Array.from({length:count},(_,i)=>[i,i===0?rf.CAMPAIGN_MANAGER:-1])));expect(posts).toHaveLength(1)
})
it('bot removal during a gift queue preserves the suspended phase turn order',async()=>{
 setup('training',4);s.players[1].displayName=s.players[2].displayName=rf.BOT_NAME;const bot=await import('../js/FCMbot');bot.removeBotPlayers();expect(s.gameflow.turnOrder).toEqual([0,1,2,3]);expect(s.bailout.claims).toEqual({})
})
it('refresh resumes an old snapshot whose front seats are consecutive bots',async()=>{
 setup('training',4);s.players[0].displayName=s.players[1].displayName=rf.BOT_NAME
 await controller.startPlayerTurn(false);await nextTick();expect(s.bailout.claims).toEqual({0:-1,1:-1});expect(rules.currentBailoutPlayer()).toBe(2);expect(posts).toHaveLength(1);expect(posts[0].nextPlayer).toEqual(['P2'])
})
it('refresh finishes an exhausted old snapshot without regranting an earlier claim',async()=>{
 setup('training',4);s.bailout.claims[0]=rf.CAMPAIGN_MANAGER;s.players[0].beach.push(rf.CAMPAIGN_MANAGER);s.bailout.pool[rf.CAMPAIGN_MANAGER]=s.availableEmployees[rf.CAMPAIGN_MANAGER]=0
 await controller.startPlayerTurn(false);await nextTick();expect(s.bailout.pending).toBe(false);expect(s.players[0].beach).toEqual([rf.CAMPAIGN_MANAGER]);expect(s.bailout.claims).toEqual({0:rf.CAMPAIGN_MANAGER,1:-1,2:-1,3:-1});expect(posts).toHaveLength(1)
})
it('a decline passes consecutive bots only when they reach the front',async()=>{
 setup('training',4);s.players[1].displayName=s.players[2].displayName=rf.BOT_NAME
 await claimButton().props.onClick();await nextTick();expect(s.bailout.claims).toEqual({0:-1,1:-1,2:-1});expect(rules.currentBailoutPlayer()).toBe(3)
 expect(posts[0].nextPlayer).toEqual(['P3'])
})

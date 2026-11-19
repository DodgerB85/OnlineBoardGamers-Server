import { beforeAll, it, expect, vi } from 'vitest'
vi.mock('../backend/FCM_IO',()=>({saveGameNormal:vi.fn(async()=>{})}))
import { createPinia, setActivePinia } from 'pinia'
import fs from 'node:fs'
import { createRenderer, h, nextTick } from 'vue'
let model, rf, funcs, rules, replay, controller, view, useModelStore
beforeAll(async () => {
 globalThis.window = { performance }; globalThis.alert = () => {}; globalThis.document = { addEventListener() {}, querySelector() { return null } }
 if (!globalThis.pako) (0,eval)(fs.readFileSync(new URL('../../../../Lobby/static/Lobby/common/pakoLib.js', import.meta.url), 'utf8'))
 model=await import('./FCMmodel');rf=await import('./FCMreference'); funcs=await import('./FCMfuncs');rules=await import('./FCMrules'); replay=await import('./FCMreplay');controller=await import('./FCMcontroller');view=await import('./FCMview');({useModelStore}=await import('../stores/FCMstore'))
})
function game(opts=['50']) {
 setActivePinia(createPinia());const s=useModelStore();s.externalStartingOptions.push(...opts);model.setInternalStartingOptions(opts)
 window.initData={startingOptions:opts,playerNames:['P0','P1'],startingMap:[17,0,4,0,19,3,18,0,12,2,24,2,9,0,0,2,13,2]};model.setupNewGame();return s
}
it.each(['wire','raw','whole'])('%s old two-channel inventory reloads as three without persisting a TV capacity',mode=>{
 const s=game();s.gameflow.phase=rf.PHASE_WORKING_DAY
 const save=()=>mode==='wire'?funcs.exportFCMmodel(false,true):funcs.simpleExportWholeFCMmodel(mode==='raw')
 const load=data=>mode==='wire'?funcs.importFCMmodel(data):funcs.simpleImportWholeFCMmodel(data,mode==='raw')
 s.availableMarketingCampaigns=s.availableMarketingCampaigns.filter(n=>n!==42);const legacy=save()
 const nonTV=s.availableMarketingCampaigns.filter(n=>!rf.TV_CAMPAIGNS.includes(n))
 for(let i=0;i<3;i++){load(legacy);expect(tv(s)).toEqual([28,29,42]);expect(s.availableMarketingCampaigns.filter(n=>!rf.TV_CAMPAIGNS.includes(n))).toEqual(nonTV);expect(s.mediaLine).not.toHaveProperty('tvChannels');expect(s.availableEmployees[rf.TV_ANNOUNCER]).toBe(6);expect(s.mediaLine.rulesVersion).toBe(1)}
 expect(JSON.stringify(mode==='wire'?funcs.decompressData(save()):mode==='raw'?save():funcs.decompressData(save()))).not.toContain('tvChannels')
})
it('phone wire stays v3/v2 and rejects unsupported wire versions',()=>{
 const s=game();const slot=funcs.exportMediaLineSlot();expect(slot[1]).toBe(3);expect(slot).toHaveLength(9)
 const unsupported=[...slot];unsupported[1]=4;unsupported.push(4)
 expect(()=>funcs.validateMediaRules([unsupported])).toThrow('Invalid Media Line extension')
 expect(()=>funcs.validateMediaRules([{headlines:[],rulesVersion:2}])).toThrow()
 s.mediaLine.rulesVersion=0;expect(funcs.exportMediaLineSlot()[1]).toBe(2);expect(funcs.exportMediaLineSlot()).toHaveLength(7)
})
it.each(['wire','raw','whole'])('%s old inventory restores unoccupied supply and occupied channels expire once',mode=>{
 const s=game();s.gameflow.phase=rf.PHASE_WORKING_DAY
 model.addMarketingCampaign(28,-1,false,rf.BURGER,1,[1,7])
 s.availableMarketingCampaigns=s.availableMarketingCampaigns.filter(n=>n!==42)
 const raw=mode==='wire'?funcs.decompressData(funcs.exportFCMmodel(false,true)):funcs.simpleExportWholeFCMmodel(true)

 const load=()=>mode==='wire'?funcs.importFCMmodel(funcs.compressData(raw),false,true):funcs.simpleImportWholeFCMmodel(mode==='raw'?raw:funcs.compressData(raw),mode==='raw')
 const original=JSON.stringify(raw)
 for(let i=0;i<3;i++){load();expect(tv(s)).toEqual([29,42]);expect(s.campaigns.map(c=>c.number)).toEqual([28]);expect(s.mediaLine).not.toHaveProperty('tvChannels')}
 expect(JSON.stringify(raw)).toBe(original)
 expect(JSON.stringify(funcs.simpleExportWholeFCMmodel(true))).not.toContain('tvChannels');expect(funcs.exportMediaLineSlot()).toHaveLength(9)
 rules.doMarketingCampaigns(false);expect(tv(s).slice().sort((a,b)=>a-b)).toEqual([28,29,42]);expect(s.campaigns).toEqual([])
 const saved=funcs.simpleExportWholeFCMmodel(true);funcs.simpleImportWholeFCMmodel(saved,true);expect(new Set(tv(s)).size).toBe(3);expect(tv(s)).toHaveLength(3)
})
function tv(s) {return s.availableMarketingCampaigns.filter(n=>rf.MARKETING_CAMPAIGNS[n].type===rf.TV_CHANNEL)}
it('production MapArea gives three channels distinct images/positions without another channel chip covering an antenna',async()=>{
 const s=game();const map=await import('./FCMmap');s.houses=[{number:7,index:map.giveIndex(40,40),rotated:0}]
 for(const number of rf.TV_CAMPAIGNS)s.campaigns.push({number,index:-1,good:rf.BURGER,duration:3,houses:[7]})
 const node=(type,text='')=>({type,text,props:{},children:[],parent:null,style:{},classList:{add(){},remove(){}}})
 const renderer=createRenderer({createElement:node,createText:t=>node('text',t),createComment:t=>node('comment',t),setText:(n,t)=>n.text=t,setElementText:(n,t)=>{n.text=t;n.children=[]},patchProp:(n,k,o,v)=>n.props[k]=v,insert(n,p,a){if(n.parent)n.parent.children.splice(n.parent.children.indexOf(n),1);const i=a?p.children.indexOf(a):-1;p.children.splice(i<0?p.children.length:i,0,n);n.parent=p},remove(n){if(n.parent)n.parent.children.splice(n.parent.children.indexOf(n),1);n.parent=null},parentNode:n=>n.parent,nextSibling:n=>n.parent?.children[n.parent.children.indexOf(n)+1]})
 const {default:MapArea}=await import('../components/MapArea.vue');const root=node('root'),errors=[],app=renderer.createApp({render:()=>h(MapArea)});app.config.globalProperties.$t=k=>k;app.config.errorHandler=e=>errors.push(e);app.mount(root);await nextTick()
 try{
  const nodes=(n,cl)=>[...(n.props.class===cl?[n]:[]),...n.children.flatMap(c=>nodes(c,cl))]
  const ants=nodes(root,'boardAntennaImg'),chips=nodes(root,'antennaDurationChip');expect(ants).toHaveLength(3);expect(chips).toHaveLength(3);expect(new Set(ants.map(n=>n.props.src)).size).toBe(3)
  const box=n=>{const p=n.props.style;return {x:parseFloat(p.left),y:parseFloat(p.top),w:parseFloat(p.width),h:parseFloat(p.height||p.width)}}
  const overlap=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h
  for(let i=0;i<ants.length;i++)for(let j=0;j<chips.length;j++)if(i!==j)expect(overlap(box(ants[i]),box(chips[j]))).toBe(false)
  expect(errors).toEqual([])
 }finally{app.unmount()}
})
it.each(['wire','raw','whole'])('%s module-off games never acquire TV inventory or capacity through storage or replay',async mode=>{
 const s=game([]);expect(tv(s)).toEqual([])
 const save=mode==='wire'?funcs.exportFCMmodel(false,true):funcs.simpleExportWholeFCMmodel(mode==='raw')
 if(mode==='wire')funcs.importFCMmodel(save,false,true);else funcs.simpleImportWholeFCMmodel(save,mode==='raw')
 expect(tv(s)).toEqual([]);expect(s.mediaLine).not.toHaveProperty('tvChannels');expect(JSON.stringify(funcs.simpleExportWholeFCMmodel(true))).not.toContain('tvChannels')
 await replay.generateReplayData();expect(tv(s)).toEqual([])
})
it('actual Reset AI starts a fresh three-channel game without changing employee/phone counts',async()=>{
 const s=game();s.availableMarketingCampaigns=s.availableMarketingCampaigns.filter(n=>n!==42)
 const {resetGameForAI}=await import('./AI/resetGame');expect(await resetGameForAI()).toBe(true)
 expect(tv(s)).toEqual([28,29,42]);expect(s.availableEmployees[rf.TV_ANNOUNCER]).toBe(6);expect(s.mediaLine.rulesVersion).toBe(1)
 const {saveGameNormal}=await import('../backend/FCM_IO');expect(saveGameNormal).toHaveBeenCalledWith(false,false,false,{resetGame:true})
})
it.each([28,29,42])('controller selects and binds real channel %s, keeps the five-house target and existing four-round duration',async number=>{
 const s=game();const map=await import('./FCMmap');s.players[0].employees=[rf.TV_ANNOUNCER];s.gameflow.phase=rf.PHASE_WORKING_DAY;s.gameflow.subphase=rf.SUBPHASE_MARKETING;s.gameflow.turnOrder=[0,1]
 const index=map.giveIndex(40,40);s.mapData.coords=new Array(rf.ssW*rf.ssH).fill(rf.EMPTY_SPACE);s.houses=[]
 for(const [i,[x,y]]of [[35,35],[38,35],[43,35],[35,40],[44,40],[38,44]].entries()){const anchor=map.giveIndex(x,y);s.houses.push({number:i+1,index:anchor});for(const offset of [0,1,rf.ssW,rf.ssW+1])s.mapData.coords[anchor+offset]=rf.HOUSE+i+1}
 s.players[0].restaurants=[{index,rotation:0,open:true}]
 map.addElement(rf.TYPE_RESTAURANT,s.players[0].colour,index,false)
 controller.selectMarketer(rf.TV_ANNOUNCER,false);expect(s.context.campaigns.filter(n=>rf.TV_CAMPAIGNS.includes(n))).toEqual([28,29,42]);controller.chooseCampaign(number);controller.chooseDuration(4)
 const houses=model.giveHousesInWaveRange(0,2);for(const house of houses.slice(0,6))controller.toggleTVHouseSelection(model.giveSpacesOfHouses([house])[0])
 expect(s.context.tvHouses).toHaveLength(5);expect(controller.tvSelectionComplete()).toBe(true)
 controller.placeMarketingCampaign(-1);expect(s.campaigns[0]).toMatchObject({number,index:-1,duration:4,houses:houses.slice(0,5)});expect(s.players[0].marketers[0]).toMatchObject({campaign:number,marketer:rf.TV_ANNOUNCER});expect(tv(s)).not.toContain(number)
 const history=await import('./FCMhistory');history.setupHistoryHighlight(rf.HIST_START_MARKETING_CAMPAIGN,s.history.find(h=>h[0]===rf.HIST_START_MARKETING_CAMPAIGN)[3],-1);expect(s.historyHelpers.indexesToHighlightYellow.length).toBeGreaterThan(0)
})
it.each(['wire','raw','whole'])('%s retains occupied new channels, house targets, durations, context and exhausts/recycles independent supply',mode=>{
 const s=game();s.gameflow.phase=rf.PHASE_WORKING_DAY;s.context.tvHouses=[1,7];s.context.campaign=42
 for(const n of [28,29,42])model.addMarketingCampaign(n,-1,false,rf.BURGER,3,[1,7])
 expect(tv(s)).toEqual([]);const expected=JSON.parse(JSON.stringify(s.campaigns))
 const save=mode==='wire'?funcs.exportFCMmodel(false,true):funcs.simpleExportWholeFCMmodel(mode==='raw')
 s.campaigns=[];s.context.tvHouses=[]
 if(mode==='wire')expect(funcs.importFCMmodel(save,false,true)).not.toBe(-9999);else funcs.simpleImportWholeFCMmodel(save,mode==='raw')
 expect(s.campaigns).toEqual(expected);expect(s.context.tvHouses).toEqual([1,7]);expect(s.context.campaign).toBe(42);expect(tv(s)).toEqual([])
 model.removeMarketingCampaign(42);expect(tv(s)).toEqual([42]);expect(rules.possibleMarketingCampaigns(s.availableMarketingCampaigns,rf.TV_ANNOUNCER)).toContain(42)
})
it.each([29,42])('real generated history replay and forward/backward steps always use three-channel supply with campaign %s',async number=>{
 const s=game();s.availableMarketingCampaigns=s.availableMarketingCampaigns.filter(n=>n!==42)
 s.history.push([rf.HIST_HIRE,0,1000,[rf.TV_ANNOUNCER]],[rf.HIST_CHOOSE_STRUCTURE,0,1001,[[rf.TV_ANNOUNCER],[]]],[rf.HIST_START_MARKETING_CAMPAIGN,0,1002,[number,[1,7],rf.BURGER,3]])
 const steps=s.history.length;await replay.generateReplayData();expect(s.campaigns[0]).toMatchObject({number,index:-1,houses:[1,7],duration:3});expect(s.mediaLine).not.toHaveProperty('tvChannels')
 const snapshots=JSON.stringify(s.replayData);replay.goToReplayStep(0);expect(tv(s)).toHaveLength(3);replay.goToReplayStep(steps-1);expect(s.campaigns[0].number).toBe(number);expect(tv(s)).toHaveLength(2);expect(JSON.stringify(s.replayData)).toBe(snapshots)
})
it('new TV identities resolve their real channel artwork at every shared campaign image entry',()=>{
 game();for(const [n,label]of [[28,'35'],[29,'45'],[42,'55']]) {
  expect(view.getImage('campaign_'+n)).toContain('antenna'+label+'.png');expect(view.getImage('marketing_campaign_'+n)).toBe(view.getImage('campaign_'+n));expect(view.getImage('antenna'+label)).toBe(view.getImage('campaign_'+n))
 }
})
it('new Media Line games supply three independent labelled TV channels and keep six employees / twelve phone cards',()=>{
 const s=game();expect(tv(s)).toEqual([28,29,42]);expect(tv(s).map(rules.campaignSortKey)).toEqual([3.5,4.5,5.5]);expect(s.availableEmployees[rf.TV_ANNOUNCER]).toBe(6);expect(s.mediaLine.rulesVersion).toBe(1);expect(s.availableMarketingCampaigns.filter(n=>rf.PHONE_CAMPAIGNS.includes(n))).toHaveLength(12)
})

it('three TV resources leave phone group 6.5 usable',()=>{
 const s=game();expect(rf.TV_CAMPAIGNS).toEqual([28,29,42]);expect(rf.MARKETING_CAMPAIGNS).toHaveLength(43);

 expect(view.getImage('campaign_30')).toContain('marketing_phone_65_v1');expect(rules.possibleMarketingCampaigns(s.availableMarketingCampaigns,rf.TELEMARKETER)).toContain(30);
})

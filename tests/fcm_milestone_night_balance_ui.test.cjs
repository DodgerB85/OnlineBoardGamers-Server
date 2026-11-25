const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const grid = fs.readFileSync(path.join(root, 'Lobby/templates/Lobby/fcm_options_grid.html'), 'utf8')
const choices = fs.readFileSync(path.join(root, 'Lobby/templates/Lobby/randomFCMmoduleChoices.html'), 'utf8')
const template = fs.readFileSync(path.join(root, 'Lobby/templates/Lobby/createFCM.html'), 'utf8')
 .replaceAll("{% include 'Lobby/fcm_options_grid.html' %}", grid)
 .replace(/\{% include "Lobby\/randomFCMmoduleChoices.html" with choice="(include|exclude)" %\}/g, (_, choice) => choices.replaceAll('{{ choice }}', choice))
const source = fs.readFileSync(path.join(root, 'Lobby/static/Lobby/createFCMgame.js'), 'utf8')
test('real-template radio groups and expert exits clear hidden mandatory balance', () => {
 for (const action of [c=>c.show_Options('scenariosTab'),c=>c.show_Options('individualOptionsTab'),c=>c.validateScenario('s_newMS')]) {
  const {el,context:c} = fixture()
  el.enableAdvancedOptions.checked = true; c.validateOptions('enableAdvancedOptions')
  el.randomModules.checked = true; c.validateOptions('randomModules')
  el.random_newMS.checked = true; c.validateOptions('random_newMS')
  assert.equal(el.random_originalMS.checked, false)
  el.includeFanExpansion.checked = true; el.includeModules.checked = true; c.syncRandomExcludeUI()
  el.include_54.checked = true
  action(c)
  assert.equal(el.enableAdvancedOptions.checked, false)
  assert.equal(el.randomModules.checked, false)
  assert.equal(el.include_54.checked, false)
  assert.equal(el.include_54.disabled, true)
 }
})

test('play again restores eligible include54 and drops old pool or excluded leftovers', () => {
 for (const [options,expected] of [['[200,21,204,1154,21001,21101]',true],['[200,204,1154]',false],['[200,21,1154]',false],['[200,21,204,1154,1054]',false],['[300,21,1154]',false]]) {
  const {el,context:c}=fixture()
  c.initGameCreation(true,{gameName:'again',gameDescription:'',gamePace:'30',playerNumber:'2',playerNames:[],kickoutDuration:'100',startingMap:'',scenarioUsed:false,startingOptions:options})
  assert.equal(el.include_54.checked,expected,options)
  assert.equal(el.milestoneNightBalance.checked,false,options)
  assert.equal(el.milestoneNightBalance.disabled,true,options)
 }
})

test('shared choices template supplies balance to include and exclude panels', () => {
 const {el,context} = fixture()
 assert.ok(el.include_54); assert.ok(el.exclude_54)
 el.randomModules.disabled = false; el.randomModules.checked = true; el.random_newMS.checked = true
 el.includeFanExpansion.checked = true; el.includeModules.checked = true
 context.syncRandomExcludeUI()
 assert.equal(el.include_54.disabled, false)
 el.include_54.checked = true; el.excludeModules.checked = true; el.exclude_54.checked = true
 context.syncRandomExcludeUI()
 assert.equal(el.include_54.checked, false); assert.equal(el.include_54.disabled, true)
})

test('eligible random pool distinguishes old26 new26 and global27', () => {
 const {el,context} = fixture()
 el.includeChineseExpansion.checked = true; el.includeFanExpansion.checked = true
 el.random_newMS.checked = true
 assert.ok(context.getExcludePool().includes(54))
 assert.equal(context.getExcludePool().length, 26)
 el.random_newMS.checked = false; el.random_originalMS.checked = true
 const old = Array.from(context.getExcludePool())
 assert.equal(old.length, 26); assert.ok(!old.includes(54)); assert.ok(old.includes(8))
 el.random_originalMS.checked = false; el.random_newMS.checked = true
 assert.equal(new Set([...old,...context.getExcludePool()]).size, 27)
 for (const id of ['short','noMilestones']) {
  el[id].checked = true; assert.ok(!context.getExcludePool().includes(54)); el[id].checked = false
 }
 el.includeFanExpansion.checked = false
 assert.ok(!context.getExcludePool().includes(54))
})

test('switching tabs or scenarios clears hidden balance without resetting other MODs', () => {
 const {el,context} = fixture()
 for (const action of [() => context.show_Options('scenariosTab'), () => context.show_Options('individualOptionsTab'), () => context.validateScenario('s_newMS')]) {
  el.newMilestones.checked = true
  el.milestoneNightBalance.checked = true
  el.milestoneNightBalance.disabled = false
  el.mediaLine.checked = true
  action()
  assert.equal(el.milestoneNightBalance.checked, false)
  assert.equal(el.milestoneNightBalance.disabled, true)
  assert.equal(el.mediaLine.checked, true)
 }
})
test('exclude balance follows eligibility and restores unchecked with exclusion priority', () => {
 const {el,context} = fixture()
 el.randomModules.disabled = false; el.randomModules.checked = true
 el.random_newMS.checked = true; el.includeFanExpansion.checked = true
 el.includeModules.checked = true; el.excludeModules.checked = true
 for (const unavailable of ['old','pool-off','short','noMilestones']) {
  context.syncRandomExcludeUI(); assert.equal(el.exclude_54.disabled, false)
  el.exclude_54.checked = true
  if (unavailable === 'old') el.random_originalMS.checked = true
  else el[unavailable === 'pool-off' ? 'includeFanExpansion' : unavailable].checked = unavailable !== 'pool-off'
  context.syncRandomExcludeUI()
  assert.equal(el.exclude_54.checked, false, unavailable)
  assert.equal(el.exclude_54.disabled, true, unavailable)
  el.random_newMS.checked = true; el.includeFanExpansion.checked = true
  el.short.checked = false; el.noMilestones.checked = false
  context.syncRandomExcludeUI()
  assert.equal(el.exclude_54.disabled, false); assert.equal(el.exclude_54.checked, false)
 }
 el.include_54.checked = true; el.exclude_54.checked = true
 context.syncRandomExcludeUI()
 assert.equal(el.include_54.checked, false); assert.equal(el.include_54.disabled, true)
})

function fixture() {
 const elements = {}
 for (const match of template.matchAll(/<(input|select|div|button|span)[^>]*\bid="([^"]+)"[^>]*>/g)) {
  const [, tag, id] = match
  elements[id] = { id, checked: false, disabled: /\sdisabled\b/.test(match[0]), value: match[0].match(/\bvalue="([^"]*)"/)?.[1] ?? '', className: match[0].match(/class="([^"]*)"/)?.[1] ?? '', style: {}, parentElement: { style: {} }, addEventListener() {}, classList: { add() {} }, querySelectorAll() { return [] } }
  const type = match[0].match(/\btype="([^"]*)"/)?.[1]
  const name = match[0].match(/\bname="([^"]*)"/)?.[1]
  elements[id].type = type; elements[id].name = name
  if (type === 'radio') {
   Object.defineProperty(elements[id], 'checked', {
    get() { return this._checked ?? false },
    set(value) {
     if (value) Object.values(elements).filter(e => e.type === 'radio' && e.name === name).forEach(e => {e._checked = false})
     this._checked = !!value
    },
   })
  }
  if (tag === 'select') {
   const body = template.slice(match.index + match[0].length).split('</select>')[0]
   const options = Array.from(body.matchAll(/<option\b([^>]*)value="([^"]*)"([^>]*)>/g), m => ({value:m[2], disabled:/\bdisabled\b/.test(m[1]+m[3]), selected:/\bselected\b/.test(m[1]+m[3])}))
   elements[id].options = options
   elements[id].selectedIndex = Math.max(0, options.findIndex(o => o.selected))
   Object.defineProperty(elements[id], 'value', {get() {return options[this.selectedIndex]?.value ?? ''}, set(v) {this.selectedIndex = options.findIndex(o => o.value === String(v))}})
  }
 }
 const document = {getElementById:id=>elements[id] ?? null, querySelector:s=>elements[s.slice(1)], querySelectorAll:s=>Object.values(elements).filter(e=>e.className.split(' ').includes(s.split('.')[1])), getElementsByClassName:c=>Object.values(elements).filter(e=>e.className.split(' ').includes(c)), getElementsByName:()=>[]}
 const context = vm.createContext({document, global:{experienced:false, MT_Creation:false}, autocomplete(){}, GAME_TYPE_OPTIONS:[], showSeats(){}, setKickoutOptions(){}})
 const pageSource = fs.readFileSync(path.join(root, 'Lobby/static/Lobby/createGamePage.js'), 'utf8')
 for (const name of ['removeOption', 'addOption']) {
  const fn = pageSource.match(new RegExp('function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n\\}'))
  assert.ok(fn, name + ' is loaded from production')
  vm.runInContext(fn[0], context)
 }
 vm.runInContext(source,context)
 return {el:elements, context}
}

test('play again restores valid balance but clears invalid and expert-mode leftovers', () => {
 for (const [options, expected] of [['[21,54]', true], ['[21,54,16]', true], ['[54,20]', false], ['[21,54,1]', false], ['[21,54,2]', false], ['[200,21,54,21001,21105]', false], ['[200,21,54]', false], ['[21,54,300]', false], ['[21,54,205]', false], ['[300,21,54,302]', false], ['[205,20,54]', false], ['[21]', false]]) {
  const {el,context} = fixture()
  el.milestoneNightBalance.checked = true
  context.initGameCreation(true, {gameName:'Saved',gameDescription:'',gamePace:'5',playerNumber:'2',playerNames:[],kickoutDuration:'24',startingMap:'',scenarioUsed:false,startingOptions:options})
  const codes = JSON.parse(options)
  const draft = codes.includes(300) || codes.includes(205)
  const random = codes.includes(200)
  assert.equal(el.milestoneNightBalance.checked, expected, options)
  assert.equal(el.enableAdvancedOptions.checked, draft || random, options)
  if (draft || random) {
   assert.equal(el.milestoneNightBalance.disabled, true, options)
   assert.equal(el.newMilestones.checked, false, 'expert mode must clear hidden manual milestones: ' + options)
   assert.equal(el.draftModules.checked, draft, options)
   assert.equal(el.randomModules.checked, random, options)
   const mode = draft ? 'draft' : 'random'
   assert.equal(el[mode + '_newMS'].checked, codes.includes(21), options)
   assert.equal(el[mode + '_originalMS'].checked, !codes.includes(21), options)
   assert.equal(el[mode + '_newMS'].disabled, false, options)
   assert.equal(el[mode + '_newMS'].value, draft ? '302' : '202', 'actual template mode values')
  }
  if (expected) assert.equal(el.milestoneNightBalance.disabled, false, options)
  if (expected) {
   el.enableAdvancedOptions.checked = true
   context.validateOptions('enableAdvancedOptions')
   assert.equal(el.milestoneNightBalance.checked, false)
   assert.equal(el.milestoneNightBalance.disabled, true)
  }
 }
})

test('manual balance checkbox is independent and requires usable New Milestones', () => {
 const {el,context} = fixture()
 assert.ok(el.milestoneNightBalance, 'independent MOD checkbox exists')
 assert.equal(el.milestoneNightBalance.value, '54')
 assert.equal(el.milestoneNightBalance.checked, false)
 assert.equal(el.milestoneNightBalance.disabled, true)
 assert.ok(grid.includes('#milestone-night-balance'))
 assert.ok(grid.includes('Use Player Balance Module'))
 assert.ok(grid.includes('Requires New Milestones. Adjusts marketing rewards, on-duty training and Night Shift recruitment.'))
 el.newMilestones.checked = true
 context.validateOptions('newMilestones')
 assert.equal(el.milestoneNightBalance.disabled, false)
 el.milestoneNightBalance.checked = true
 context.validateOptions('milestoneNightBalance')
 assert.equal(el.nightShift.checked, false)
 for (const id of ['newMilestones','short','noMilestones']) {
  el.newMilestones.checked = true; el.short.checked = false; el.noMilestones.checked = false
  context.validateOptions('newMilestones'); el.milestoneNightBalance.checked = true
  el[id].checked = id !== 'newMilestones'
  context.validateOptions(id)
  assert.equal(el.milestoneNightBalance.checked, false, id)
  assert.equal(el.milestoneNightBalance.disabled, true, id)
 }
})

// Run with: node --test tests/fcm_random_include_ui.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const template = fs.readFileSync(path.join(root, 'Lobby/templates/Lobby/createFCM.html'), 'utf8').replace(
    /{% include "Lobby\/randomFCMmoduleChoices.html" with choice="(exclude|include)" %}/g,
    (_, choice) => fs.readFileSync(path.join(root, 'Lobby/templates/Lobby/randomFCMmoduleChoices.html'), 'utf8').replaceAll('{{ choice }}', choice),
).replaceAll("{% include 'Lobby/fcm_options_grid.html' %}", fs.readFileSync(path.join(root, 'Lobby/templates/Lobby/fcm_options_grid.html'), 'utf8'))
const source = fs.readFileSync(path.join(root, 'Lobby/static/Lobby/createFCMgame.js'), 'utf8')

// Small DOM fixture uses actual template ids/classes; no browser dependencies.
function fixture() {
    const elements = {}
    for (const match of template.matchAll(/<(input|select|div|button|span)[^>]*\bid="([^"]+)"[^>]*>/g)) {
        const [, tag, id] = match
        const classes = match[0].match(/class="([^"]*)"/)
        elements[id] = { id, checked: false, disabled: /\sdisabled\b/.test(match[0]), value: '',
            className: classes ? classes[1] : '', style: {}, parentElement: { style: {} },
            addEventListener() {}, classList: { add() {} },
            querySelectorAll(selector) {
                const group = id.includes('Chinese') ? [42,43,44,45] : [46,47,48,49,50,51,53]
                return group.map(m => elements[(selector.includes('includeMod') ? 'include_' : 'exclude_') + m]).filter(Boolean)
            } }
        if (tag === 'select') {
            const body = template.slice(match.index + match[0].length).split('</select>')[0]
            const options = Array.from(body.matchAll(/<option\b([^>]*)value="([^"]*)"([^>]*)>/g), option => ({
                value: option[2], disabled: /\bdisabled\b/.test(option[1] + option[3]),
                selected: /\bselected\b/.test(option[1] + option[3]),
            }))
            elements[id].options = options
            elements[id].selectedIndex = Math.max(0, options.findIndex(option => option.selected))
            Object.defineProperty(elements[id], 'value', {
                get() { return options[this.selectedIndex]?.value ?? '' },
                set(value) { this.selectedIndex = options.findIndex(option => option.value === String(value)) },
            })
        }
    }
    const document = {
        getElementById: id => elements[id] || null,
        querySelector: selector => elements[selector.slice(1)],
        querySelectorAll: selector => Object.values(elements).filter(el => el.className.split(' ').includes(selector.split('.')[1])),
        getElementsByClassName: cls => Object.values(elements).filter(el => el.className.split(' ').includes(cls)),
        getElementsByName: () => [],
    }
    const context = vm.createContext({ document, global: { experienced: false, MT_Creation: false },
        autocomplete() {}, GAME_TYPE_OPTIONS: [], showSeats() {}, setKickoutOptions() {},
        addOption(id) { elements[id].disabled = false },
        removeOption(id) { elements[id].disabled = true; elements[id].checked = false },
    })
    vm.runInContext(source, context)
    elements.randomModules.checked = true
    elements.randomModules.disabled = false
    elements.random_originalMS.checked = true
    elements.minModules.value = '1'
    elements.maxModules.value = '5'
    return { elements, context }
}

test('empty pool keeps a selected enabled zero and restores positive mandatory bounds', () => {
    const { elements: el, context } = fixture()
    el.excludeModules.checked = true
    for (const mod of context.getExcludePool()) el['exclude_' + mod].checked = true
    context.syncRandomExcludeUI()
    assert.equal(el.excludePoolCount.textContent, 0)
    for (const select of [el.minModules, el.maxModules]) {
        assert.equal(select.value, '0')
        assert.notEqual(select.selectedIndex, -1)
        assert.equal(select.options[select.selectedIndex].disabled, false)
        assert.ok(select.options.filter(option => option.value !== '0').every(option => option.disabled))
    }
    el.exclude_10.checked = false
    context.syncRandomExcludeUI()
    for (const select of [el.minModules, el.maxModules]) {
        assert.equal(select.value, '1')
        assert.equal(select.options.find(option => option.value === '0').disabled, true)
    }
    el.exclude_16.checked = false
    el.includeModules.checked = true
    el.include_10.checked = true
    el.include_16.checked = true
    context.syncRandomExcludeUI()
    for (const select of [el.minModules, el.maxModules]) {
        assert.equal(select.value, '2')
        assert.equal(select.options.find(option => option.value === '1').disabled, true)
    }
})

test('restored reversed random bounds remain ordered after synchronization', () => {
    const { elements: el, context } = fixture()
    el.minModules.value = '5'
    el.maxModules.value = '2'
    context.syncRandomExcludeUI()
    assert.equal(el.minModules.value, '5')
    assert.equal(el.maxModules.value, '5')
    el.minModules.value = '6'
    context.validateOptions('minModules')
    assert.equal(el.maxModules.value, '6')
    el.maxModules.value = '3'
    context.validateOptions('maxModules')
    assert.equal(el.minModules.value, '3')
})

test('saved random options restore includes, pools, counts and exclusions', () => {
    const { elements: el, context } = fixture()
    context.initGameCreation(true, {
        gameName: 'Saved random', gameDescription: '', gamePace: '5', playerNumber: '2',
        playerNames: [], kickoutDuration: '24', startingMap: '', scenarioUsed: false,
        startingOptions: '[200, 21, 203, 204, 21005, 21105, 1110, 1142, 1151, 1016]',
    })
    assert.equal(el.enableAdvancedOptions.checked, true)
    assert.equal(el.randomModules.checked, true)
    assert.equal(el.random_newMS.checked, true)
    assert.equal(el.includeChineseExpansion.checked, true)
    assert.equal(el.includeFanExpansion.checked, true)
    assert.equal(el.includeModules.checked, true)
    for (const m of [10,42,51]) assert.equal(el['include_' + m].checked, true)
    assert.equal(el.exclude_16.checked, true)
    assert.equal(el.minModules.value, '5')
    assert.equal(el.maxModules.value, '5')
    assert.equal(el.includeModulesPanel.style.display, 'block')
})

test('excluded modules win conflicts and cannot be mandatory', () => {
    const { elements: el, context } = fixture()
    el.includeModules.checked = true
    el.excludeModules.checked = true
    el.include_16.checked = true
    el.exclude_16.checked = true
    context.validateOptions('exclude_16')
    assert.equal(el.include_16.checked, false)
    assert.equal(el.include_16.disabled, true)
    assert.equal(el.exclude_16.checked, true)
    assert.equal(el.excludePoolCount.textContent, 14)
    el.exclude_16.checked = false
    context.validateOptions('exclude_16')
    assert.equal(el.include_16.disabled, false)
})

test('inactive pools clear and disable mandatory choices including Hard Choices', () => {
    const { elements: el, context } = fixture()
    el.includeModules.checked = true
    el.include_42.checked = true
    el.include_51.checked = true
    el.include_8.checked = true
    el.random_originalMS.checked = false
    context.syncRandomExcludeUI()
    for (const m of [8,42,51]) {
        assert.equal(el['include_' + m].checked, false, `cleared ${m}`)
        assert.equal(el['include_' + m].disabled, true, `disabled ${m}`)
    }
    assert.equal(el.includeChineseList.style.display, 'none')
    assert.equal(el.includeFanList.style.display, 'none')
    assert.equal(el.include_8.parentElement.style.display, 'none')
    el.includeChineseExpansion.checked = true
    el.includeFanExpansion.checked = true
    el.random_originalMS.checked = true
    context.syncRandomExcludeUI()
    for (const m of [8,42,51]) assert.equal(el['include_' + m].disabled, false)
    assert.equal(el.includeChineseList.style.display, 'grid')
    assert.equal(el.includeFanList.style.display, 'grid')
    el.include_10.checked = true
    el.randomModules.checked = false
    context.syncRandomExcludeUI()
    assert.equal(el.includeModules.disabled, true)
    assert.equal(el.include_10.checked, false)
    assert.equal(el.include_10.disabled, true)
    assert.equal(el.includeModulesPanel.style.display, 'none')
})

test('pool size remains the upper bound and switching master off clears picks', () => {
    const { elements: el, context } = fixture()
    el.includeModules.checked = true
    el.include_10.checked = true
    el.include_16.checked = true
    el.minModules.value = '1'
    el.maxModules.value = '26'
    context.syncRandomExcludeUI()
    assert.equal(el.minModules.value, '2')
    assert.equal(el.maxModules.value, '15')
    assert.equal(el.maxModules.options.find(option => option.value === '16').disabled, true)
    el.includeModules.checked = false
    context.syncRandomExcludeUI()
    assert.equal(el.include_10.checked, false)
    assert.equal(el.include_16.checked, false)
    assert.equal(el.minModules.options.find(option => option.value === '1').disabled, false)
    assert.equal(el.includeModulesPanel.style.display, 'none')
})

test('legacy comma options without includes still restore the original pool', () => {
    const { elements: el, context } = fixture()
    context.initGameCreation(true, {
        gameName: 'Legacy', gameDescription: '', gamePace: '5', playerNumber: '2',
        playerNames: [], kickoutDuration: '24', startingMap: '', scenarioUsed: false,
        startingOptions: '200,21001,21115',
    })
    assert.equal(el.random_originalMS.checked, true)
    assert.equal(el.includeModules.checked, false)
    assert.equal(el.minModules.value, '1')
    assert.equal(el.maxModules.value, '15')
    assert.equal(el.excludePoolCount.textContent, 15)
})

test('mandatory panel is below exclusions and constrains total minimum', () => {
    const { elements: el, context } = fixture()
    assert.ok(el.includeModules, 'mandatory master checkbox must exist')
    assert.ok(template.indexOf('id="includeModules"') > template.indexOf('id="excludeModulesPanel"'))
    el.includeModules.checked = true
    el.include_10.checked = true
    el.include_16.checked = true
    context.syncRandomExcludeUI()
    assert.equal(el.includeModulesPanel.style.display, 'block')
    assert.equal(el.minModules.value, '2')
    assert.equal(el.maxModules.value, '5')
    assert.equal(el.minModules.options.find(option => option.value === '1').disabled, true)
    assert.equal(el.maxModules.options.find(option => option.value === '1').disabled, true)
})

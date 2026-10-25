// Disposable copies keep experimental rules out of live games and saved-game replay.
import { cp, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'

export const variants = ['baseline', 'opening', 'redesign', 'redesignNoWages', 'licensedMarket']

export async function experimentalEngine(variant) {
	assert(variants.includes(variant), 'Unknown experiment')
	const dir = await mkdtemp(join(tmpdir(), 'pap-design-'))
	try {
		await cp(new URL('../vuePAP/src/js/engine/', import.meta.url), dir, { recursive: true })
		await writeFile(join(dir, 'package.json'), '{"type":"module"}')
		const change = async (file, before, after) => {
			const path = join(dir, file)
			const source = await readFile(path, 'utf8')
			assert.equal(source.split(before).length, 2, `Expected one patch location in ${file}`)
			await writeFile(path, source.replace(before, after))
		}
		if (variant !== 'baseline') {
			await change('setup.js', "rank: 'apprentice', hiredYear: 0", "rank: 'journeyman', hiredYear: 0")
			await change('setup.js', 'p.everEmployed = 1', `p.staff.push({ id: 's' + p.seat + '_2', rank: 'apprentice', hiredYear: 0, tile: null, everWorked: false })
		p.everEmployed = 2
		p.ingredients = { ...C.RECIPES[p.recipes[0]].cost }`)
			await change('cards.js', '1: { apprentice: 1, journeyman: 1, master: 0, total: 1 }', '1: { apprentice: 2, journeyman: 1, master: 0, total: 3 }')
		}
		if (variant.startsWith('redesign') || variant === 'licensedMarket') {
			await change('workshop.js', 'kettle: (s, seat, _staff, c) => craftPotion(s, seat, c),', `kettle: (s, seat, _staff, c) => {
		const batch = c.batch || [c]
		require(Array.isArray(batch) && batch.length >= 1 && batch.length <= 2, 'Brew one or two potions')
		for (const potion of batch) craftPotion(s, seat, potion)
	},`)
			await change('cards.js', '2: { apprentice: 2, journeyman: 1, master: 0, total: 3 }', '2: { apprentice: 3, journeyman: 2, master: 0, total: 5 }')
			await change('street.js', 's.players[seat].exchangesEntered === 0 && qualifyingPotions', 'qualifyingPotions')
			await change('street.js', 'proceeds += FRANCHISE.premium', 'proceeds += 0')
			await change('audit.js', "warn(s, first, 'firstPlayer')", '// First Player already receives toll relief and tie priority.')
			await change('audit.js', 'const ruined = w !== null && w.recognized <= C.CONTRIBUTION_THRESHOLD && w.recognized <= w.yearStartRecognized', 'const ruined = false')
			await change('audit.js', "log(s, seat, 'condemnation', { choice: 'pay' })", `s.players[seat].warnings -= prompt.data.excess
			log(s, seat, 'condemnation', { choice: 'pay' })`)
			if (variant === 'redesign') await change('audit.js', 'for (const seat of s.auditOrder) settleLevies(s, seat)', `for (const seat of s.auditOrder) {
			const p = s.players[seat]
			const bill = p.staff.filter(st => st.hiredYear < s.year).length
			const paid = Math.min(bill, p.cash)
			money(s, seat, -paid, true)
			for (let unpaid = bill - paid; unpaid > 0; unpaid -= 2) warn(s, seat, 'payroll')
			log(s, seat, 'payroll', { bill, paid })
			settleLevies(s, seat)
		}`)
			if (variant === 'licensedMarket') {
				await change('cards.js', 'export const CONTRIBUTION_THRESHOLD = 40', 'export const CONTRIBUTION_THRESHOLD = 20')
				await change('state.js', 'if (!v.customer || p.tier < venueInfo(venueId).tier) return []', 'if (!v.customer) return []')
				await change('street.js', 'const baseProceeds = paid - info.overhead', `const permitRent = Math.max(0, info.tier - p.tier)
	const baseProceeds = paid - info.overhead - permitRent`)
				await change('audit.js', 'for (const seat of s.auditOrder) settleLevies(s, seat)', `for (const seat of s.auditOrder) {
			const p = s.players[seat]
			// The founding partners live on dividends; recruited staff draw wages.
			const bill = p.staff.filter(st => st.hiredYear > 0 && st.hiredYear < s.year).length
			const paid = Math.min(bill, p.cash)
			money(s, seat, -paid, true)
			for (let unpaid = bill - paid; unpaid > 0; unpaid -= 2) warn(s, seat, 'payroll')
			log(s, seat, 'payroll', { bill, paid })
			settleLevies(s, seat)
		}`)
			}
		}
		const module = name => import(pathToFileURL(join(dir, name + '.js')).href)
		return {
			...await module('index'), cards: await module('cards'), helpers: await module('state'),
			close: () => rm(dir, { recursive: true, force: true }),
		}
	} catch (error) {
		await rm(dir, { recursive: true, force: true })
		throw error
	}
}

// NTRview.js - Rendering helpers and visual utilities

import * as rf from './NTRreference'

// Static image URLs, resolved by Vite in dev and build (RNB pattern).
// Filenames must match NTR/static/NTR/images/ exactly.
const IMAGES = {
  // Units - JPG
  allied_unit_commander: new URL('../../../static/NTR/images/allied_unit_commander.jpg', import.meta.url).href,
  allied_unit_infantry: new URL('../../../static/NTR/images/allied_unit_infantry.jpg', import.meta.url).href,
  allied_unit_guard_infantry: new URL('../../../static/NTR/images/allied_unit_guard_infantry.jpg', import.meta.url).href,
  allied_unit_cavalry: new URL('../../../static/NTR/images/allied_unit_cavalry.jpg', import.meta.url).href,
  allied_unit_artillery: new URL('../../../static/NTR/images/allied_unit_artillery.jpg', import.meta.url).href,
  french_unit_commander: new URL('../../../static/NTR/images/french_unit_commander.jpg', import.meta.url).href,
  french_unit_infantry: new URL('../../../static/NTR/images/french_unit_infantry.jpg', import.meta.url).href,
  french_unit_guard_infantry: new URL('../../../static/NTR/images/french_unit_guard_infantry.jpg', import.meta.url).href,
  french_unit_cavalry: new URL('../../../static/NTR/images/french_unit_cavalry.jpg', import.meta.url).href,
  french_unit_artillery: new URL('../../../static/NTR/images/french_unit_artillery.jpg', import.meta.url).href,
  // Approaches - JPG
  approach_wide_clear: new URL('../../../static/NTR/images/approach_wide_clear.jpg', import.meta.url).href,
  approach_wide_rough: new URL('../../../static/NTR/images/approach_wide_rough.jpg', import.meta.url).href,
  approach_wide_wooded: new URL('../../../static/NTR/images/approach_wide_wooded.jpg', import.meta.url).href,
  approach_wide_stream: new URL('../../../static/NTR/images/approach_wide_stream.jpg', import.meta.url).href,
  approach_wide_river: new URL('../../../static/NTR/images/approach_wide_river.jpg', import.meta.url).href,
  approach_wide_road: new URL('../../../static/NTR/images/approach_wide_road.jpg', import.meta.url).href,
  approach_narrow_clear: new URL('../../../static/NTR/images/approach_narrow_clear.jpg', import.meta.url).href,
  approach_narrow_rough: new URL('../../../static/NTR/images/approach_narrow_rough.jpg', import.meta.url).href,
  approach_narrow_wooded: new URL('../../../static/NTR/images/approach_narrow_wooded.jpg', import.meta.url).href,
  approach_narrow_stream: new URL('../../../static/NTR/images/approach_narrow_stream.jpg', import.meta.url).href,
  approach_narrow_river: new URL('../../../static/NTR/images/approach_narrow_river.jpg', import.meta.url).href,
  approach_narrow_road: new URL('../../../static/NTR/images/approach_narrow_road.jpg', import.meta.url).href,
  // UI icons - SVG (need transparency)
  ntr_icon: new URL('../../../static/NTR/images/ntr_icon.png', import.meta.url).href,
  so_frenchReinforcements: new URL('../../../static/NTR/images/so_frenchReinforcements.svg', import.meta.url).href,
  so_santonFort: new URL('../../../static/NTR/images/so_santonFort.svg', import.meta.url).href,
  so_teamPlay: new URL('../../../static/NTR/images/so_teamPlay.svg', import.meta.url).href,
  loading_napoleon: new URL('../../../static/NTR/images/loading_napoleon.svg', import.meta.url).href,
  // Loading bar - GIF
  'loading-bar-black': new URL('../../../static/NTR/images/loading-bar-black.gif', import.meta.url).href,
}

export function getImage(name) {
  return IMAGES[name]
}

export function getUnitImage(unit) {
  const type = unit.type
  const side = unit.side.toLowerCase()
  return getImage(`${side}_unit_${type.toLowerCase()}`)
}

export function getUnitDisplayName(unit) {
  const baseName = rf.UNIT_DISPLAY_NAMES[unit.type] || unit.type
  const strength = unit.strength > 0 ? ` (${unit.strength})` : ''
  const revealed = unit.revealed ? '' : ' (?)'
  return `${baseName}${strength}${revealed}`
}

export function getTerrainPattern(terrain) {
  return `url(#pattern_terrain_${terrain})`
}

export function getApproachColor(approach) {
  const colors = {
    clear: '#95a5a6',
    rough: '#7f8c8d',
    wooded: '#27ae60',
    stream: '#3498db',
    river: '#2980b9',
    road: '#f39c12',
  }
  return colors[approach.terrain] || '#95a5a6'
}

export function getTerrainColor(terrainId) {
  const colors = {
    clear: '#95a5a6',   // gray
    rough: '#7f8c8d',   // darker gray
    wooded: '#27ae60',  // green
    hill: '#8e44ad',    // purple
    town: '#e67e22',    // orange/brown
    fort: '#c0392b',    // red
  }
  return colors[terrainId] || '#95a5a6'
}

export function getApproachPath(approach, localePositions) {
  const from = localePositions[approach.from]
  const to = localePositions[approach.to]
  if (!from || !to) return ''

  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  // Curve the path slightly for parallel approaches
  const curveOffset = approach.curveOffset || 0
  if (curveOffset !== 0) {
    const mx = (from.x + to.x) / 2 - dy / dist * curveOffset
    const my = (from.y + to.y) / 2 + dx / dist * curveOffset
    return `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`
  }

  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`
}

export function getApproachWidth(approach) {
  return approach.type === rf.APPROACH_WIDE ? 8 : 4
}

export function getUnitIcon(unit, size = 32) {
  const side = unit.side.toLowerCase()
  const type = unit.type.toLowerCase()
  return `<img src="${getImage(`${side}_unit_${type}`)}" width="${size}" height="${size}" alt="${unit.type}" />`
}

export function getMoraleColor(side) {
  return side === 'allied' ? '#e74c3c' : '#3498db'
}

export function formatTurnString(turn, phase) {
  if (phase === rf.PHASE_GAME_OVER) return 'Game Over'
  const side = phase === rf.PHASE_ALLIED_TURN ? 'Allied' : 'French'
  return `Round ${turn} - ${side} Turn`
}

export function getPhaseColor(phase) {
  if (phase === rf.PHASE_ALLIED_TURN) return '#e74c3c'
  if (phase === rf.PHASE_FRENCH_TURN) return '#3498db'
  return '#95a5a6'
}

// Animation helpers
export function animateUnitMove(element, fromPos, toPos, duration = 500) {
  return new Promise(resolve => {
    const start = performance.now()
    function animate(time) {
      const elapsed = time - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // Cubic ease out

      const x = fromPos.x + (toPos.x - fromPos.x) * eased
      const y = fromPos.y + (toPos.y - fromPos.y) * eased

      element.style.transform = `translate(${x}px, ${y}px)`

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        resolve()
      }
    }
    requestAnimationFrame(animate)
  })
}

export function animateCombat(attackerElement, defenderElement) {
  // Flash animation for combat
  attackerElement.classList.add('combat-attacker')
  defenderElement.classList.add('combat-defender')

  return new Promise(resolve => {
    setTimeout(() => {
      attackerElement.classList.remove('combat-attacker')
      defenderElement.classList.remove('combat-defender')
      resolve()
    }, 300)
  })
}

// Fog of war visual
export function getFogOverlay(locale) {
  if (locale.fogged && !locale.revealed) {
    return 'rgba(0, 0, 0, 0.5)'
  }
  return 'transparent'
}

// Tooltip content for units
export function getUnitTooltip(unit) {
  const lines = [
    `${rf.UNIT_DISPLAY_NAMES[unit.type]} (${unit.side})`,
    `Strength: ${unit.strength}`,
    `Movement: ${rf.UNIT_STATS[unit.type]?.move || 0}`,
  ]
  if (unit.type === rf.UNIT_COMMANDER) {
    lines.push(`Command: ${rf.UNIT_STATS[unit.type].command}`)
  }
  if (unit.corps) {
    lines.push(`Corps: ${rf.CORPS_DISPLAY_NAMES[unit.corps] || unit.corps}`)
  }
  if (!unit.revealed) {
    lines.unshift('??? HIDDEN ???')
  }
  return lines.join('\n')
}

// Locale tooltip
export function getLocaleTooltip(locale) {
  const terrain = rf.ALL_TERRAINS.find(t => t.id === locale.terrain)
  return `${locale.name}\nTerrain: ${terrain?.name || locale.terrain}\n${locale.objective ? '★ OBJECTIVE ★' : ''}`
}
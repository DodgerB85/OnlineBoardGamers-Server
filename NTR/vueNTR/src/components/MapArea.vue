<script setup>
import { useModelStore } from '../stores/NTRstore'
import { ref, computed, onMounted, watch } from 'vue'
import { t } from '../i18n'
import * as view from '../js/NTRview'
import * as controller from '../js/NTRcontroller'
import * as rf from '../js/NTRreference'

const store = useModelStore()

const svgRef = ref(null)
const panZoom = ref({ x: 0, y: 0, scale: 1 })
const selectedLocale = ref(null)
const selectedUnit = ref(null)
const dragState = ref({ active: false, startX: 0, startY: 0 })

// Board dimensions (Austerlitz map roughly)
const BOARD_WIDTH = 1400
const BOARD_HEIGHT = 900

const localePositions = computed(() => {
  // These would be loaded from the scenario data
  // For now, return a basic grid
  const positions = {}
  store.board.locales.forEach((locale, idx) => {
    positions[locale.id] = locale.position || { x: 100 + (idx % 10) * 120, y: 100 + Math.floor(idx / 10) * 80 }
  })
  return positions
})

function handleSvgClick(event) {
  if (dragState.value.active) return
  const rect = svgRef.value.getBoundingClientRect()
  const x = (event.clientX - rect.left - panZoom.value.x) / panZoom.value.scale
  const y = (event.clientY - rect.top - panZoom.value.y) / panZoom.value.scale

  // Check if clicking on a locale
  for (const [id, pos] of Object.entries(localePositions.value)) {
    const dx = x - pos.x
    const dy = y - pos.y
    if (dx * dx + dy * dy < 400) { // 20px radius
      selectedLocale.value = id
      controller.selectLocale(id)
      return
    }
  }
  selectedLocale.value = null
  controller.clearSelection()
}

function handleMouseDown(event) {
  if (event.button === 1 || (event.button === 0 && event.altKey)) {
    dragState.value = { active: true, startX: event.clientX, startY: event.clientY, startPanX: panZoom.value.x, startPanY: panZoom.value.y }
    event.preventDefault()
  }
}

function handleMouseMove(event) {
  if (!dragState.value.active) return
  const dx = event.clientX - dragState.value.startX
  const dy = event.clientY - dragState.value.startY
  panZoom.value.x = dragState.value.startPanX + dx
  panZoom.value.y = dragState.value.startPanY + dy
}

function handleMouseUp() {
  dragState.value.active = false
}

function handleWheel(event) {
  event.preventDefault()
  const rect = svgRef.value.getBoundingClientRect()
  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top

  const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1
  const newScale = Math.max(0.3, Math.min(3, panZoom.value.scale * zoomFactor))

  // Zoom towards mouse position
  panZoom.value.x = mouseX - (mouseX - panZoom.value.x) * (newScale / panZoom.value.scale)
  panZoom.value.y = mouseY - (mouseY - panZoom.value.y) * (newScale / panZoom.value.scale)
  panZoom.value.scale = newScale
}

function resetView() {
  panZoom.value = { x: 0, y: 0, scale: 1 }
}

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
  window.addEventListener('wheel', handleWheel, { passive: false })
})

// Cleanup
import { onUnmounted } from 'vue'
onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('wheel', handleWheel)
})

const transform = computed(() => `translate(${panZoom.value.x}, ${panZoom.value.y}) scale(${panZoom.value.scale})`)

const unitsAtLocale = computed(() => {
  if (!selectedLocale.value) return []
  return store.board.units.filter(u => u.locale === selectedLocale.value)
})
</script>

<template>
  <div id="mapArea" class="mapContainer" @mousedown="handleMouseDown" @wheel="handleWheel">
    <div class="mapControls">
      <button @click="resetView" class="controlBtn" title="Reset View">🔍</button>
      <button @click="panZoom.scale = Math.min(3, panZoom.scale * 1.2)" class="controlBtn">+</button>
      <button @click="panZoom.scale = Math.max(0.3, panZoom.scale / 1.2)" class="controlBtn">−</button>
      <span class="zoomLevel">{{ Math.round(panZoom.scale * 100) }}%</span>
    </div>

    <svg ref="svgRef" class="mapSvg" :style="{ transform, transformOrigin: '0 0' }" @click="handleSvgClick" width="1400" height="900" viewBox="0 0 1400 900">
      <defs>
        <!-- Arrow marker for approaches -->
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#34495e" />
        </marker>
      </defs>

      <!-- Background -->
      <rect width="1400" height="900" fill="#e8f0e8" />

      <!-- Approaches (connections between locales) -->
      <g class="approaches">
        <path
          v-for="approach in store.board.approaches"
          :key="approach.id"
          :d="view.getApproachPath(approach, localePositions)"
          :stroke="view.getApproachColor(approach)"
          :stroke-width="approach.type === 'wide' ? 8 : 4"
          :stroke-dasharray="approach.terrain === 'road' ? '10,5' : 'none'"
          fill="none"
          :class="{ 'fogged': approach.fogged && store.pov >= 0 }"
        />
      </g>

      <!-- Locales -->
      <g class="locales">
        <g
          v-for="locale in store.board.locales"
          :key="locale.id"
          :transform="`translate(${localePositions[locale.id]?.x || 0}, ${localePositions[locale.id]?.y || 0})`"
          :class="{ selected: selectedLocale === locale.id, objective: locale.objective }"
        >
          <!-- Locale base hex/circle -->
          <circle
            r="22"
            :fill="view.getTerrainPattern(locale.terrain)"
            :stroke="selectedLocale === locale.id ? '#f39c12' : (locale.objective ? '#f39c12' : '#7f8c8d')"
            :stroke-width="selectedLocale === locale.id || locale.objective ? 3 : 1.5"
          />

          <!-- Objective star -->
          <text v-if="locale.objective" x="0" y="6" text-anchor="middle" font-size="18" fill="#f39c12" font-weight="bold">★</text>

          <!-- Locale name -->
          <text x="0" y="38" text-anchor="middle" font-size="9" fill="#2c3e50" class="localeName">
            {{ locale.name }}
          </text>

          <!-- Unit count badges -->
          <g v-if="unitsAtLocale.length > 0" class="unitBadges">
            <rect
              v-for="(side, idx) in ['allied', 'french']"
              :key="side"
              x="idx === 0 ? -28 : 8"
              y="-28"
              width="20"
              height="14"
              rx="3"
              :fill="side === 'allied' ? '#e74c3c' : '#3498db'"
            />
            <text
              v-for="(side, idx) in ['allied', 'french']"
              :key="side"
              x="idx === 0 ? -18 : 18"
              y="-18"
              text-anchor="middle"
              font-size="10"
              fill="white"
              font-weight="bold"
            >
              {{ unitsAtLocale.filter(u => u.side === side.toUpperCase()).length }}
            </text>
          </g>
        </g>
      </g>

      <!-- Units (detailed view when locale selected) -->
      <g v-if="selectedLocale" class="unitDetail" :transform="`translate(${localePositions[selectedLocale]?.x || 0}, ${localePositions[selectedLocale]?.y || 0})`">
        <rect x="-120" y="-100" width="240" height="180" fill="white" stroke="#2c3e50" stroke-width="2" rx="8" />
        <text x="0" y="-80" text-anchor="middle" font-weight="bold" font-size="14" fill="#2c3e50">{{ selectedLocale }}</text>

        <g v-for="(unit, idx) in unitsAtLocale" :key="unit.id" :transform="`translate(0, ${-60 + idx * 22})`">
          <rect x="-110" y="-8" width="220" height="18" :fill="unit.side === 'ALLIED' ? '#fadbd8' : '#d6eaf8'" rx="3" />
          <text x="-100" y="4" font-size="11" :fill="unit.side === 'ALLIED' ? '#c0392b' : '#1b4f72'">
            {{ view.getUnitDisplayName(unit) }}
          </text>
          <text x="80" y="4" font-size="10" text-anchor="end" fill="#7f8c8d">
            Str: {{ unit.strength }} {{ unit.revealed ? '' : '(?)' }}
          </text>
        </g>
      </g>

      <!-- Fog of War overlay -->
      <g v-if="store.pov >= 0" class="fogOfWar">
        <rect
          v-for="locale in store.board.locales"
          :key="'fog-' + locale.id"
          :x="localePositions[locale.id]?.x - 22"
          :y="localePositions[locale.id]?.y - 22"
          width="44"
          height="44"
          fill="rgba(0,0,0,0.4)"
          v-show="locale.fogged && !locale.revealed"
        />
      </g>
    </svg>

    <div class="mapLegend">
      <div class="legendItem"><span class="colorBox allied"></span>{{ t('map.allied') }}</div>
      <div class="legendItem"><span class="colorBox french"></span>{{ t('map.french') }}</div>
      <div class="legendItem"><span class="colorBox objective"></span>{{ t('map.objective') }}</div>
      <div class="legendItem"><span class="colorBox fogged"></span>{{ t('map.fogged') }}</div>
    </div>
  </div>
</template>

<style scoped>
.mapContainer {
  position: relative;
  width: 100%;
  height: 700px;
  background: #d4eafd;
  overflow: hidden;
  border: 1px solid #bdc3c7;
}

.mapControls {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 4px;
  background: white;
  padding: 6px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  z-index: 10;
}

.controlBtn {
  width: 28px;
  height: 28px;
  border: 1px solid #bdc3c7;
  border-radius: 3px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.controlBtn:hover { background: #f0f4f8; }

.zoomLevel {
  display: flex;
  align-items: center;
  padding: 0 8px;
  font-size: 0.8rem;
  color: #2c3e50;
  font-family: monospace;
}

.mapSvg {
  width: 100%;
  height: 100%;
  cursor: grab;
  touch-action: none;
}

.mapSvg:active { cursor: grabbing; }

.localeName {
  pointer-events: none;
  font-family: Arial, sans-serif;
}

.unitBadges text { pointer-events: none; }

.fogged { opacity: 0.3; }

.selected circle { filter: drop-shadow(0 0 4px #f39c12); }
.objective circle { filter: drop-shadow(0 0 3px #f39c12); }

.mapLegend {
  position: absolute;
  bottom: 10px;
  left: 10px;
  display: flex;
  gap: 12px;
  background: white;
  padding: 8px 12px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  font-size: 0.75rem;
  z-index: 10;
}

.legendItem { display: flex; align-items: center; gap: 4px; color: #2c3e50; }
.colorBox { width: 14px; height: 14px; border-radius: 3px; border: 1px solid #bdc3c7; }
.colorBox.allied { background: #e74c3c; }
.colorBox.french { background: #3498db; }
.colorBox.objective { background: #f39c12; }
.colorBox.fogged { background: rgba(0,0,0,0.4); }
</style>
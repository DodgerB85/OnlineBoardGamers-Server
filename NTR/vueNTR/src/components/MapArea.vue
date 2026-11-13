<script setup>
import { useModelStore } from '../stores/NTRstore'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { t } from '../i18n'
import * as view from '../js/NTRview'
import * as controller from '../js/NTRcontroller'
import { BOARD_SIZE, LOCALES } from '../js/NTRmap'

const store = useModelStore()

const containerRef = ref(null)
const panZoom = ref({ x: 0, y: 0, scale: 1 })
const dragState = ref({ active: false, moved: false, startX: 0, startY: 0 })
// Board units -> screen size of the detail panel and badges (map is 5100 px wide)
const UI_SCALE = 5

const mapUrl = view.getImage('map')
const locales = Object.values(LOCALES)
const selectedLocale = computed(() => store.selection.locale)
const selectedApproaches = computed(() => store.board.approaches.filter(a => a.from === selectedLocale.value || a.to === selectedLocale.value))
const unitsAtLocale = computed(() => {
  if (!selectedLocale.value) return []
  return store.board.units.filter(u => u.locale === selectedLocale.value)
})
const unitCounts = computed(() => {
  const counts = {}
  for (const u of store.board.units) {
    counts[u.locale] ??= { ALLIED: 0, FRENCH: 0 }
    counts[u.locale][u.side]++
  }
  return counts
})
const isSelectedUnit = (unit) => store.selection.units.some(u => u.id === unit.id)
const polygonPoints = (locale) => locale.polygon.map(p => p.join(',')).join(' ')

function toggleUnit(unit) {
  controller.selectUnit(unit.id)
}

function selectLocale(id) {
  if (!dragState.value.moved) controller.selectLocale(id)
}

function handleBackgroundClick() {
  if (!dragState.value.moved) controller.clearSelection()
}

function handleMouseDown(event) {
  if (event.button !== 0 && event.button !== 1) return
  dragState.value = { active: true, moved: false, startX: event.clientX, startY: event.clientY, startPanX: panZoom.value.x, startPanY: panZoom.value.y }
}

function handleMouseMove(event) {
  if (!dragState.value.active) return
  const dx = event.clientX - dragState.value.startX
  const dy = event.clientY - dragState.value.startY
  if (Math.abs(dx) + Math.abs(dy) > 4) dragState.value.moved = true
  panZoom.value.x = dragState.value.startPanX + dx
  panZoom.value.y = dragState.value.startPanY + dy
}

function handleMouseUp() {
  dragState.value.active = false
}

function zoomAt(factor, clientX, clientY) {
  const rect = containerRef.value.getBoundingClientRect()
  const mx = clientX === undefined ? rect.width / 2 : clientX - rect.left
  const my = clientY === undefined ? rect.height / 2 : clientY - rect.top
  const newScale = Math.max(0.5, Math.min(8, panZoom.value.scale * factor))
  panZoom.value.x = mx - (mx - panZoom.value.x) * (newScale / panZoom.value.scale)
  panZoom.value.y = my - (my - panZoom.value.y) * (newScale / panZoom.value.scale)
  panZoom.value.scale = newScale
}

function handleWheel(event) {
  event.preventDefault()
  zoomAt(event.deltaY > 0 ? 0.9 : 1.1, event.clientX, event.clientY)
}

function resetView() {
  panZoom.value = { x: 0, y: 0, scale: 1 }
}

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
})

const transform = computed(() => `translate(${panZoom.value.x}px, ${panZoom.value.y}px) scale(${panZoom.value.scale})`)
</script>

<template>
  <div id="mapArea" ref="containerRef" class="mapContainer" @mousedown="handleMouseDown" @wheel="handleWheel">
    <div class="mapControls">
      <button @click="resetView" class="controlBtn" :title="t('map.resetView')">⤢</button>
      <button @click="zoomAt(1.25)" class="controlBtn">+</button>
      <button @click="zoomAt(0.8)" class="controlBtn">−</button>
      <span class="zoomLevel">{{ Math.round(panZoom.scale * 100) }}%</span>
    </div>

    <svg class="mapSvg" :style="{ transform, transformOrigin: '0 0' }" :viewBox="`0 0 ${BOARD_SIZE.width} ${BOARD_SIZE.height}`" preserveAspectRatio="xMidYMin meet">
      <image :href="mapUrl" x="0" y="0" :width="BOARD_SIZE.width" :height="BOARD_SIZE.height" @click="handleBackgroundClick" />

      <!-- Locales: transparent click targets over the printed map -->
      <g class="locales">
        <polygon
          v-for="locale in locales"
          :key="locale.id"
          :points="polygonPoints(locale)"
          class="locale"
          :class="{ selected: selectedLocale === locale.id }"
          tabindex="0"
          role="button"
          :aria-label="t('map.locale') + ' ' + locale.id"
          @click.stop="selectLocale(locale.id)"
          @keydown.enter.prevent="controller.selectLocale(locale.id)"
        />
      </g>

      <!-- Approaches of the selected locale -->
      <g class="approaches">
        <line
          v-for="approach in selectedApproaches"
          :key="approach.id"
          :x1="approach.line[0][0]" :y1="approach.line[0][1]"
          :x2="approach.line[1][0]" :y2="approach.line[1][1]"
          :stroke-width="approach.type === 'wide' ? 30 : 18"
          class="approachLine"
        />
      </g>

      <!-- Unit count badges at each locale's reserve point -->
      <g class="unitBadges">
        <g v-for="(count, localeId) in unitCounts" :key="localeId" :transform="`translate(${LOCALES[localeId]?.position.x || 0}, ${LOCALES[localeId]?.position.y || 0}) scale(${UI_SCALE})`">
          <template v-for="(side, idx) in ['ALLIED', 'FRENCH']" :key="side">
            <g v-if="count[side]" :transform="`translate(${idx === 0 ? -22 : 2}, -8)`">
              <rect width="20" height="16" rx="3" :fill="side === 'ALLIED' ? '#c0392b' : '#1f5f99'" stroke="white" stroke-width="1" />
              <text x="10" y="12" text-anchor="middle" font-size="11" fill="white" font-weight="bold">{{ count[side] }}</text>
            </g>
          </template>
        </g>
      </g>

      <!-- Units (detailed view when locale selected) -->
      <g v-if="selectedLocale && LOCALES[selectedLocale]" class="unitDetail" :transform="`translate(${LOCALES[selectedLocale].position.x}, ${LOCALES[selectedLocale].position.y}) scale(${UI_SCALE})`">
        <rect x="-120" y="-100" width="240" :height="40 + Math.max(1, unitsAtLocale.length) * 22" fill="white" stroke="#2c3e50" stroke-width="2" rx="8" />
        <text x="0" y="-80" text-anchor="middle" font-weight="bold" font-size="14" fill="#2c3e50">{{ t('map.locale') }} {{ selectedLocale }} · {{ t('map.capacity') }} {{ LOCALES[selectedLocale].capacity }}</text>

        <g v-for="(unit, idx) in unitsAtLocale" :key="unit.id"
           :transform="`translate(0, ${-60 + idx * 22})`"
           class="unitRow"
           @click.stop="toggleUnit(unit)">
          <rect x="-110" y="-8" width="220" height="18" :fill="isSelectedUnit(unit) ? '#fff3cd' : (unit.side === 'ALLIED' ? '#fadbd8' : '#d6eaf8')"
                :stroke="isSelectedUnit(unit) ? '#f39c12' : 'none'" stroke-width="2" rx="3" />
          <text x="-100" y="4" font-size="11" :fill="unit.side === 'ALLIED' ? '#c0392b' : '#1b4f72'">
            {{ view.getUnitDisplayName(unit) }}
          </text>
          <text x="80" y="4" font-size="10" text-anchor="end" fill="#7f8c8d">
            Str: {{ unit.strength }} {{ unit.revealed ? '' : '(?)' }}
          </text>
        </g>
      </g>
    </svg>

    <div class="mapLegend">
      <div class="legendItem"><span class="colorBox allied"></span>{{ t('map.allied') }}</div>
      <div class="legendItem"><span class="colorBox french"></span>{{ t('map.french') }}</div>
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

.locale {
  fill: transparent;
  stroke: transparent;
  stroke-width: 8;
  cursor: pointer;
}

.locale:hover, .locale:focus { fill: rgba(243, 156, 18, 0.12); outline: none; }
.locale.selected { fill: rgba(243, 156, 18, 0.2); stroke: #f39c12; stroke-width: 14; }

.approachLine { stroke: #f39c12; stroke-linecap: round; opacity: 0.8; pointer-events: none; }

.unitBadges { pointer-events: none; }

.unitRow { cursor: pointer; }

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
</style>
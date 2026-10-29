/* Standalone annotation workbench. Coordinates always refer to the original JPG. */
(() => {
  'use strict'
  const svgNamespace = 'http://www.w3.org/2000/svg'
  const supplied = window.NTR_BOARD || window.NTR_REGION
  const storageKey = 'ntr-map-extraction:' + supplied.id + ':v' + supplied.seed_revision
  const layerNames = {
    locale: 'Locale polygons', approach: 'Approaches', penalty: 'Penalties',
    capacity: 'Capacity', hill: 'Hills', objective: 'Objectives', setup: 'Setup bars',
    road: 'Roads', reserve: 'Reserve anchors',
  }
  const colours = {blue: '#087eae', red: '#bd3030', green: '#1d9c58', black: '#343c36'}
  const byId = id => document.getElementById(id)
  const clone = value => JSON.parse(JSON.stringify(value))
  const svg = byId('map')
  let data = clone(supplied)
  let selectedId = null
  let mode = 'overlay'
  let view
  let regionBounds = data.region
  let drawing = []
  let drag = null
  const history = []
  const visibleLayers = new Set(Object.keys(layerNames))
  const hiddenFeatures = new Set()

  function validate(candidate) {
    if (candidate.version !== 1 || !Array.isArray(candidate.region) || candidate.region.length !== 4 ||
        !candidate.region.every(Number.isFinite) || candidate.region[2] <= candidate.region[0] || candidate.region[3] <= candidate.region[1] ||
        candidate.source?.image !== window.NTR_REGION.source.image ||
        JSON.stringify(candidate.source?.size) !== JSON.stringify(window.NTR_REGION.source.size) ||
        typeof candidate.id !== 'string' || typeof candidate.description !== 'string' ||
        typeof candidate.coverage?.remaining !== 'string' || !Array.isArray(candidate.features)) {
      throw new Error('Expected a version 1 annotation file for this map, with valid region bounds.')
    }
    const ids = new Set()
    for (const feature of candidate.features) {
      if (!feature.id || ids.has(feature.id) || !Object.hasOwn(layerNames, feature.type) ||
          typeof feature.label !== 'string' || !['reviewed', 'draft'].includes(feature.status) ||
          !feature.properties || typeof feature.properties !== 'object' || Array.isArray(feature.properties)) {
        throw new Error('Invalid feature or duplicate ID: ' + feature.id)
      }
      ids.add(feature.id)
      const geometry = feature.geometry
      if (['locale', 'approach', 'road'].includes(feature.type)) {
        if (!Array.isArray(geometry?.points) || geometry.points.length < (feature.type === 'locale' ? 3 : 2) ||
            !geometry.points.every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))) {
          throw new Error('Invalid point geometry: ' + feature.id)
        }
      } else if (!geometry || !['x', 'y', 'width', 'height', 'angle'].every(k => Number.isFinite(geometry[k])) || geometry.width <= 0 || geometry.height <= 0) {
        throw new Error('Invalid symbol geometry: ' + feature.id)
      }
      if (feature.type === 'setup' && (!Number.isInteger(feature.properties.unit_count) || feature.properties.unit_count < 1 || feature.properties.unit_count > 8)) {
        throw new Error('Setup unit count must be an integer from 1 to 8.')
      }
      if (feature.type === 'approach' && ![null, 1, 2].includes(feature.properties.width_units)) {
        throw new Error('Approach frontage must be unreviewed, one or two pieces wide.')
      }
      if (geometry.stroke_width !== undefined && (!Number.isFinite(geometry.stroke_width) || geometry.stroke_width <= 0)) throw new Error('Invalid stroke thickness.')
      if (feature.crop && !/^crops\/[a-zA-Z0-9-]+\.png$/.test(feature.crop)) throw new Error('Invalid crop path.')
      if (feature.source_bounds && (!Array.isArray(feature.source_bounds) || feature.source_bounds.length !== 4 || !feature.source_bounds.every(Number.isFinite))) throw new Error('Invalid source crop bounds.')
    }
  }

  function message(text) { byId('message').textContent = text }
  function remember() { history.push(clone(data)); if (history.length > 60) history.shift() }
  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data))
      byId('save-state').textContent = 'Saved in this browser. Export JSON to keep a file or share changes.'
    } catch (error) {
      byId('save-state').textContent = 'Browser save failed: ' + error.message + '. Export JSON to keep your edits.'
    }
  }
  function element(name, attrs = {}, parent) {
    const node = document.createElementNS(svgNamespace, name)
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value)
    if (parent) parent.append(node)
    return node
  }
  function text(parent, value, x, y, size = 13, fill = '#34453a') {
    const node = element('text', {x, y, 'font-size': size, 'font-family': 'Georgia, serif', fill, 'text-anchor': 'middle'}, parent)
    node.textContent = value
    return node
  }
  function starPoints() {
    return Array.from({length: 10}, (_, i) => {
      const angle = -Math.PI / 2 + i * Math.PI / 5
      const radius = i % 2 ? 0.43 : 1
      return [Math.cos(angle) * radius, Math.sin(angle) * radius].join(',')
    }).join(' ')
  }
  function drawFeature(feature, parent) {
    const group = element('g', {'data-feature': feature.id}, parent)
    const geometry = feature.geometry
    const props = feature.properties
    if (geometry.points) {
      element(feature.type === 'locale' ? 'polygon' : 'polyline', {
        points: geometry.points.map(p => p.join(',')).join(' '),
        fill: feature.type === 'locale' ? '#43ac8130' : 'none',
        stroke: feature.type === 'locale' ? '#298b64' : feature.type === 'approach' ? '#a3b0b6' : props.road_class === 'main' ? '#ca4350' : '#a48c76',
        'stroke-width': geometry.stroke_width || (feature.type === 'approach' ? 22 : feature.type === 'locale' ? 2 : 1.9),
        'stroke-opacity': feature.type === 'approach' ? 0.4 : 1,
        'stroke-linecap': feature.type === 'approach' ? 'butt' : 'round', 'stroke-linejoin': 'round',
        'stroke-dasharray': feature.type === 'locale' && feature.status === 'draft' ? '8 5' : '',
      }, group)
    } else if (mode === 'crops' && feature.crop) {
      const [left, top, right, bottom] = feature.source_bounds
      element('image', {href: feature.crop, x: left, y: top, width: right - left, height: bottom - top}, group)
      element('rect', {x: left, y: top, width: right - left, height: bottom - top, fill: 'transparent', stroke: '#8fa48b', 'stroke-width': 0.7}, group)
    } else {
      const shape = element('g', {transform: `translate(${geometry.x} ${geometry.y}) rotate(${geometry.angle})`}, group)
      const width = geometry.width
      const height = geometry.height
      const stroke = '#5f7064'
      if (feature.type === 'penalty') {
        const w = width
        const h = height
        const symbol = element('g', {fill: 'none', stroke, 'stroke-width': 1.5}, shape)
        if (props.penalty === 'impassable') {
          element('path', {d: `M ${-w/2} ${-h/2} L 0 ${-h/6} L ${w/2} ${-h/2} V ${-h/6} L ${w/6} 0 L ${w/2} ${h/6} V ${h/2} L 0 ${h/6} L ${-w/2} ${h/2} V ${h/6} L ${-w/6} 0 L ${-w/2} ${-h/6} Z`, 'stroke-width': 1}, symbol)
        } else element('rect', {x: -w / 2, y: -h / 2, width: w, height: h}, symbol)
        if (props.penalty === 'infantry') element('path', {d: `M ${-w/2} ${-h/2} L ${w/2} ${h/2} M ${-w/2} ${h/2} L ${w/2} ${-h/2}`}, symbol)
        if (props.penalty === 'cavalry') element('path', {d: `M ${-w/2} ${h/2} L ${w/2} ${-h/2}`}, symbol)
        if (props.penalty === 'artillery') element('circle', {r: h * 0.32}, symbol)
      } else if (feature.type === 'capacity') {
        element('rect', {x: -width/2, y: -height/2, width, height, fill: 'none', stroke, 'stroke-width': 1.3}, shape)
        text(shape, props.value ?? '?', 0, height * 0.28, height * 0.8, stroke)
      } else if (feature.type === 'hill') {
        element('path', {d: `M 0 ${-height/2} L ${width/2} ${height/2} L ${-width/2} ${height/2} Z`, fill: '#7c8a7e'}, shape)
      } else if (feature.type === 'objective') {
        element('polygon', {points: starPoints(), transform: `scale(${Math.min(width,height)/2})`, fill: 'none', stroke: colours[props.colour] || stroke, 'stroke-width': 0.085}, shape)
      } else if (feature.type === 'setup') {
        const gap = width / props.unit_count
        for (let i = 0; i < props.unit_count; i++) element('rect', {x: -width/2 + i*gap + 1, y: -height/2, width: gap*0.68, height, fill: props.side === 'Allied' ? colours.red : colours.blue, stroke: '#344b4e', 'stroke-width': 1}, shape)
      } else if (feature.type === 'reserve') {
        element('circle', {r: 6, fill: '#fff', stroke: '#4d9b79', 'stroke-width': 2}, shape)
        element('path', {d: 'M -3 0 H 3 M 0 -3 V 3', stroke: '#4d9b79'}, shape)
      }
      // A transparent target keeps small glyphs selectable without altering their artwork.
      element('rect', {x: -width/2 - 3, y: -height/2 - 3, width: width + 6, height: height + 6, fill: 'transparent'}, shape)
    }
    if (feature.id === selectedId) {
      group.classList.add('selected')
      if (geometry.points) {
        geometry.points.forEach((p, index) => element('circle', {cx: p[0], cy: p[1], r: 5, fill: '#fff', stroke: '#006f9c', 'stroke-width': 2, 'data-vertex': index, class: 'handle'}, group))
      } else {
        element('rect', {x: -geometry.width/2 - 5, y: -geometry.height/2 - 5, width: geometry.width + 10, height: geometry.height + 10, transform: `translate(${geometry.x} ${geometry.y}) rotate(${geometry.angle})`, fill: 'none', stroke: '#006f9c', 'stroke-width': 1.6}, group)
      }
    }
  }
  function render() {
    svg.replaceChildren()
    svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`)
    element('rect', {x: 0, y: 0, width: 5100, height: 6600, fill: '#fff'}, svg)
    if (mode === 'overlay') element('image', {href: data.source.image, x: 0, y: 0, width: data.source.size[0], height: data.source.size[1], opacity: byId('opacity').value / 100}, svg)
    const annotations = element('g', {}, svg)
    const sorted = [...data.features].sort((a,b) => (a.type === 'locale' ? -1 : 0) - (b.type === 'locale' ? -1 : 0))
    for (const feature of sorted) if (visibleLayers.has(feature.type) && !hiddenFeatures.has(feature.id)) drawFeature(feature, annotations)
    if (drawing.length) {
      element('polyline', {points: drawing.map(p => p.join(',')).join(' '), stroke: '#bd8624', 'stroke-width': 3, fill: 'none'}, svg)
      drawing.forEach(p => element('circle', {cx: p[0], cy: p[1], r: 4, fill: '#bd8624'}, svg))
    }
    byId('undo').disabled = !history.length
  }
  function fit() {
    const [left, top, right, bottom] = regionBounds
    view = {x: left, y: top, width: right - left, height: bottom - top}
    render()
  }
  function featureBounds(feature) {
    const geometry = feature.geometry
    if (geometry.points) {
      const xs = geometry.points.map(p => p[0]); const ys = geometry.points.map(p => p[1])
      return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
    }
    const radius = Math.hypot(geometry.width, geometry.height) / 2
    return [geometry.x - radius, geometry.y - radius, geometry.x + radius, geometry.y + radius]
  }
  function inRegion(feature) {
    const [left, top, right, bottom] = featureBounds(feature)
    return right >= regionBounds[0] && bottom >= regionBounds[1] && left <= regionBounds[2] && top <= regionBounds[3]
  }
  function chooseRegion() {
    const id = byId('region').value
    const locale = data.features.find(f => f.type === 'locale' && f.properties.locale_id === id)
    if (id === 'pilot') regionBounds = window.NTR_REGION.region
    else if (locale) {
      const [x, y] = locale.properties.reference_point
      regionBounds = [Math.max(0, x - 500), Math.max(0, y - 450), Math.min(5100, x + 500), Math.min(6600, y + 450)]
    } else regionBounds = data.region
    byId('region-description').textContent = id === 'pilot' ? 'Kritschen 39 and the original reviewed occurrences.' : locale ? 'Locale ' + id + ' and its surroundings. Associations and boundary fits remain draft.' : 'All extracted elements across the board. Choose a locale to inspect it at source scale.'
    selectedId = null; byId('editor').hidden = true; byId('selection-hint').hidden = false
    refreshList(); fit()
  }
  function refreshRegions() {
    const picker = byId('region'); picker.replaceChildren()
    for (const [value, label] of [['all', 'Whole board'], ['pilot', 'Original pilot · Kritschen']]) {
      const option = document.createElement('option'); option.value = value; option.textContent = label; picker.append(option)
    }
    for (const feature of data.features.filter(f => f.type === 'locale' && f.properties.reference_point).sort((a, b) => Number(a.properties.locale_id) - Number(b.properties.locale_id))) {
      const option = document.createElement('option'); option.value = feature.properties.locale_id; option.textContent = 'Locale ' + feature.properties.locale_id; picker.append(option)
    }
    for (const locale of data.locale_registry?.locales || []) {
      if (locale.point) continue
      const option = document.createElement('option'); option.disabled = true; option.textContent = 'Locale ' + locale.id + ' · unlocated'; picker.append(option)
    }
    picker.onchange = chooseRegion
    chooseRegion()
  }
  function refreshList() {
    const list = byId('feature-list')
    list.replaceChildren()
    const query = byId('search').value.toLowerCase()
    const regionalFeatures = data.features.filter(inRegion)
    for (const feature of regionalFeatures) {
      if (!visibleLayers.has(feature.type) || !`${feature.id} ${feature.label} ${JSON.stringify(feature.properties)}`.toLowerCase().includes(query)) continue
      const button = document.createElement('button')
      button.className = 'feature-row' + (feature.id === selectedId ? ' active' : '')
      button.textContent = feature.label + (feature.type === 'approach' ? feature.properties.width_units === null ? ' · frontage unreviewed' : ' · ' + feature.properties.width_units + ' wide' : '')
      if (feature.status === 'draft') {
        const tag = document.createElement('span'); tag.className = 'draft-tag'; tag.textContent = 'DRAFT'; button.append(tag)
      }
      button.onclick = () => select(feature.id)
      const row = document.createElement('div'); row.className = 'feature-item'
      const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = !hiddenFeatures.has(feature.id)
      checkbox.setAttribute('aria-label', 'Show ' + feature.label)
      checkbox.onchange = () => { if (checkbox.checked) hiddenFeatures.delete(feature.id); else hiddenFeatures.add(feature.id); render() }
      row.append(checkbox, button); list.append(row)
    }
    byId('counts').textContent = `${regionalFeatures.length} in region / ${data.features.length} total · ${regionalFeatures.filter(f => f.status === 'reviewed').length} reviewed`
    byId('coverage').textContent = data.description + ' Remaining: ' + data.coverage.remaining
    document.querySelectorAll('[data-layer-count]').forEach(node => {
      node.textContent = regionalFeatures.filter(f => f.type === node.dataset.layerCount).length
    })
  }
  function select(id) {
    selectedId = id
    const feature = data.features.find(f => f.id === id)
    byId('editor').hidden = !feature
    byId('selection-hint').hidden = Boolean(feature)
    if (feature) {
      byId('feature-id').textContent = feature.id
      byId('edit-label').value = feature.label
      byId('edit-status').value = feature.status
      byId('approach-width-field').hidden = feature.type !== 'approach'
      if (feature.type === 'approach') byId('edit-width').value = feature.properties.width_units ?? ''
      byId('edit-properties').value = JSON.stringify(feature.properties, null, 2)
      byId('edit-geometry').value = JSON.stringify(feature.geometry, null, 2)
      const crop = byId('source-crop'); crop.replaceChildren()
      if (feature.crop) {
        const p = document.createElement('p'); p.textContent = 'Original occurrence crop (fixed evidence; moving the annotation does not move this crop).'
        const link = document.createElement('a'); link.href = feature.crop; link.target = '_blank'; link.rel = 'noopener'
        const img = document.createElement('img'); img.src = feature.crop; img.alt = feature.label + ' source evidence'; link.append(img)
        crop.append(p, link)
      } else if (feature.type !== 'reserve') {
        const bounds = featureBounds(feature)
        const [left, top, right, bottom] = bounds
        const preview = element('svg', {viewBox: `${left - 12} ${top - 12} ${right - left + 24} ${bottom - top + 24}`, width: '100%', height: 130, 'aria-label': 'Source image around this element'}, crop)
        element('image', {href: data.source.image, x: 0, y: 0, width: data.source.size[0], height: data.source.size[1]}, preview)
      }
    }
    refreshList(); render()
  }
  function changed() { save(); select(selectedId) }
  function position(event) {
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse())
    return {x: Math.round(point.x * 10) / 10, y: Math.round(point.y * 10) / 10}
  }
  function newFeature(type, geometry) {
    const properties = {
      capacity: {value: 4, locale_id: ''}, penalty: {penalty: 'infantry', approach_id: '', enters_locale_id: ''},
      objective: {colour: 'blue', locale_id: ''}, setup: {side: 'French', commander: '', unit_count: 3, locale_id: ''},
      hill: {elevation: 0, locale_id: ''},
      approach: {locales: [], width_units: 1, width_class: 'narrow'}, road: {road_class: 'local'}, reserve: {locale_id: ''}, locale: {locale_id: ''},
    }
    return {id: type + '-' + crypto.randomUUID(), type, label: 'New ' + type, geometry, properties: properties[type], status: 'draft'}
  }

  validate(data)
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved) { const candidate = JSON.parse(saved); validate(candidate); data = candidate }
  } catch (error) { byId('save-state').textContent = 'Could not restore browser edits: ' + error.message }

  for (const [type, name] of Object.entries(layerNames)) {
    const label = document.createElement('label'); label.className = 'layer'
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = true; checkbox.dataset.layer = type
    checkbox.onchange = () => { if (checkbox.checked) visibleLayers.add(type); else visibleLayers.delete(type); refreshList(); render() }
    const count = document.createElement('small'); count.dataset.layerCount = type
    label.append(checkbox, document.createTextNode(name), count); byId('layers').append(label)
  }
  document.querySelectorAll('[data-mode]').forEach(button => {
    button.onclick = () => {
      mode = button.dataset.mode
      document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === button)))
      byId('opacity').disabled = mode !== 'overlay'
      message(mode === 'crops' ? 'Exact source crops on white. Geometry remains independently toggleable.' : mode === 'reconstruction' ? 'Redrawn elements on white; the original map is hidden. The reserve anchor is an added placement aid.' : 'Overlay: compare redrawn elements against the original image.')
      render()
    }
  })
  byId('opacity').oninput = () => { byId('opacity-value').value = byId('opacity').value + '%'; render() }
  byId('fit').onclick = fit
  byId('search').oninput = refreshList
  for (const [id, enabled] of [['all-layers', true], ['no-layers', false]]) byId(id).onclick = () => {
    if (enabled) hiddenFeatures.clear()
    document.querySelectorAll('[data-layer]').forEach(box => { box.checked = enabled; if (enabled) visibleLayers.add(box.dataset.layer); else visibleLayers.delete(box.dataset.layer) })
    refreshList(); render()
  }
  byId('editor').onsubmit = event => {
    event.preventDefault()
    try {
      const candidate = clone(data)
      const feature = candidate.features.find(f => f.id === selectedId)
      Object.assign(feature, {label: byId('edit-label').value, status: byId('edit-status').value, properties: JSON.parse(byId('edit-properties').value), geometry: JSON.parse(byId('edit-geometry').value)})
      if (feature.type === 'approach') {
        feature.properties.width_units = byId('edit-width').value === '' ? null : Number(byId('edit-width').value)
        feature.properties.width_class = feature.properties.width_units === null ? 'unreviewed' : feature.properties.width_units === 1 ? 'narrow' : 'wide'
      }
      validate(candidate); remember(); data = candidate; changed(); message('Changes applied and saved in this browser.')
    } catch (error) { message('Changes not applied: ' + error.message) }
  }
  byId('delete').onclick = () => {
    if (!selectedId) return
    remember(); data.features = data.features.filter(f => f.id !== selectedId); selectedId = null; changed()
  }
  byId('undo').onclick = () => {
    if (!history.length) return
    data = history.pop(); selectedId = null; changed(); message('Undid the last annotation change.')
  }
  byId('restore').onclick = () => {
    if (!confirm('Replace your browser edits with the supplied first-region annotations? Export JSON first to keep your edits.')) return
    remember(); data = clone(supplied); selectedId = null; hiddenFeatures.clear(); changed(); refreshRegions()
  }
  function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], {type}))
    const link = document.createElement('a'); link.href = url; link.download = name; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  byId('export-json').onclick = () => download(data.id + '.json', JSON.stringify(data, null, 2) + '\n', 'application/json')
  byId('export-svg').onclick = async () => {
    const button = byId('export-svg'); button.disabled = true
    try {
      const output = svg.cloneNode(true)
      output.setAttribute('xmlns', svgNamespace); output.setAttribute('width', view.width); output.setAttribute('height', view.height)
      output.querySelectorAll('.handle').forEach(node => node.remove())
      // Inline raster evidence so the SVG remains usable after it leaves this folder.
      for (const image of output.querySelectorAll('image')) {
        const response = await fetch(image.getAttribute('href'))
        if (!response.ok) throw new Error('Could not load image for SVG export.')
        const blob = await response.blob()
        const reader = new FileReader()
        const url = await new Promise((resolve, reject) => { reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob) })
        image.setAttribute('href', url)
      }
      download(data.id + '.svg', new XMLSerializer().serializeToString(output), 'image/svg+xml')
    } catch (error) { message('SVG export failed: ' + error.message + '. Raster export requires serving this folder over HTTP; JSON export works when opened directly.') }
    finally { button.disabled = false }
  }
  byId('import-json').onchange = async event => {
    const file = event.target.files[0]
    if (!file) return
    try {
      const candidate = JSON.parse(await file.text()); validate(candidate)
      remember(); data = candidate; selectedId = null; drawing = []; hiddenFeatures.clear(); changed(); refreshRegions(); message('Imported ' + file.name)
    } catch (error) { message('Import rejected: ' + error.message) }
    event.target.value = ''
  }
  byId('cancel').onclick = () => { drawing = []; render(); message('Drawing cancelled.') }
  byId('tool').onchange = () => { drawing = []; render(); message('Choose points on the map, then Finish drawing. Select / drag returns to editing.') }
  byId('finish').onclick = () => {
    const tool = byId('tool').value
    if (!['polygon', 'line'].includes(tool) || drawing.length < (tool === 'polygon' ? 3 : 2)) return message('Draw at least ' + (tool === 'polygon' ? 3 : 2) + ' points first.')
    const feature = newFeature(tool === 'polygon' ? 'locale' : byId('new-type').value === 'road' ? 'road' : 'approach', {points: clone(drawing)})
    remember(); data.features.push(feature); selectedId = feature.id; drawing = []; byId('tool').value = 'select'; changed()
  }
  svg.addEventListener('wheel', event => {
    event.preventDefault()
    const p = position(event); const factor = event.deltaY > 0 ? 1.15 : 1/1.15
    if (view.width * factor < 80 || view.width * factor > 9000) return
    view.x = p.x - (p.x - view.x)*factor; view.y = p.y - (p.y - view.y)*factor
    view.width *= factor; view.height *= factor; render()
  }, {passive: false})
  svg.onpointerdown = event => {
    if (event.button !== 0) return
    const point = position(event)
    const tool = byId('tool').value
    if (tool === 'symbol') {
      const type = byId('new-type').value
      if (['approach', 'road'].includes(type)) return message('Use Draw line for roads and approaches.')
      const feature = newFeature(type, {x: point.x, y: point.y, width: 30, height: 30, angle: 0})
      remember(); data.features.push(feature); selectedId = feature.id; changed(); return
    }
    if (tool === 'polygon' || tool === 'line') { drawing.push([point.x, point.y]); render(); return }
    const target = event.target.closest('[data-feature]')
    const vertex = event.target.getAttribute('data-vertex')
    select(target ? target.dataset.feature : null)
    drag = {point, view: {...view}, feature: selectedId ? clone(data.features.find(f => f.id === selectedId)) : null, vertex, moved: false}
    svg.setPointerCapture(event.pointerId)
  }
  svg.onpointermove = event => {
    const p = position(event); byId('coordinates').textContent = `${Math.round(p.x)}, ${Math.round(p.y)} px`
    if (!drag) return
    const dx = p.x - drag.point.x; const dy = p.y - drag.point.y
    if (!drag.feature) {
      view.x -= dx; view.y -= dy; render(); return
    }
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 1) return
    if (!drag.moved) { remember(); drag.moved = true }
    const feature = data.features.find(f => f.id === drag.feature.id)
    const original = drag.feature.geometry
    if (original.points) {
      feature.geometry.points = original.points.map((point, index) => drag.vertex === null || Number(drag.vertex) === index ? [point[0] + dx, point[1] + dy] : [...point])
    } else { feature.geometry.x = original.x + dx; feature.geometry.y = original.y + dy }
    // Moving a verified placement makes its new location provisional until checked again.
    feature.status = 'draft'
    render()
  }
  function endDrag() { if (drag?.moved) changed(); drag = null }
  svg.onpointerup = endDrag
  svg.onpointercancel = endDrag
  document.addEventListener('keydown', event => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return
    if ((event.ctrlKey || event.metaKey) && event.key === 'z') { event.preventDefault(); byId('undo').click() }
    if (event.key === 'Escape') { drawing = []; select(null) }
  })
  refreshRegions()
})()

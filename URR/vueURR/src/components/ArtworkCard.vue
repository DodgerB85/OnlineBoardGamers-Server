<script setup>
import { ref } from "vue"
defineProps({ src: { type: String, required: true }, alt: { type: String, required: true } })
const preview = ref(null)
const previewZoom = ref(1)
function open() { previewZoom.value = 1; preview.value.showModal() }
function close() { preview.value.close() }
</script>

<template>
	<div class="artworkCard">
		<a class="artworkButton" :href="src" @click.stop.prevent="open" @keydown.enter.stop @keydown.space.stop.prevent="open" :aria-label="`Enlarge ${alt}`" title="Click to enlarge"><img :src="src" :alt="alt" /><svg class="enlargeCue" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8" cy="8" r="4.5" /><path d="M11.5 11.5 16 16M8 5.5v5M5.5 8h5" /></svg></a>
		<Teleport to="body"><dialog ref="preview" class="artworkPreview" :aria-label="alt" @click="($event.target === preview) && close()"><div class="artworkHeader"><div class="artworkTitle"><b>{{ alt }}</b><button type="button" @click="close">Close</button></div><div class="artworkZoom" role="group" aria-label="Card zoom"><button type="button" :disabled="previewZoom <= 1" @click="previewZoom = Math.max(1, previewZoom - .5)" aria-label="Zoom out card">−</button><button type="button" @click="previewZoom = 1" :aria-label="`Fit card to window · current zoom ${Math.round(previewZoom * 100)}%`" title="Fit card to window">{{ Math.round(previewZoom * 100) }}%</button><button type="button" :disabled="previewZoom >= 2" @click="previewZoom = Math.min(2, previewZoom + .5)" aria-label="Zoom in card">+</button></div></div><div class="artworkImageViewport" role="region" :aria-label="`${alt} card image`" tabindex="0"><img :src="src" :alt="alt" :style="{ width: `${previewZoom * 100}%` }" /></div></dialog></Teleport>
	</div>
</template>

<style scoped>
.artworkCard { width: 100%; }.artworkButton { position: relative; display: block; width: 100%; padding: 0; margin: 0; border: 0; border-radius: 0; background: transparent; cursor: zoom-in; }.artworkButton img { display: block; width: 100%; }.artworkButton:focus-visible { outline: 2px solid #177daf; outline-offset: 2px; }
.enlargeCue { position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); width: min(18px, 10%); height: auto; aspect-ratio: 1; box-sizing: border-box; border: 1px solid #b3a481; border-radius: 3px; background: #fffdf4; fill: none; stroke: #625940; stroke-width: 1.5; pointer-events: none; }.artworkButton:hover .enlargeCue, .artworkButton:focus-visible .enlargeCue { border-color: #177daf; background: #edf6fd; stroke: #12628c; }
.artworkPreview { top: 20px; bottom: auto; margin: 0 auto; width: 700px; max-width: calc(100vw - 40px); max-height: calc(100vh - 40px); box-sizing: border-box; padding: 12px; border: 2px solid #8e805e; border-radius: 6px; background: #fff9df; color: #302f27; }.artworkPreview[open] { display: flex; flex-direction: column; overflow: hidden; }.artworkPreview::backdrop { background: #0008; }.artworkHeader { flex-shrink: 0; margin-bottom: 10px; font-size: 14px; }.artworkTitle { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.artworkZoom { display: flex; justify-content: flex-end; gap: 4px; margin-top: 6px; }.artworkPreview button { flex-shrink: 0; min-width: 40px; padding: 6px 12px; border: 1px solid #998a67; background: #fffdf4; border-radius: 3px; font: inherit; cursor: pointer; }.artworkPreview button:disabled { opacity: .45; cursor: default; }
.artworkImageViewport { flex: 1 1 auto; min-height: 0; overflow: auto; }.artworkImageViewport img { display: block; max-width: none; }.artworkImageViewport:focus-visible { outline: 2px solid #177daf; outline-offset: -2px; }
@media (max-width: 1050px) { .artworkPreview button { min-height: 44px; } }
</style>

<script setup>
import * as rf from "../js/URRreference"
import { getStateOrderImage, getPlayerMarkerImage } from "../js/URRassets"
defineProps({ change: { type: Object, required: true } })
</script>

<template>
	<div class="leadershipChange"><img :src="getStateOrderImage(change.id)" alt="" /><span>{{ rf.STATE_NAMES[change.id] }} · {{ change.hasEmerged ? 'Emerged' : change.isActive ? 'Monarch' : 'Ownership leader' }}<small v-if="change.hasEmerged">{{ change.king === null ? 'No monarch' : `${change.nextName} is monarch` }}</small><small v-else>{{ change.previousName }} → {{ change.nextName }}</small></span><img v-if="change.king !== null" :src="getPlayerMarkerImage(change.king)" :alt="change.nextName" /></div>
</template>

<style scoped>
.leadershipChange { display: flex; align-items: center; gap: 7px; margin: 6px 0; padding: 5px 7px; border-left: 3px solid #177daf; background: #edf6fd; text-align: left; font-size: 13px; line-height: 1.4; }.leadershipChange > span { min-width: 0; overflow-wrap: anywhere; }.leadershipChange img { width: 25px; height: 25px; flex-shrink: 0; }.leadershipChange small { display: block; margin-top: 2px; font-size: 12px; color: #655a42; }.leadershipChange > img:last-child { margin-left: auto; }
</style>

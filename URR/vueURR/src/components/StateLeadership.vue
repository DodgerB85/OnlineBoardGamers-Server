<script setup>
import PlayerMarker from "./PlayerMarker.vue"
import * as rf from "../js/URRreference"
import * as assets from "../js/URRassets"
defineProps({ change: { type: Object, required: true } })
</script>

<template>
	<div class="leadershipChange"><img :src="assets.getStateOrderImage(change.id)" alt="" /><span>{{ rf.STATE_NAMES[change.id] }} · {{ change.hasEmerged ? 'Emerged' : change.isActive ? 'Monarch' : 'Ownership leader' }}<small v-if="change.hasEmerged && change.king === null">No monarch</small><small v-else-if="!change.hasEmerged"><PlayerMarker v-if="change.previousKing !== null" :index="change.previousKing" :name="change.previousName" /><template v-else>No leader</template> → <PlayerMarker v-if="change.king !== null" :index="change.king" :name="change.nextName" /><template v-else>No leader</template></small></span><PlayerMarker v-if="change.hasEmerged && change.king !== null" :index="change.king" :name="change.nextName" /></div>
</template>

<style scoped>
.leadershipChange { display: flex; align-items: center; gap: 7px; margin: 6px 0; padding: 5px 7px; border-left: 3px solid #177daf; background: #edf6fd; text-align: left; font-size: 16px; font-weight: 600; line-height: 1.4; }.leadershipChange > span { min-width: 0; overflow-wrap: anywhere; }.leadershipChange img { width: 25px; height: 25px; flex-shrink: 0; }.leadershipChange small { display: block; margin-top: 2px; font-size: 16px; font-weight: 600; color: #655a42; }.leadershipChange > img:last-child { margin-left: auto; }
</style>

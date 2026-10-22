<script setup>
import { useI18n } from "vue-i18n"

const { t } = useI18n()
</script>

<template>
	<div id="footer">
		<p>{{ t('app.footerAttribution') }}</p>
		<p>{{ t('app.footerLicense') }} <code>static/ROW/artwork-license.txt</code>.</p>
	</div>
</template>

<style scoped>
#footer { background: #333; color: #eee; min-height: 60px; padding: 10px; font-size: 12px; }
</style>

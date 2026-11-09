<script setup>
import { useI18n } from "vue-i18n"

const { t } = useI18n()
</script>

<template>
	<div id="footer">
		<div class="content">
			<p>{{ t('app.footerAttribution') }}</p>
			<p>{{ t('app.footerLicense') }}</p>
			<p>{{ t('app.footerIcons') }} <a href="https://game-icons.net" target="_blank" rel="noopener">game-icons.net</a>.</p>
		</div>
	</div>
</template>

<style scoped>
#footer {
	background-color: #333;
	color: #eee;
	margin: 0;
	min-height: 100px;
	height: fit-content;
	padding: 10px;
	position: relative;
	flex-shrink: 0;
}
#footer .content { width: 95%; margin: auto; text-align: left; position: relative; }
#footer a { color: #d4eafd; }
</style>

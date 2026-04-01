const js = require("@eslint/js")
const pluginVue = require("eslint-plugin-vue")
const skipFormatting = require("@vue/eslint-config-prettier/skip-formatting")
const globals = require("globals")

module.exports = [
	{
		// Ensure it matches files in subdirectories
		files: ["**/*.{js,mjs,jsx,vue}"],
		languageOptions: {
			// Tell ESLint you are in a browser so it knows 'window', etc.
			globals: {
				...globals.browser,
			},
		},
	},
	{
		name: "app/files-to-ignore",
		ignores: ["dist/", "dist-ssr/", "coverage/**"],
	},
	js.configs.recommended,
	...pluginVue.configs["flat/essential"],
	skipFormatting,
	{
		rules: {
			"no-undef": "error",
			"vue/no-undef-properties": "error",
			"no-dupe-else-if": "error",
			"no-unreachable": "off",
			"no-unused-vars": [
				"error",
				{
					args: "all",
					argsIgnorePattern: "^_",
					vars: "all",
				},
			],
		},
	},
]

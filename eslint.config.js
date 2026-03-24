const globals = require("globals")
const pluginJs = require("@eslint/js")
const pluginVue = require("eslint-plugin-vue")

module.exports = [
	// 1. Base JS Recommended
	pluginJs.configs.recommended,

	// 2. Vue Essential (ensure this doesn't accidentally "overwrite" the JS rules)
	...pluginVue.configs["flat/essential"],

	// 3. Application logic for all files
	{
		files: ["**/*.js", "**/*.vue"],
		name: "user-overrides",
		languageOptions: {
			globals: globals.browser,
			ecmaVersion: "latest",
			sourceType: "module",
		},
		rules: {
			"no-dupe-else-if": "error", // Force this rule on
			"vue/no-undef-properties": "error", // <--- ADD THIS
			// Add this to catch message1
			"no-unused-vars": [
				"error",
				{
					args: "all", // Check all arguments
					argsIgnorePattern: "^_", // Allow arguments starting with _ (e.g., _idx)
					vars: "all", // Check all variables
				},
			],
		},
	},
]

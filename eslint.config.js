const globals = require("globals");
const pluginJs = require("@eslint/js");
const pluginVue = require("eslint-plugin-vue");

module.exports = [
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...pluginVue.configs["flat/essential"],
   //...pluginVue.configs["vue3-recommended"].rules,
];

 /*const globals = require("globals");
 const pluginJs = require("@eslint/js");
 const pluginVue = require("eslint-plugin-vue");

 module.exports = [
   {
     languageOptions: {
       globals: {
         ...globals.browser,
         //...globals.node, // Add Node.js globals if needed
       },
       sourceType: 'module', // If you're using ES modules
     },
   },
   {
     plugins: {
       vue: pluginVue,
     },
     rules: {
       ...pluginJs.configs.recommended.rules,
       ...pluginVue.configs["vue3-recommended"], // Try this
     },
   },
 ];*/
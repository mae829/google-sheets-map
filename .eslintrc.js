module.exports = {
	"env": {
		"browser": true,
		"es6": true,
		"node": true
	},
	"plugins": [
		"no-jquery"
	],
	"extends": [
		"eslint:recommended",
		"plugin:@wordpress/eslint-plugin/recommended-with-formatting",
		"plugin:no-jquery/all",
	],
	"parserOptions": {
		"ecmaVersion": 2018,
		"sourceType": "module"
	},
	"rules": {
		"@wordpress/no-global-event-listener": "off",
		"arrow-parens": [
			"error",
			"as-needed"
		],
		"complexity": [
			"warn", {
				"max": 8
			}
		],
		"eqeqeq": [ "error", "smart" ],
		"lines-around-comment": "off",
		"space-in-parens": [ "warn", "always" ],
		"no-console": [
			"error", {
				"allow": [
					"warn",
					"error"
				]
			}
		],
		"no-empty-function": [
			"warn", {
				"allow": [
					"methods"
				]
			}
		],
		"no-multi-spaces": [
			"warn", {
				"exceptions": {
					"VariableDeclarator": true
				}
			}
		],
		"no-unused-vars": [
			"error", {
				"args": "after-used"
			}
		],
		"vars-on-top": "off",
		"wrap-iife": [
			"error",
			"inside"
		],
		"yoda": "off"
	}
};

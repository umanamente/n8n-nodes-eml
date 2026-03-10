const baseConfig = require('./eslint.config.cjs');

module.exports = [
	...baseConfig,
	{
		files: ['package.json'],
		rules: {
			'n8n-nodes-base/community-package-json-name-still-default': 'error',
		},
	},
];

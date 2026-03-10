const fs = require('fs');
const path = require('path');
const { task, src, dest, series } = require('gulp');

task('build:icons', series(copyNodeIcons, copyCredentialIcons));

function copyNodeIcons() {
	const nodeSource = path.resolve('nodes', '**', '*.{png,svg}');
	const nodeDestination = path.resolve('dist', 'nodes');

	return src(nodeSource, { allowEmpty: true }).pipe(dest(nodeDestination));
}

function copyCredentialIcons() {
	const credentialsDir = path.resolve('credentials');

	if (!fs.existsSync(credentialsDir)) {
		return Promise.resolve();
	}

	const credSource = path.resolve(credentialsDir, '**', '*.{png,svg}');
	const credDestination = path.resolve('dist', 'credentials');

	return src(credSource).pipe(dest(credDestination));
}

const core = require('@actions/core');
const github = require('@actions/github');

const fs = require('fs');

try {
	const qmodUrl = core.getInput('qmod');
	const modJsonPath = core.getInput('mod-json')
	const modJson = JSON.parse(fs.readFileSync(modJsonPath))

	console.log(`QMod URL: ${qmodUrl}`);
	console.log(`mod.json Path: ${modJsonPath}`);
	console.log(`mod.json: ${modJson}`);
} catch (error) {
	core.setFailed(error.message);
}
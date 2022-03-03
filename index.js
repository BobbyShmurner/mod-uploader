const core = require('@actions/core');
const github = require('@actions/github');

try {
	const qmodUrl = core.getInput('qmod');
	console.log(`QMod URL: ${qmodUrl}`);
} catch (error) {
	core.setFailed(error.message);
}
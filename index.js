const core = require('@actions/core');
const github = require('@actions/github');

const fs = require('fs');

async function main() {
	const qmodUrl = core.getInput('qmod');
	const modJsonPath = core.getInput('mod-json');
	const modJson = JSON.parse(fs.readFileSync(modJsonPath));

	console.log("Getting Octokit");

	const gitToken = core.getInput('token');
	const octokit = github.getOctokit(gitToken);

	console.log("Forking Mod Repo");

	await octokit.rest.repos.createFork({
		owner: "BobbyShmurner",
		repo: "QuestModRepo"
	});
}

try {
	main();
} catch (error) {
	core.setFailed(error.message);
}
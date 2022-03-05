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

	console.log("Getting Fork of Mod Repo");

	var modRepo;
	var hasForked = false;
	var timeoutTime = (new Date()).getTime() + (60 * 1000);

	try {
		modRepo = await octokit.rest.repos.get({
			owner: github.context.repo.owner,
			repo: "QuestModRepo"
		});
	} catch (error) {
		console.setFailed("Failed to find fork of the Mod Repo. Please make sure a fork of the repo exists. You can find the repo here: https://github.com/BobbyShmurner/QuestModRepo");
	}

	console.log(JSON.stringify(modRepo, null, 4));
}

try {
	main();
} catch (error) {
	core.setFailed(error.message);
}
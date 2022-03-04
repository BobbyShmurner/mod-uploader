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
	var timeoutTime = new Date().getTime() + (60 * 1000);

	while (true) {
		try {
			modRepo = await octokit.rest.repos.get({
				owner: github.context.repo.owner,
				repo: "TetrLang"
			});

			break;
		} catch (error) {
			if (timeoutTime < Date().getTime()) throw "Times out when creating a fork of the Mod Repo. Maybe try creating the fork manually?";
			if (hasForked) continue;

			console.log("Failed to find fork, forking now...");
			hasForked = true;

			await octokit.rest.repos.createFork({
				owner: "sc2ad",
				repo: "TetrLang"
			});
		}
	}

	console.log(modRepo.url);
}

try {
	main();
} catch (error) {
	core.setFailed(error.message);
}
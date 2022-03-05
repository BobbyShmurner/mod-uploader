const core = require('@actions/core');
const github = require('@actions/github');

const fs = require('fs');
const shell = require('shelljs')
const semver = require('semver')

async function main() {
	const modJsonPath = core.getInput('mod-json');
	const modJson = JSON.parse(fs.readFileSync(modJsonPath));
	var notes = [];

	core.info("Getting Octokit");

	const gitToken = core.getInput('token');
	const octokit = github.getOctokit(gitToken);

	core.info("Getting Fork of Mod Repo");

	var modRepo;
	var hasForked = false;
	var timeoutTime = (new Date()).getTime() + (60 * 1000);

	try {
		modRepo = (await octokit.rest.repos.get({
			owner: github.context.repo.owner,
			repo: "QuestModRepo"
		})).data;
	} catch {
		core.setFailed("Failed to find fork of the Mod Repo. Please make sure a fork of the repo exists. You can find the repo here: https://github.com/BigManBobby/QuestModRepo");
		return;
	}

	if (!modRepo.fork) {
		core.setFailed(`${modRepo.html_url} is not a fork of https://github.com/BigManBobby/QuestModRepo`);
		return;
	}

	core.info("Cloning fork");
	shell.exec(`git clone ${modRepo.html_url}`);

	core.info("Getting the repo's mods");
	const repoMods = JSON.parse(fs.readFileSync("QuestModRepo/mods.json"));

	core.info("Adding mod entry to mod repo");

	if (!repoMods.hasOwnProperty(modJson.packageVersion)) {
		if (semver.valid(modJson.packageVersion)) {
			repoMods[modJson.packageVersion] = [];

			const msg = `There were no mods found for the version ${modJson.packageVersion}, so a new verion entry was created`;

			core.warning(msg);
			notes.push(msg);
		} else {
			core.setFailed(`Version ${modJson.packageVersion} is invalid!`);
			return;
		}
	}

	repoMods[modJson.packageVersion].push(ConstructModEntry(modJson));
	core.info(JSON.stringify(repoMods, null, 4));
}

function ConstructModEntry(modJson) {
	var cover = core.getInput('cover');
	var authorIcon = core.getInput('author-icon');

	const modEntry = {
		name: modJson.name,
		description: modJson.description,
		id: modJson.id,
		version: modJson.version,
		downloadLink: core.getInput('qmod-url'),
		cover: cover,
		author: {
			name: modJson.author,
			icon: authorIcon
		}
	}

	return modEntry;
}

try {
	main();
} catch (error) {
	core.setFailed(error.message);
}
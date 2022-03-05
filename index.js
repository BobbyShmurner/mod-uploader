const core = require('@actions/core');
const github = require('@actions/github');
const gitToken = core.getInput('token');
const octokit = github.getOctokit(gitToken);

const fs = require('fs');
const shell = require('shelljs')
const semver = require('semver')

async function Main() {
	try {
		const modJsonPath = core.getInput('mod-json');

		if (!fs.existsSync(modJsonPath)) {
			throw `File "${modJsonPath}" does not exist`;
		}

		const modJson = JSON.parse(fs.readFileSync(modJsonPath));
		var notes = [];

		core.info("Getting Octokit");

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
			throw "Failed to find fork of the Mod Repo. Please make sure a fork of the repo exists. You can find the repo here: https://github.com/BigManBobby/QuestModRepo";
		}

		if (!modRepo.fork) {
			throw `${modRepo.html_url} is not a fork of https://github.com/BigManBobby/QuestModRepo`;
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
				throw `Version ${modJson.packageVersion} is invalid!`;
			}
		}

		repoMods[modJson.packageVersion].push(ConstructModEntry(modJson, modRepo));
		core.info(JSON.stringify(repoMods, null, 4));
	} catch (error) {
		core.setFailed(error);
	}
}

function ConstructModEntry(modJson, modRepo) {
	var cover = core.getInput('cover');
	var authorIcon = core.getInput('author-icon');

	if (cover == '') {
		if (!fs.existsSync('cover.png')) throw 'No core image was specifed, and "cover.png" could not be found';
		cover = `https://github.com/${github.context.repo.owner}/${github.context.repo.repo}/raw/${github.context.ref}/cover.png`
	}

	if (authorIcon == '') {
		authorIcon = modRepo.owner.avatar_url;
	}

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

Main();
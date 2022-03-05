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

		core.info("Getting Fork of Mod Repo");

		var modRepo;
		var currentUser;

		try {
			modRepo = (await octokit.rest.repos.get({
				owner: github.context.repo.owner,
				repo: "QuestModRepo"
			})).data;

			currentUser = modRepo.owner;
		} catch {
			throw "Failed to find fork of the Mod Repo. Please make sure a fork of the repo exists. You can find the repo here: https://github.com/BigManBobby/QuestModRepo";
		}

		if (!modRepo.fork) {
			throw `${modRepo.html_url} is not a fork of https://github.com/BigManBobby/QuestModRepo`;
		}

		core.info("Cloning fork");
		shell.exec(`git clone ${modRepo.html_url}`);

		core.info(`Checking out "${modJson.id}"`);
		shell.cd("QuestModRepo");
		shell.exec(`git checkout ${modJson.id} 2>/dev/null || git checkout -b ${modJson.id}`);
		shell.cd("..");

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

		repoMods[modJson.packageVersion].push(ConstructModEntry(modJson, currentUser));
		core.info(JSON.stringify(repoMods, null, 4));

		core.info("Saving modified mods json");
		fs.writeFileSync('QuestModRepo/mods.json', JSON.stringify(repoMods, null, 4));

		shell.cd('QuestModRepo');

		core.info("Setting git identity");
		shell.exec(`git config --global user.email "${currentUser.email}"`);
		shell.exec(`git config --global user.name  "${currentUser.name}"`);

		core.info("Commiting modified mods json");
		shell.exec(`git add mods.json`);
		shell.exec(`git commit -m "Added ${modJson.name} v${modJson.version} to the mod repo"`);

		core.info("Pushing commit to fork");
		shell.exec('git push');

		shell.cd('..');
	} catch (error) {
		core.setFailed(error);
	}
}

function ConstructModEntry(modJson, currentUser) {
	var cover = core.getInput('cover');
	var authorIcon = core.getInput('author-icon');

	if (cover == '') {
		if (!fs.existsSync('cover.png')) throw 'No core image was specifed, and "cover.png" could not be found';
		cover = `https://github.com/${github.context.repo.owner}/${github.context.repo.repo}/raw/${github.context.ref}/cover.png`
	}

	if (authorIcon == '') {
		authorIcon = currentUser.avatar_url;
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
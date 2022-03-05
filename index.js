const core = require('@actions/core');
const github = require('@actions/github');
const gitToken = core.getInput('token');
const octokit = github.getOctokit(gitToken);

const fs = require('fs');;
const shell = require('shelljs');
const semver = require('semver');
const base64 = require('js-base64');

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

			currentUser = (await octokit.rest.users.getByUsername({
				username: modRepo.owner.login
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

		repoMods[modJson.packageVersion].push(ConstructModEntry(modJson, currentUser));

		await CreateBranchInRequired(modJson.id, currentUser);

		core.info("Encoding modified Mods json");
		const encodedRepoMods = base64.encode(JSON.stringify(repoMods, null, 4));

		core.info("Commiting moddfied Mods json");
		var commit = {
			owner: currentUser.login,
			repo: "QuestModRepo",
			path: "mods.json",
			message: `Added ${modJson.name} v${modJson.version} to the Mod Repo`,
			content: encodedRepoMods,
			branch: `refs/heads/${modJson.id}`
		};

		const sha = await GetFileSHA(currentUser, modJson.id);
		if (sha != null) {
			commit.sha = sha;
		}

		const commitSha = (await octokit.rest.repos.createOrUpdateFileContents(commit)).data.commit.sha;

	} catch (error) {
		core.setFailed(error);
	}
}

async function CreateBranchInRequired(branchName, currentUser) {
	core.info(`Checking if "${branchName}" branch exists`);
	try {
		await octokit.rest.git.getRef({
			owner: currentUser.login,
			repo: "QuestModRepo",
			ref: `heads/${branchName}`
		});

		core.info("Branch already exists");
	} catch {
		core.info("Branch does not exists, creating it now");

		const sha = (await octokit.rest.git.getRef({
			owner: currentUser.login,
			repo: "QuestModRepo",
			ref: "heads/master"
		})).data.object.sha;

		await octokit.rest.git.createRef({
			owner: currentUser.login,
			repo: "QuestModRepo",
			ref: `refs/heads/${branchName}`,
			sha: sha
		})
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

async function GetFileSHA(currentUser, branchName) {
	try {
		const result = await octokit.rest.repos.getContent({
			owner: currentUser.login,
			repo: "QuestModRepo",
			path: "mods.json",
			ref: `refs/heads/${branchName}`
		});

		core.info(`Sha: "${result.data.sha}"`);

		return result.data.sha;
	} catch (error) {
		return null;
	}
}

Main();
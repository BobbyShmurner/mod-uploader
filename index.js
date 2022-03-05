const core = require('@actions/core');
const github = require('@actions/github');
const gitToken = core.getInput('token');
const repoToken = core.getInput('repo-token');

const octokit = github.getOctokit(gitToken);
const repoOctokit = github.getOctokit(repoToken);

const fs = require('fs');;
const shell = require('shelljs');
const semver = require('semver');
const base64 = require('js-base64');

var modRepo;
var forkedModRepo;
var currentUser;

var notes = [];

async function Main() {
	try {
		const modJsonPath = core.getInput('mod-json');

		if (!fs.existsSync(modJsonPath)) {
			throw `File "${modJsonPath}" does not exist`;
		}

		const modJson = JSON.parse(fs.readFileSync(modJsonPath));

		core.info("Getting Mod Repo");

		try {
			modRepo = (await octokit.rest.repos.get({
				owner: "BigManBobby",
				repo: "QuestModRepo"
			})).data;
		} catch {
			throw "Failed to retrive the mod repo. Please contact Bobby Shmurner on discord";
		}

		core.info("Getting Fork of Mod Repo");

		try {
			forkedModRepo = (await octokit.rest.repos.get({
				owner: github.context.repo.owner,
				repo: modRepo.name
			})).data;

			currentUser = (await octokit.rest.users.getByUsername({
				username: forkedModRepo.owner.login
			})).data;
		} catch {
			throw `Failed to find fork of the Mod Repo. Please make sure a fork of the repo exists. You can find the repo here: https://github.com/${modRepo.owner.login}/${modRepo.name}`;
		}

		if (!forkedModRepo.fork) {
			throw `${forkedModRepo.html_url} is not a fork of https://github.com/${modRepo.owner.login}/${modRepo.name}`;
		}

		await FetchUpstream(forkedModRepo, modRepo, forkedModRepo.default_branch, modRepo.default_branch);
		await CreateBranchInRequired(modJson.id);

		core.info("Cloning fork");
		shell.exec(`git clone ${forkedModRepo.html_url}`);

		core.info("Getting the repo's mods");
		const repoMods = JSON.parse(fs.readFileSync(`${forkedModRepo.name}/mods.json`));

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

		const isNewEntry = true;

		for (var i = 0; i < repoMods[modJson.packageVersion].length; i++) {
			if (repoMods[modJson.packageVersion][i].id == modJson.id) {
				core.info("Mod entry alread exists for this version, replacing it with this new entry");
				repoMods[modJson.packageVersion].splice(i, 1);

				isNewEntry = false;
				break;
			}
		}

		repoMods[modJson.packageVersion].push(ConstructModEntry(modJson));

		core.info("Encoding modified Mods json");
		const encodedRepoMods = base64.encode(JSON.stringify(repoMods, null, 4));

		core.info("Commiting moddfied Mods json");
		var commit = {
			owner: currentUser.login,
			repo: forkedModRepo.name,
			path: "mods.json",
			message: `Added ${modJson.name} v${modJson.version} to the Mod Repo`,
			content: encodedRepoMods,
			branch: `refs/heads/${modJson.id}`
		};

		const sha = await GetFileSHA(modJson.id);
		if (sha != null) {
			commit.sha = sha;
		}

		await octokit.rest.repos.createOrUpdateFileContents(commit);

		core.info("Checking if Pull Request Exists for branch");
		const prs = (await octokit.rest.pulls.list({
			owner: modRepo.owner.login,
			repo: modRepo.name,
			state: "open",
			head: `${currentUser.login}:${modJson.id}`
		})).data;

		var prTitle = "";
		var prMessage = "";

		if (isNewEntry) {
			prTitle = `Added ${modJson.name} v${modJson.version} to the mod repo`;
			prMessage = `Added ${modJson.name} v${modJson.version} to the mod repo for Beat Saber version ${modJson.packageVersion}.\n\nYou can check out the build action [Here](https://github.com/${github.context.repo.owner}/${github.context.repo.repo}/actions/runs/${github.context.runId})`;
		} else {
			prTitle = `Updated ${modJson.name} to v${modJson.version}`;
			prMessage = `Updated ${modJson.name} to v${modJson.version} for Beat Saber version ${modJson.packageVersion}.\n\nYou can check out the build action [Here](https://github.com/${github.context.repo.owner}/${github.context.repo.repo}/actions/runs/${github.context.runId})`;
		}

		if (notes.length > 0) {
			prMessage += "\n\n**Notes:**";

			for (const note of notes) {
				prMessage += `\n- ${note}`;
			}
		}

		if (prs.length > 0) {
			core.info("PR alread exists. Will just be adding a message to the existing PR");

			await repoOctokit.rest.issues.createComment({
				owner: modRepo.owner.login,
				repo: modRepo.name,
				issue_number: prs[0].number,
				body: prMessage
			})
		} else {
			core.info("No PR found, creating one now");
			await repoOctokit.rest.pulls.create({
				owner: modRepo.owner.login,
				repo: modRepo.name,
				title: prTitle,
				head: `${currentUser.login}:${modJson.id}`,
				base: modRepo.default_branch,
				body: prMessage,
				maintainer_can_modify: true
			})
		}
	} catch (error) {
		core.setFailed(error);
	}
}

async function CreateBranchInRequired(branchName) {
	core.info(`Checking if "${branchName}" branch exists`);
	try {
		await octokit.rest.git.getRef({
			owner: currentUser.login,
			repo: forkedModRepo.name,
			ref: `heads/${branchName}`
		});

		core.info("Branch already exists");

		await FetchUpstream(forkedModRepo, forkedModRepo, branchName, forkedModRepo.default_branch);
	} catch {
		core.info("Branch does not exists, creating it now");

		const sha = (await octokit.rest.git.getRef({
			owner: currentUser.login,
			repo: forkedModRepo.name,
			ref: forkedModRepo.default_branch
		})).data.object.sha;

		await octokit.rest.git.createRef({
			owner: currentUser.login,
			repo: forkedModRepo.name,
			ref: `refs/heads/${branchName}`,
			sha: sha
		})
	}
}

async function FetchUpstream(repo, upstreamRepo, branch, upstreamBranch) {
	core.info(`Checking if ${repo}:${branch} is behind ${upstreamRepo}:${upstreamBranch}`);

	const compareResults = (await octokit.rest.repos.compareCommits({
		owner: upstreamRepo.owner.login,
		repo: upstreamRepo.name,
		base: upstreamBranch,
		head: `${repo.owner.login}:${branch}`
	})).data;

	if (compareResults.behind_by > 0) {
		core.info(`${repo.name} is behind by ${compareResults.behind_by} commits. Fetching Upstream...`);

		const upstreamBranchReference = (await octokit.rest.git.getRef({
			owner: upstreamRepo.owner.login,
			repo: upstreamRepo.name,
			ref: `heads/${upstreamBranch}`
		})).data;

		try {
			await repoOctokit.rest.git.updateRef({
				owner: repo.owner.login,
				repo: repo.name,
				ref: `heads/${branch}`,
				sha: upstreamBranchReference.object.sha
			})
		} catch (error) {
			throw `Failed to fetch upstream. This can be fixed by performing a manual merge\nError: ${error.message}`;
		}
	} else {
		core.info(`${repo.name}:${branch} is up-to-date`);
	}
}

function ConstructModEntry(modJson) {
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

async function GetFileSHA(branchName) {
	try {
		const result = await octokit.rest.repos.getContent({
			owner: currentUser.login,
			repo: forkedModRepo.name,
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
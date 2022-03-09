# Mod Uploader
Used to Upload Mods to the [Beat Saber Quest Mods Repository](
https://github.com/QuestModding/QuestBeatSaberModsRepo)
# Parameters

`token`:
This is your GitHub token. This should always be `${{ secrets.GITHUB_TOKEN }}`

`repo-token`: This is a PAT that has access to the **repo** scope.

`qmod-name`: The asset name of the QMod. 

`qmod-url`: A custom URL to a QMod. This isn't required, but if it is specified, it will be used instead of `qmod-name`

`tag`: The tag that the release is being released under. This should usually just be `${{github.ref_name}}`. This is not required if `qmod-url` is supplied

`mod-json`: The path to the `mod.json` file in your repo. This defaults to `mod.json`

`cover`: A URL to the cover of the mod. If left blank, the action will check your repo for a `cover.png` in the root. If one isn't found, the cover will be left blank

`author-icon`: A URL to the author's icon. If left blank, the icon will default to the repo's owner's pfp

`note`: A custom note to add to the PR message. This can be left blank

# Setup & Usage

To use this action you'll need two things:
 - A CLI Workflows that'll allow you to use this action. This should either be a "Publish" workflow, or a manual workflow that allows for specific inputs
 - A **Personal Access Token** that has access to the **repo** scope

I won't be going over how to create a publish workflow, but if you'd like to see an example of one, you can check out [The publish script for Hot-Swappable Mods](https://github.com/BobbyShmurner/HotSwappableMods/blob/master/.github/workflows/publish.yml) **(NOTE: I'll be changing this to the mod downloader when it's released, as it'll be more up-to-date than HSM)**

## Creating the Personal Access Token

To allow the action to create pull requests on your behalf, it requires a **Personal Access Token** (or PAT for short) with access to the **"Repo"** scope. You can think of the PAT as a password that only unlocks specific parts of your account. However, just like any password, you should **NOT** share this with anyone.

You can check out GitHub's article on creating a PAT [Here](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token#creating-a-token), but I'll briefly go through it here. **(Note: You'll need to have verified your email first. You can do that [Here](https://docs.github.com/en/github/getting-started-with-github/verifying-your-email-address) if you haven't already)**

1. Head over to your account's settings page and scroll down until you find **\<> Developer settings** in the left toolbar
2. Click on **Personal access tokens** and click on **Generate new token**
3. Confirm your password, and then give the token a descriptive note, something along the lines of **"[Mod Name] Mod Repo Access"**
4. Set the expiration to whatever time you would prefer. Although GitHub doesn't recommend that you set the expiration to **No Expiration**, setting it to anything else means that you'll have to come back in the future and generate a new token.
5. Check the **repo** scope. While I doubt the action requires all of the **repo** scopes, I haven't done any testing regarding the scopes, so I'd recommend just allowing all of the **repo** scopes.
6. Click on the **Generate token** button. **MAKE SURE TO COPY THE TOKEN!!!** After you leave this screen, you will **NOT** be able to see it again. I would recommend copying it into a text file temporarily, just to be safe.

## Creating the secret

So now that you've got your shiny new token, head over to your mod's repo to set up the token for use. We'll do this using **Action Secrets** so that people can't just go around stealing all your tokens.

1. Open up the repo's settings and click on **Secrets** in the left toolbar, and then click on **Actions**
2. Click on **New repository secret**.
3. I'd recommend calling it `REPO_TOKEN`. Whatever you decide to call it, make sure you remember it, because you'll need it later.
4. Paste in your PAT into to **Value** input and click **Add secret**. You can now forget about the PAT, you won't be needing it anymore.

## Using the Action - Publish Workflow

So now that we've set up the repo for use with the action, it's about time we start using it, don't you think?

1. Add the following code block to the end of your publish workflow:
    ```yml
    - name: Upload QMod to Mod Repo
      uses: BobbyShmurner/mod-uploader@v1.0
      with:
        token: ${{ secrets.GITHUB_TOKEN }}
        repo-token: ${{ secrets.REPO_TOKEN }}
        qmod-name: **YOUR QMOD ASSET NAME**
        tag: ${{github.ref_name}}
    ```
2. Make sure to fill in the correct value for `qmod-name`. This should be the exact same value as `asset_name` from the **Upload QMod Asset** step of your publish workflow (The name may vary slightly)

    For example, if in my workflow the **Upload QMod Asset** step looks like this:
    ```yml
    - name: Upload Qmod Asset
      id: upload_qmod_asset
      uses: actions/upload-release-asset@v1
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        upload_url: ${{ steps.get_upload_url.outputs.upload_url }}
        asset_path: ./${{env.qmodName}}.qmod
        asset_name: ${{env.qmodName}}-v${{ steps.get_tag_version.outputs.VERSION }}.qmod
        asset_content_type: application/octet-stream
    ```

    I would set `qmod-name` to be `${{env.qmodName}}-v${{ steps.get_tag_version.outputs.VERSION }}.qmod`
    
# Using the Action - Manual Workflow

What if you don't want to use a "Publsih" Workflow? What if you want to use a custom URL for your QMod? Then your best bet is to use a "Manual" Workflow. This is a workflow that you can manually trigger whenever, and you can pass in inputs for the action's parameters.

Here you can see an example of a Manual Workflow:
```yml
on: 
  workflow_dispatch:
    inputs:
      qmod-url:
        description: 'QMod URL'     
        required: true
        type: string
      cover:
        description: 'Cover URL'
        required: false 
        type: string
      author-icon:
        description: "Author's PFP URL"
        required: false 
        type: string
      note:
        description: 'A note to pass to include in the PR's message'
        required: false 
        type: string
        
jobs:
  publish-to-repo:
    runs-on: ubuntu-latest
    steps:
      - name: Upload QMod to Mod Repo
        uses: BobbyShmurner/mod-uploader@v1.0
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          repo-token: ${{ secrets.REPO_TOKEN }}
          qmod-url: ${{ github.event.inputs.qmod-url }}
          cover: ${{ github.event.inputs.cover }}
          author-icon: ${{ github.event.inputs.author-icon }}
          note: ${{ github.event.inputs.note }}
```

You can use this action to easily create a PR that can be customise to your liking

And that's it! You're ready to start releasing mods for everyone to see and play! You should be proud of yourself :D

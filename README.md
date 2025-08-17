# RecipeMD Web

_wip_

Displaying recipes in [RecipeMD format](https://github.com/RecipeMD/RecipeMD) through the magic of Next.js.

## Running your own instance

You can set up your own instance on [GitHub Pages](https://pages.github.com). Just follow these steps:

1. Fork this repository

2. Set up a domain or subdomain for your recipes, and configure the DNS according to [GitHub's instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)

3. Set up the configuration for your instance, by [setting action variables for the repository](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables#creating-configuration-variables-for-a-repository).

   - `CNAME`: The domain/subdomain you configured in step to, e.g. `recipes.example.com`

   - `REPOSITORIES`: The repository containing your recipes. This is a JSON array in the following format:
     ```
     [{"author":"<GitHub username>","repository":"<repository name>","branch":"<branch>"}]
     ```
     You an also add additional objects to the array to show recipes from multiple REPOSITORIES

4. Enable GitHub Pages in your repository's settings, and run the deploy workflow in the repositories actions.

### Automatically pulling new recipes whenever the recipe repo is updated

You can create a workflow in your recipe repo that updates the content of recipe-web whenever something changes in your recipes. For that, we create an access token that allows your recipe repo to send a notification to you recipe-web instance, and then add a workflow to your recipes repo.

Note that this setup only works for reacting to changes from recipe repos you have write access to.

1. [Create a new access token.](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens?utm_source=chatgpt.com#creating-a-fine-grained-personal-access-token)
   - **Repository Access**: Choose "Only select repositories" and select your recipe-web repo
   - **Permissions**:
     - "Metadata" (read)
     - "Workflows" (read/write)
     - "Contents" (read/write)
2. [Add the new access token to your recipes repo.](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets?ref=fal-blog&tool=webui#creating-secrets-for-a-repository) Name it `FRONTEND_TRIGGER_TOKEN`.
3. [Create the workflow that sends the repository dispatch event in your recipes repo.](https://github.com/marketplace/actions/repository-dispatch) The workflow is placed in `.github/workflows/` and should contain the following:

   ```yml
   name: Trigger Frontend Deploy

    on:
    push:
        branches:
        - master
        - main

    jobs:
    dispatch:
        runs-on: ubuntu-latest

        steps:
        - name: Send repository_dispatch event to Frontend-Repo
            uses: peter-evans/repository-dispatch@v3
            with:
            token: ${{ secrets.FRONTEND_TRIGGER_TOKEN }}
            repository: username/recipe-web # Your recipe-web repo
            event-type: trigger-deploy
   ```

That's it! You can test the connection by manually triggering a run of the workflow in your recipes repo, and then check if a corresponding run is triggered in your recipe-web repo.

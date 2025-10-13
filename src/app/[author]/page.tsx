import React, { Suspense } from "react";
import { Metadata } from "next";
import List from "@/app/components/List";
import { getRepositories, parseRecipe, RecipeFiles, RecipeList } from "@/app/lib/Recipedata";

type Params = Promise<{author: string}>;

export async function generateStaticParams() {
    const repos = getRepositories();
    return repos.map((repo) => ({author: repo.author}));
}
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
    const { author } = await params;
    return {
      title: `${author} - Recipe Web`,
    };
}

export default async function Page({
    params,
}: {
    params: Params
}) {
    const { author } = await params;
    const repoParams = getRepositories().find((r) => r.author === author);
    if(!repoParams) {
        return;
    }
    const repo: RecipeFiles = await fetch(`https://api.github.com/repos/${author}/${repoParams.repository}/git/trees/${repoParams.branch}?recursive=1`, {cache: 'force-cache'}).then((res) => res.json());
    if(!repo.tree) {
        return (
            <div>
                <h1>Error 500</h1>
                <p>Could not fetch data.</p>
            </div>
        );
    }

    const recipeList = repo.tree.filter((node) => (node.path.endsWith(".md") && node.path !== "README.md"));
    const recipes: RecipeList = {};
    for (const element of recipeList) {
        const root = `https://raw.githubusercontent.com/${author}/${repoParams.repository}/${repoParams.branch}/`;
        const recipeURL = new URL(element.path, root).href;

        const recipe = await fetch(recipeURL, {cache: 'force-cache'}).then((raw) => raw.text());
        const parsed = parseRecipe(element.path, recipe, repoParams);
        recipes[parsed.meta.slug] = parsed;
    };

    return (
        <Suspense>
            <List recipes={recipes} repo={repoParams} />
        </Suspense>
    )
}

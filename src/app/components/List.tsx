'use client'

import React from 'react';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Fuse from 'fuse.js';

import styles from '@/app/styles/Home.module.css';
import { RecipeList, RecipeType, Repository } from '@/app/lib/Recipedata';
import FoodSVG from '@/app/svg/fontawesome/food';
import GithubSVG from '@/app/svg/github';
import HeartSVG from '../svg/fontawesome/heart';
import { useSearchContext } from '@/app/context/search';
import { useFavorites } from '../lib/useFavorite';
import { monthTagged, isMonth, humanizeMonth } from '../lib/calendar';
import { createHash } from 'crypto';
import { useSeedContext } from '../context/seed';
import ImageFallback from './ImageFallback';

type Props = {
  recipes?: RecipeList,
  repo?: Repository,
};

function hash(i: string) {
  return parseInt(createHash('md5').update(i).digest('hex'), 16);
}

const FAVORITE_FACTOR = 20;

export default function List({recipes, repo}: Props) {
  // document.title = "Recipe Web";

  const query = useSearchParams();
  const [searchSlow] = useSearchContext();
  const search = useDeferredValue(searchSlow);

  const [isFavorite] = useFavorites();
  const [seed] = useSeedContext();

  const recipesPrefiltered = useMemo(() => {
    if (!recipes) {
      return [];
    }
    const tag = query.get("tag");
    return Object.values(recipes).filter((recipe) => (!repo?.author || recipe.meta.author === repo.author) && (!tag || recipe.tags.includes(tag))).toSorted((a, b) => (b.score + (isFavorite(b.meta.slug) ? FAVORITE_FACTOR : 0)) - (a.score + (isFavorite(a.meta.slug) ? FAVORITE_FACTOR : 0)));
  }, [recipes, repo, query, isFavorite]);

  // TODO clean up setter
  const [sortedRecipes, setSortedRecipesInternal] = useState<RecipeType[]>([]);
  function setSortedRecipes(r: RecipeType[]) {
    setSortedRecipesInternal(r.toSorted((a, b) => (b.score - a.score)));
  }

  useEffect(() => {
    if(!recipes) {
      return;
    }

    const fuse = new Fuse(recipesPrefiltered, {
      keys: [
        {name: 'title', weight: 10},
        {name: 'tags', weight: 5},
        'author',
        'description',
        'ingredients',
        'instructions'
      ],
      threshold: 0.4,
      includeScore: true,
    });
    if(search !== "") {
      setSortedRecipes(fuse.search(search).map((result) => ({...result.item, score: -Math.log10(result.score ?? 1)})).toSorted((a, b) => (b.score + (isFavorite(b.meta.slug) ? FAVORITE_FACTOR : 0)) - (a.score + (isFavorite(a.meta.slug) ? FAVORITE_FACTOR : 0))));
    } else {
      setSortedRecipes(shuffleArray(recipesPrefiltered, seed));
    }
  }, [search, recipes, repo, recipesPrefiltered, seed, isFavorite]);

  function shuffleArray(array: RecipeType[], seed: number) {
    return array.toSorted((a, b) => hash(`${a.meta.slug}${seed}`) - hash(`${b.meta.slug}${seed}`));
  }

  return (
    <>
      <h1 hidden={true}>Recipe Web</h1>
      {search && (
        <div className={styles['search-result-count']}>{sortedRecipes.length} / {recipesPrefiltered.length}</div>
      )}
      {repo && (
        <>
          <h2>@{repo.author}</h2>
          <a href={`https://github.com/${repo.author}/${repo.repository}`} target='_blank' rel='noreferrer'>
            GitHub
            <GithubSVG aria-hidden="true" className={styles.github} />
          </a>
        </>
      )}
      <div className={styles.cardbox}>
        {sortedRecipes.map((recipe) => {
          return (
            <Link href={`/${recipe.meta.slug}`} key={recipe.meta.slug} className={styles.card} style={{'--rotate': `${Math.random() * 4 - 2}deg`} as React.CSSProperties}>
              <ImageFallback src={recipe.imagePath} className={styles.preview} width={400} height={300} loading='lazy' alt="">
                <div className={styles['no-preview']}><FoodSVG /></div>
              </ImageFallback>
              {isFavorite(recipe.meta.slug) && <div className={styles.favorite}><HeartSVG /></div>}
              <div className={styles.author}>@{recipe.meta.author}</div>
              <div className={styles['card-content']}>
                <h3 className={styles.title}>
                  {recipe.title}
                </h3>
                <div className={styles.calendar}>
                    {[0,1,2,3,4,5,6,7,8,9,10,11].map((month) => {
                        return (monthTagged(recipe.tags, month) ? <div className={styles.month} key={`${recipe.meta.slug}-month-${month}`} title={humanizeMonth(month, recipe.language)}></div> : <div key={`${recipe.meta.slug}-month-${month}`}></div>);
                    })}
                </div>
                <div className={styles.tags}>
                  {recipe.tags.filter(t => !isMonth(t)).join(", ")}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </>
  );
}

export interface UserLocation {
  stateId?: string | null;
  districtId?: string | null;
  assemblyId?: string | null;
  mandalId?: string | null;
  villageId?: string | null;
}

export function rankAndMixArticles(
  articles: any[],
  userPrefs: Record<string, number>,
  userLocation: UserLocation
): any[] {
  // 1. Calculate weighted scores
  const scored = articles.map(art => {
    let score = 0;

    // Location targeting weights (Priority: Village -> Mandal -> Assembly -> District -> State)
    if (art.villageId && art.villageId === userLocation.villageId) {
      score += 50;
    } else if (art.mandalId && art.mandalId === userLocation.mandalId) {
      score += 40;
    } else if (art.assemblyId && art.assemblyId === userLocation.assemblyId) {
      score += 30;
    } else if (art.districtId && art.districtId === userLocation.districtId) {
      score += 20;
    } else if (art.stateId && art.stateId === userLocation.stateId) {
      score += 10;
    }

    // Freshness decay (half-life of 12 hours)
    const publishedTime = art.publishedAt ? new Date(art.publishedAt).getTime() : Date.now();
    const hoursOld = (Date.now() - publishedTime) / (1000 * 60 * 60);
    score += 50 * Math.pow(0.5, Math.max(0, hoursOld) / 12);

    // Editorial priority - Breaking news & features boost applies ONLY for 24 hours after posting
    const isWithin24Hours = hoursOld <= 24;
    if ((art.priority === 'breaking' || art.isBreaking === true) && isWithin24Hours) {
      score += 100;
    } else if (art.priority === 'high' && isWithin24Hours) {
      score += 30;
    }

    // User preference weight (category match)
    const categoryWeight = userPrefs[art.categoryId] !== undefined ? userPrefs[art.categoryId] : 0.5;
    score += categoryWeight * 20;

    // Engagement metrics boost
    const viewsBoost = (art.viewsCount || 0) * 0.05;
    const sharesBoost = (art.sharesCount || 0) * 0.5;
    score += Math.min(30, viewsBoost + sharesBoost); // cap engagement boost at 30 points to avoid viral bias drowning local news

    return { ...art, recommendationScore: score };
  });

  // 2. Sort by recommendationScore descending
  scored.sort((a, b) => b.recommendationScore - a.recommendationScore);

  // 3. De-duplicate & Interleave categories
  return mixCategories(scored);
}

export function mixCategories(articles: any[]): any[] {
  if (articles.length <= 1) return articles;

  // Group articles by categoryId
  const groups: Record<string, any[]> = {};
  for (const art of articles) {
    if (!groups[art.categoryId]) {
      groups[art.categoryId] = [];
    }
    groups[art.categoryId].push(art);
  }

  // Sort each group by its recommendationScore descending
  for (const catId of Object.keys(groups)) {
    groups[catId].sort((a, b) => b.recommendationScore - a.recommendationScore);
  }

  const mixed: any[] = [];
  const activeCatIds = Object.keys(groups);

  while (mixed.length < articles.length) {
    let bestCatId: string | null = null;
    let bestScore = -Infinity;

    const lastCategory = mixed.length > 0 ? mixed[mixed.length - 1].categoryId : null;

    // Try to find the highest-score candidate in a category different from the last one
    for (const catId of activeCatIds) {
      const group = groups[catId];
      if (group.length > 0 && catId !== lastCategory) {
        if (group[0].recommendationScore > bestScore) {
          bestScore = group[0].recommendationScore;
          bestCatId = catId;
        }
      }
    }

    // Fallback: If only the last category has elements left, pick from it
    if (bestCatId === null) {
      for (const catId of activeCatIds) {
        const group = groups[catId];
        if (group.length > 0) {
          if (group[0].recommendationScore > bestScore) {
            bestScore = group[0].recommendationScore;
            bestCatId = catId;
          }
        }
      }
    }

    if (bestCatId !== null) {
      const nextArticle = groups[bestCatId].shift()!;
      mixed.push(nextArticle);
    } else {
      break; // No more articles left
    }
  }

  return mixed;
}

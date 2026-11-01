"use server";

const MEALDB_BASE = "https://www.themealdb.com/api/json/v1/1";

// TheMealDB returns some categories/areas twice (e.g. "Dominican",
// "Congolese", "Channel Islander"), which breaks React list keys.
function uniqueBy(items, key) {
  const seen = new Set();
  return items.filter((item) => {
    const value = item?.[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

// TheMealDB's filter endpoint only accepts the exact area name ("United
// States"), but the app links use slugs ("united-states"). Resolve a slug back
// to the canonical name so every cuisine link returns its meals.
const normalizeKey = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// Some areas only answer to their country name ("United States" returns meals
// while "American" returns none), so collect every alias worth trying.
async function resolveAreaCandidates(input) {
  const wanted = normalizeKey(input);
  if (!wanted) return [];

  try {
    const response = await fetch(`${MEALDB_BASE}/list.php?a=list`, {
      next: { revalidate: 604800 },
    });

    if (response.ok) {
      const data = await response.json();
      const entries = data.meals || [];
      const match =
        entries.find((area) => normalizeKey(area.strArea) === wanted) ||
        entries.find((area) => normalizeKey(area.strCountry) === wanted);

      if (match) {
        const aliases = [match.strArea, match.strCountry].filter(Boolean);
        return [...new Set(aliases)];
      }
    }
  } catch (error) {
    console.error("Error resolving area name:", error);
  }

  return [String(input)];
}

// Get random recipe of the day
export async function getRecipeOfTheDay() {
  try {
    const response = await fetch(`${MEALDB_BASE}/random.php`, {
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!response.ok) {
      throw new Error("Failed to fetch recipe of the day");
    }

    const data = await response.json();
    return {
      success: true,
      recipe: data.meals[0],
    };
  } catch (error) {
    console.error("Error fetching recipe of the day:", error);
    throw new Error(error.message || "Failed to load recipe");
  }
}

// Get all categories
export async function getCategories() {
  try {
    const response = await fetch(`${MEALDB_BASE}/list.php?c=list`, {
      next: { revalidate: 604800 }, // Cache for 1 week (categories rarely change)
    });

    if (!response.ok) {
      throw new Error("Failed to fetch categories");
    }

    const data = await response.json();
    return {
      success: true,
      categories: uniqueBy(data.meals || [], "strCategory"),
    };
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw new Error(error.message || "Failed to load categories");
  }
}

// Get all areas/cuisines
export async function getAreas() {
  try {
    const response = await fetch(`${MEALDB_BASE}/list.php?a=list`, {
      next: { revalidate: 604800 }, // Cache for 1 week
    });

    if (!response.ok) {
      throw new Error("Failed to fetch areas");
    }

    const data = await response.json();
    return {
      success: true,
      areas: uniqueBy(data.meals || [], "strArea"),
    };
  } catch (error) {
    console.error("Error fetching areas:", error);
    throw new Error(error.message || "Failed to load areas");
  }
}

// Get meals by category
export async function getMealsByCategory(category) {
  try {
    const response = await fetch(`${MEALDB_BASE}/filter.php?c=${category}`, {
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!response.ok) {
      throw new Error("Failed to fetch meals");
    }

    const data = await response.json();
    return {
      success: true,
      meals: data.meals || [],
      category,
    };
  } catch (error) {
    console.error("Error fetching meals by category:", error);
    throw new Error(error.message || "Failed to load meals");
  }
}

// Get meals by area
export async function getMealsByArea(area) {
  try {
    const candidates = await resolveAreaCandidates(area);

    if (candidates.length === 0) {
      return { success: true, meals: [], area: "" };
    }

    for (const candidate of candidates) {
      const response = await fetch(
        `${MEALDB_BASE}/filter.php?a=${encodeURIComponent(candidate)}`,
        {
          next: { revalidate: 86400 }, // Cache for 24 hours
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch meals");
      }

      const data = await response.json();
      const meals = data.meals || [];

      if (meals.length > 0) {
        return { success: true, meals, area: candidate };
      }
    }

    return { success: true, meals: [], area: candidates[0] };
  } catch (error) {
    console.error("Error fetching meals by area:", error);
    throw new Error(error.message || "Failed to load meals");
  }
}

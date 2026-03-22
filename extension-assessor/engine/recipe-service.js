export function loadRemoteRecipe(recipeSource, context) {
  if (!recipeSource) {
    return {
      version: "0.1.0",
      steps: [],
    };
  }

  const parsed = typeof recipeSource === "string" ? JSON.parse(recipeSource) : recipeSource;
  return hydrateRecipe(parsed, context);
}

export function hydrateRecipe(recipe, context) {
  return {
    ...recipe,
    steps: Array.isArray(recipe?.steps)
      ? recipe.steps.map((step) => hydrateStep(step, context))
      : [],
  };
}

function hydrateStep(step, context) {
  return {
    ...step,
    selector: interpolate(step.selector, context),
    value: interpolate(step.value, context),
  };
}

function interpolate(value, context) {
  if (typeof value !== "string") return value;
  return value.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, path) => {
    const resolved = getPath(context, path);
    return resolved == null ? "" : String(resolved);
  });
}

function getPath(source, path) {
  return String(path)
    .split(".")
    .filter(Boolean)
    .reduce((acc, key) => (acc == null ? undefined : acc[key]), source);
}

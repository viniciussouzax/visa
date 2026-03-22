export const SUPPORTED_ACTIONS = Object.freeze([
  "fill",
  "select",
  "click",
  "wait",
  "checkbox",
  "radio",
  "assert",
]);

export function validateRecipe(recipe) {
  const errors = [];
  if (!recipe || typeof recipe !== "object") {
    return ["Recipe ausente ou inválida."];
  }

  if (!Array.isArray(recipe.steps)) {
    errors.push("Recipe sem steps.");
    return errors;
  }

  recipe.steps.forEach((step, index) => {
    if (!step?.action) {
      errors.push(`Step ${index} sem action.`);
      return;
    }
    if (!SUPPORTED_ACTIONS.includes(step.action)) {
      errors.push(`Step ${index} com action não suportada: ${step.action}`);
    }
    if (!step.selector && step.action !== "wait") {
      errors.push(`Step ${index} sem selector.`);
    }
  });

  return errors;
}

(function () {
  if (window.SENDS160ExtEngine) return;

  function findElement(selector) {
    if (!selector) return null;
    return document.querySelector(selector);
  }

  async function executeStep(step) {
    const action = step?.action;
    if (!action) throw new Error("Step sem action.");

    if (action === "wait") {
      const ms = Number(step.ms || 0);
      await new Promise((resolve) => setTimeout(resolve, ms));
      return;
    }

    const element = findElement(step.selector);
    if (!element) {
      throw new Error(`Selector não encontrado: ${step.selector}`);
    }

    switch (action) {
      case "fill":
        element.focus();
        element.value = step.value ?? "";
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      case "select":
        element.value = step.value ?? "";
        element.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      case "click":
        element.click();
        return;
      case "checkbox":
        element.checked = !!step.value;
        element.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      case "radio":
        element.checked = true;
        element.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      case "assert":
        if (!document.querySelector(step.selector)) {
          throw new Error(`Assert falhou: ${step.selector}`);
        }
        return;
      default:
        throw new Error(`Ação não suportada: ${action}`);
    }
  }

  async function executeRecipe(recipe) {
    if (!recipe || !Array.isArray(recipe.steps)) {
      throw new Error("Recipe inválida.");
    }

    for (const step of recipe.steps) {
      await executeStep(step);
    }
  }

  function inspectPage() {
    const forms = Array.from(document.forms || []).map((form, index) => ({
      index,
      id: form.id || "",
      name: form.name || "",
      action: form.action || "",
      inputCount: form.querySelectorAll("input, select, textarea").length,
    }));

    return {
      url: location.href,
      title: document.title || "",
      readyState: document.readyState,
      formCount: forms.length,
      forms,
      inputCount: document.querySelectorAll("input, select, textarea").length,
      buttonCount: document.querySelectorAll("button, input[type='submit']").length,
    };
  }

  window.SENDS160ExtEngine = {
    inspectPage,
    executeRecipe,
  };
})();

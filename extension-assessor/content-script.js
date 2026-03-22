(function () {
  if (window.__SENDS160_CONTENT_SCRIPT__) return;
  window.__SENDS160_CONTENT_SCRIPT__ = true;

  function getState() {
    const inspected = window.SENDS160ExtEngine?.inspectPage
      ? window.SENDS160ExtEngine.inspectPage()
      : null;

    return {
      connected: true,
      hostname: location.hostname,
      pathname: location.pathname,
      title: document.title || "",
      inspected,
    };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    (async () => {
      switch (message?.type) {
        case "ceac-ping":
          sendResponse({ ok: true, state: getState() });
          return;
        case "ceac-inspect":
          sendResponse({ ok: true, state: getState() });
          return;
        case "ceac-run-recipe":
          await window.SENDS160ExtEngine.executeRecipe(message.recipe);
          sendResponse({ ok: true, state: getState() });
          return;
        default:
          sendResponse({ ok: false, error: "Ação não suportada no content script." });
      }
    })().catch((error) => {
      sendResponse({ ok: false, error: error?.message || String(error) });
    });
    return true;
  });
})();

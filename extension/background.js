chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.create({ url: 'dashboard.html' });
});

// Proxy fetch requests from content scripts (CORS workaround)
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.action === "FETCH_PROXY") {
        fetch(req.url, {
            method: req.method || "POST",
            headers: req.headers || { 'Content-Type': 'application/json' },
            body: req.body
        })
            .then(r => r.json())
            .then(data => sendResponse({ success: true, data }))
            .catch(e => sendResponse({ success: false, error: e.message }));
        return true; // keep channel open for async response
    }
});

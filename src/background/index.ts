import { handle, log } from "./router";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    const reply = await handle(msg, sender.tab?.url ?? sender.url);
    log(msg.type, reply.ok ? "ok" : reply.error.code);
    sendResponse(reply);
  })();
  return true; // reply is async
});

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") chrome.tabs.create({ url: chrome.runtime.getURL("src/onboarding/index.html") });
});

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

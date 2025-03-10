// State management
let isActivated = false;
let isManuallyDeactivated = false;

// Listen for tab updates to handle YouTube navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('youtube.com')) {
    if (!isManuallyDeactivated) {
      isActivated = true;
      chrome.tabs.sendMessage(tabId, { type: 'STATE_CHANGED', isActivated });
    }
  }
});

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STATE') {
    sendResponse({ isActivated, isManuallyDeactivated });
  } else if (message.type === 'TOGGLE_STATE') {
    isActivated = !isActivated;
    isManuallyDeactivated = !isActivated;
    chrome.storage.local.set({ isManuallyDeactivated });

    // Notify content script of state change
    if (sender.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, { type: 'STATE_CHANGED', isActivated });
    }

    sendResponse({ isActivated, isManuallyDeactivated });
  }
});

// Initialize state from storage
chrome.storage.local.get(['isManuallyDeactivated'], (result) => {
  isManuallyDeactivated = result.isManuallyDeactivated || false;
  isActivated = !isManuallyDeactivated;
});
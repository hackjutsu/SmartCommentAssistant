// State management
let isActivated = false;
let isManuallyDeactivated = false;

// Get current YouTube tab
async function getCurrentYouTubeTab() {
  const tabs = await chrome.tabs.query({ url: '*://*.youtube.com/*', active: true, currentWindow: true });
  return tabs[0];
}

// Listen for tab updates to handle YouTube navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('youtube.com')) {
    if (!isManuallyDeactivated) {
      isActivated = true;
      console.log('Auto-activating extension on YouTube');
      chrome.tabs.sendMessage(tabId, { type: 'STATE_CHANGED', isActivated });
    }
  }
});

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  if (message.type === 'GET_STATE') {
    console.log('Sending current state:', { isActivated, isManuallyDeactivated });
    sendResponse({ isActivated, isManuallyDeactivated });
  } else if (message.type === 'TOGGLE_STATE') {
    isActivated = !isActivated;
    isManuallyDeactivated = !isActivated;
    console.log('State toggled:', { isActivated, isManuallyDeactivated });

    // Save state to storage
    chrome.storage.local.set({ isManuallyDeactivated }, () => {
      console.log('State saved to storage');
    });

    // Get current YouTube tab and notify it of state change
    getCurrentYouTubeTab().then(tab => {
      if (tab) {
        chrome.tabs.sendMessage(tab.id, { type: 'STATE_CHANGED', isActivated }, (response) => {
          console.log('Content script response:', response);
        });
      }
    });

    sendResponse({ isActivated, isManuallyDeactivated });
  }
  return true; // Keep the message channel open for async response
});

// Initialize state from storage
chrome.storage.local.get(['isManuallyDeactivated'], (result) => {
  isManuallyDeactivated = result.isManuallyDeactivated || false;
  isActivated = !isManuallyDeactivated;
  console.log('Initial state loaded:', { isActivated, isManuallyDeactivated });
});
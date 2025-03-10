// Listen for state changes from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'STATE_CHANGED') {
    handleStateChange(message.isActivated);
  }
});

// Handle state changes
function handleStateChange(isActivated) {
  if (isActivated) {
    // TODO: Initialize UI elements
    console.log('Extension activated');
  } else {
    // TODO: Clean up UI elements
    console.log('Extension deactivated');
  }
}

// Initialize on page load
chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
  if (response.isActivated) {
    handleStateChange(true);
  }
});
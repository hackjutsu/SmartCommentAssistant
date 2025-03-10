// Create banner element
function createBanner() {
  const banner = document.createElement('div');
  banner.id = 'smart-comment-banner';
  banner.textContent = 'Smart Comment Assistant is active';
  document.body.appendChild(banner);
  return banner;
}

// Listen for state changes from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);

  if (message.type === 'STATE_CHANGED') {
    handleStateChange(message.isActivated);
    sendResponse({ success: true });
  }
  return true; // Keep the message channel open for async response
});

// Handle state changes
function handleStateChange(isActivated) {
  console.log('Handling state change:', isActivated);
  let banner = document.getElementById('smart-comment-banner');

  if (isActivated) {
    if (!banner) {
      console.log('Creating new banner');
      banner = createBanner();
    }
    banner.classList.add('visible');
    console.log('Banner shown');
  } else {
    if (banner) {
      banner.classList.remove('visible');
      console.log('Banner hidden');
    }
  }
}

// Initialize on page load
chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
  console.log('Initial state received:', response);
  if (response && response.isActivated) {
    handleStateChange(true);
  }
});
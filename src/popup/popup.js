document.addEventListener('DOMContentLoaded', () => {
  const toggleSwitch = document.getElementById('toggleExtension');
  const statusText = document.getElementById('statusText');
  const apiKeyInput = document.getElementById('apiKey');
  const saveApiKeyButton = document.getElementById('saveApiKey');

  // Initialize state
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
    console.log('Popup received initial state:', response);
    if (response) {
      toggleSwitch.checked = response.isActivated;
      updateStatusText(response.isActivated);
    }
  });

  // Load saved API key
  chrome.storage.local.get(['openaiApiKey'], (result) => {
    if (result.openaiApiKey) {
      apiKeyInput.value = result.openaiApiKey;
    }
  });

  // Handle toggle switch
  toggleSwitch.addEventListener('change', () => {
    console.log('Toggle switch changed:', toggleSwitch.checked);
    chrome.runtime.sendMessage({ type: 'TOGGLE_STATE' }, (response) => {
      console.log('Toggle response:', response);
      if (response) {
        updateStatusText(response.isActivated);
      }
    });
  });

  // Handle API key save
  saveApiKeyButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.local.set({ openaiApiKey: apiKey }, () => {
        saveApiKeyButton.textContent = 'Saved!';
        setTimeout(() => {
          saveApiKeyButton.textContent = 'Save';
        }, 2000);
      });
    }
  });

  function updateStatusText(isActivated) {
    statusText.textContent = isActivated ? 'Extension is active' : 'Extension is inactive';
  }
});
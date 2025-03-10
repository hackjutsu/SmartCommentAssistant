document.addEventListener('DOMContentLoaded', () => {
  const toggleSwitch = document.getElementById('toggleExtension');
  const statusText = document.getElementById('statusText');

  // Initialize state
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
    console.log('Popup received initial state:', response);
    if (response) {
      toggleSwitch.checked = response.isActivated;
      updateStatusText(response.isActivated);
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

  function updateStatusText(isActivated) {
    statusText.textContent = isActivated ? 'Extension is active' : 'Extension is inactive';
  }
});
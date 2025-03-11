// Import LLM service
const serviceURL = chrome.runtime.getURL('src/services/llm-service.js');
let LLMServiceFactory;
let llmService = null;

// Global state
let isExtensionActive = false;
let commentObserver = null;

// Initialize LLM service
async function initializeLLMService() {
  try {
    // If factory not loaded yet, load it
    if (!LLMServiceFactory) {
      const module = await import(serviceURL);
      LLMServiceFactory = module.LLMServiceFactory;
    }

    // Get saved settings
    const result = await chrome.storage.sync.get(['llmServiceType', 'apiKey']);
    const serviceType = result.llmServiceType || 'mock';
    const apiKey = result.apiKey;

    // Create service instance
    llmService = LLMServiceFactory.createService(serviceType, { apiKey });

    // Update UI if panel exists
    const serviceSelect = document.querySelector('.service-select');
    const apiKeyInput = document.querySelector('.service-api-key');
    const saveButton = document.querySelector('.save-api-key');
    const clearButton = document.querySelector('.clear-api-key');

    if (serviceSelect) {
      serviceSelect.value = serviceType;
    }
    if (apiKeyInput) {
      apiKeyInput.value = apiKey || '';
      apiKeyInput.disabled = serviceType === 'mock';
    }
    if (saveButton) {
      saveButton.disabled = serviceType === 'mock';
    }
    if (clearButton) {
      clearButton.disabled = serviceType === 'mock';
    }

    // Update generate button state after initialization
    updateGenerateButtonState();
  } catch (error) {
    console.error('Failed to initialize LLM service:', error);
    // Fall back to mock service
    if (LLMServiceFactory) {
      llmService = LLMServiceFactory.createService('mock', {});
      // Update UI to reflect fallback to mock service
      const serviceSelect = document.querySelector('.service-select');
      const apiKeyInput = document.querySelector('.service-api-key');
      const saveButton = document.querySelector('.save-api-key');
      const clearButton = document.querySelector('.clear-api-key');

      if (serviceSelect) {
        serviceSelect.value = 'mock';
      }
      if (apiKeyInput) {
        apiKeyInput.disabled = true;
      }
      if (saveButton) {
        saveButton.disabled = true;
      }
      if (clearButton) {
        clearButton.disabled = true;
      }
      // Update generate button state for mock service
      updateGenerateButtonState();
    }
  }
}

// Create panel element
function createPanel() {
  const panel = document.createElement('div');
  panel.id = 'smart-comment-panel';
  panel.className = 'smart-comment-panel';

  // Add header with status
  const header = document.createElement('div');
  header.className = 'panel-header';
  header.innerHTML = `
    <div class="header-content">Smart Comment Assistant</div>
    <button class="refresh-button" title="Refresh comment selection">🔄</button>
  `;
  panel.appendChild(header);

  // Add content container
  const content = document.createElement('div');
  content.className = 'panel-content';

  // Add selected comment container
  const selectedComment = document.createElement('div');
  selectedComment.className = 'selected-comment';
  selectedComment.innerHTML = `
    <div class="no-selection-message">No comment selected. Refresh if the comment cannot be selected.</div>
    <div class="comment-details" style="display: none;">
      <div class="comment-author"></div>
      <div class="comment-text"></div>
    </div>
  `;
  content.appendChild(selectedComment);

  // Add style selection section
  const styleSection = document.createElement('div');
  styleSection.className = 'style-selection';
  styleSection.innerHTML = `
    <h3>Select Comment Style</h3>
    <div class="style-options">
      <button class="style-button selected" data-style="positive">
        <span class="style-icon">😊</span>
        <span class="style-label">Positive/Supportive</span>
      </button>
      <button class="style-button" data-style="constructive">
        <span class="style-icon">💡</span>
        <span class="style-label">Constructive/Thoughtful</span>
      </button>
      <button class="style-button" data-style="critical">
        <span class="style-icon">🤔</span>
        <span class="style-label">Critical/Negative</span>
      </button>
    </div>
  `;
  content.appendChild(styleSection);

  // Add custom prompt section
  const promptSection = document.createElement('div');
  promptSection.className = 'prompt-section';
  promptSection.innerHTML = `
    <h3>Your Initial Comment</h3>
    <textarea
      class="prompt-input"
      placeholder="Enter your initial thoughts or the main points you want to convey..."
      rows="4"
    ></textarea>
  `;
  content.appendChild(promptSection);

  // Add service selection section (moved here)
  const serviceSection = document.createElement('div');
  serviceSection.className = 'service-section';
  serviceSection.innerHTML = `
    <h3>LLM Service</h3>
    <div class="service-controls">
      <select class="service-select">
        <option value="mock">Mock Service (Testing)</option>
        <option value="openai">OpenAI</option>
      </select>
      <div class="api-key-input">
        <input type="password"
          placeholder="Enter API key/token"
          class="service-api-key"
          ${llmService?.apiKey ? 'value="' + llmService.apiKey + '"' : ''}
          ${llmService?.type === 'mock' ? 'disabled' : ''}
        />
        <div class="api-key-buttons">
          <button class="save-api-key" title="Save API Key" ${llmService?.type === 'mock' ? 'disabled' : ''}></button>
          <button class="clear-api-key" title="Clear API Key" ${llmService?.type === 'mock' ? 'disabled' : ''}></button>
        </div>
      </div>
    </div>
  `;
  content.appendChild(serviceSection);

  // Add generate button section
  const generateSection = document.createElement('div');
  generateSection.className = 'generate-section';
  generateSection.innerHTML = `
    <button class="generate-button">
      <span class="generate-icon">✨</span>
      <span class="generate-label">Generate Reply</span>
    </button>
  `;
  content.appendChild(generateSection);

  // Add generated reply section
  const generatedReplySection = document.createElement('div');
  generatedReplySection.className = 'generated-reply';
  generatedReplySection.style.display = 'none';
  generatedReplySection.innerHTML = `
    <h3>
      Generated Reply
      <div class="reply-actions">
        <button class="action-button copy-button" title="Copy to clipboard">Copy</button>
        <button class="action-button reset-button" title="Reset to original">Reset</button>
      </div>
    </h3>
    <div class="reply-box">
      <textarea
        class="prompt-input"
        rows="4"
      ></textarea>
    </div>
  `;
  content.appendChild(generatedReplySection);

  // Add event listeners for copy and reset buttons
  const copyButton = generatedReplySection.querySelector('.copy-button');
  const resetButton = generatedReplySection.querySelector('.reset-button');
  const replyTextarea = generatedReplySection.querySelector('.prompt-input');

  if (copyButton) {
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(replyTextarea.value);
        copyButton.textContent = 'Copied!';
        copyButton.classList.add('action-success');
        setTimeout(() => {
          copyButton.textContent = 'Copy';
          copyButton.classList.remove('action-success');
        }, 2000);
      } catch (err) {
        console.error('Failed to copy text:', err);
        alert('Failed to copy text to clipboard');
      }
    });
  }

  if (resetButton) {
    resetButton.addEventListener('click', () => {
      if (replyTextarea.dataset.originalReply) {
        replyTextarea.value = replyTextarea.dataset.originalReply;
      }
    });
  }

  panel.appendChild(content);

  // Add event listeners
  const styleOptions = panel.querySelector('.style-options');
  if (styleOptions) {
    styleOptions.addEventListener('click', handleStyleSelection);
  }

  const refreshButton = panel.querySelector('.refresh-button');
  if (refreshButton) {
    refreshButton.addEventListener('click', (e) => {
      e.preventDefault();
      const button = e.currentTarget;
      button.classList.add('spinning');
      initializeCommentSelection();
      setTimeout(() => {
        button.classList.remove('spinning');
      }, 1000);
    });
  }

  const generateButton = panel.querySelector('.generate-button');
  if (generateButton) {
    generateButton.addEventListener('click', handleGenerate);
  }

  // Add event listeners for service controls
  const serviceSelect = panel.querySelector('.service-select');
  const saveApiKeyButton = panel.querySelector('.save-api-key');
  const clearApiKeyButton = panel.querySelector('.clear-api-key');
  const apiKeyInput = panel.querySelector('.service-api-key');

  if (serviceSelect) {
    serviceSelect.addEventListener('change', handleServiceChange);
  }

  if (saveApiKeyButton) {
    saveApiKeyButton.addEventListener('click', handleSaveApiKey);
  }

  if (clearApiKeyButton) {
    clearApiKeyButton.addEventListener('click', handleClearApiKey);
  }

  if (apiKeyInput) {
    apiKeyInput.addEventListener('input', updateGenerateButtonState);
  }

  // Initialize generate button state
  updateGenerateButtonState();

  return panel;
}

// Show panel
function showPanel() {
  let panel = document.getElementById('smart-comment-panel');
  if (!panel) {
    panel = createPanel();
    document.body.appendChild(panel);
    // Force a reflow before adding the visible class
    panel.offsetHeight;
  }
  panel.classList.add('visible');
}

// Hide panel
function hidePanel() {
  const panel = document.getElementById('smart-comment-panel');
  if (panel) {
    panel.classList.remove('visible');
    // Remove panel after transition
    setTimeout(() => {
      panel.remove();
    }, 300);
  }
}

// Handle comment selection
function handleCommentSelection(commentElement) {
  if (!isExtensionActive) return;

  // Remove selection from previously selected comment
  const previouslySelected = document.querySelector('ytd-comment-view-model.selected');
  if (previouslySelected) {
    previouslySelected.classList.remove('selected');
  }

  // Add selection to clicked comment
  commentElement.classList.add('selected');

  // Update panel content with selected comment details
  updatePanelContent(commentElement);

  // Scroll the comment into view if it's not fully visible
  // FIXME: this is not working
  commentElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Update panel content with selected comment details
function updatePanelContent(commentElement) {
  const panel = document.getElementById('smart-comment-panel');
  if (!panel) return;

  const selectedComment = panel.querySelector('.selected-comment');
  const noSelectionMessage = selectedComment.querySelector('.no-selection-message');
  const commentDetails = selectedComment.querySelector('.comment-details');
  const authorElement = commentDetails.querySelector('.comment-author');
  const textElement = commentDetails.querySelector('.comment-text');

  // Get comment details
  const authorName = commentElement.querySelector('#author-text').textContent.trim();
  const commentText = commentElement.querySelector('#content-text').textContent.trim();

  if (commentElement) {
    // Hide no selection message and show comment details
    noSelectionMessage.style.display = 'none';
    commentDetails.style.display = 'block';

    // Update comment details
    authorElement.textContent = authorName;
    textElement.textContent = commentText;
  } else {
    // Show no selection message and hide comment details
    noSelectionMessage.style.display = 'block';
    commentDetails.style.display = 'none';
  }

  // Update generate button state
  updateGenerateButtonState();
}

// Create click handler with bound context
function createClickHandler(element) {
  return function clickHandler(e) {
    if (!isExtensionActive) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    handleCommentSelection(element);
  };
}

// Clean up all extension features
function cleanupExtensionFeatures() {
  // Hide panel
  hidePanel();

  // Remove all comment selection functionality
  const selectableElements = document.querySelectorAll('.selectable, .selected');
  selectableElements.forEach(element => {
    element.classList.remove('selectable', 'selected');
    const clickHandler = element._clickHandler;
    if (clickHandler) {
      element.removeEventListener('click', clickHandler);
      delete element._clickHandler;
    }
  });

  // Clean up all replies observers
  document.querySelectorAll('ytd-comment-thread-renderer').forEach(thread => {
    if (thread._repliesObserver) {
      thread._repliesObserver.disconnect();
      delete thread._repliesObserver;
    }
  });

  // Disconnect main observer if it exists
  if (commentObserver) {
    commentObserver.disconnect();
    commentObserver = null;
  }
}

// Make comment selectable
function makeCommentSelectable(element) {
  if (!element || element.classList.contains('selectable')) return;

  element.classList.add('selectable');

  // Remove any existing click handler
  if (element._clickHandler) {
    element.removeEventListener('click', element._clickHandler);
  }

  const clickHandler = createClickHandler(element);
  element._clickHandler = clickHandler;

  // Add click handler to both the element and its content
  element.addEventListener('click', clickHandler);

  // Also make the comment content clickable
  const content = element.querySelector('#content, #main');
  if (content) {
    content.addEventListener('click', clickHandler);
  }
}

// Function to process comments
function processComments() {
  const commentThreads = document.querySelectorAll('ytd-comment-thread-renderer');

  commentThreads.forEach(thread => {
    // Make main comment selectable
    const mainComment = thread.querySelector('ytd-comment-view-model#comment');
    if (mainComment) {
      makeCommentSelectable(mainComment);
    }

    // Make replies selectable
    const repliesSection = thread.querySelector('ytd-comment-replies-renderer');
    if (repliesSection) {
      const replies = repliesSection.querySelectorAll('ytd-comment-view-model.style-scope.ytd-comment-replies-renderer');

      replies.forEach(reply => {
        makeCommentSelectable(reply);
      });
    }
  });

  return commentThreads.length > 0;
}

// Initialize comment selection
function initializeCommentSelection() {
  if (!isExtensionActive) return;

  // First, set up an observer for the primary div to detect when comments section is added
  const primaryObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.tagName === 'YTD-COMMENTS') {
            // Once comments are added, watch for sections
            watchForSections(node);
            // We can disconnect this observer as we don't need it anymore
            primaryObserver.disconnect();
          }
        });
      }
    });
  });

  // Find the primary div
  const primaryDiv = document.querySelector('#primary');
  if (primaryDiv) {
    // Check if comments already exists
    const existingComments = primaryDiv.querySelector('ytd-comments');
    if (existingComments) {
      watchForSections(existingComments);
    } else {
      primaryObserver.observe(primaryDiv, {
        childList: true,
        subtree: false
      });
    }
  } else {
  }
}

// Watch for sections being added to comments
function watchForSections(commentsElement) {
  const sectionsObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.id === 'sections') {
            // Once sections are added, set up the contents observer
            setupContentsObserver();
            // We can disconnect this observer as we don't need it anymore
            sectionsObserver.disconnect();
          }
        });
      }
    });
  });

  // Check if sections already exists
  if (commentsElement.querySelector('#sections')) {
    setupContentsObserver();
  } else {
    sectionsObserver.observe(commentsElement, {
      childList: true,
      subtree: false
    });
  }
}

// Set up observer for replies in a comment thread
function setupRepliesObserver(threadElement) {
  // Find or wait for the replies section
  const repliesSection = threadElement.querySelector('ytd-comment-replies-renderer');
  if (repliesSection) {
    // Find the expander contents
    const expanderContent = repliesSection.querySelector('#expander #expander-contents #contents');
    if (expanderContent) {
      // Set up observer for this specific replies section
      const repliesObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          if (mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach(node => {
              if (node.nodeName === 'YTD-COMMENT-RENDERER') {
                const replyComment = node.querySelector('ytd-comment-view-model');
                if (replyComment) {
                  makeCommentSelectable(replyComment);
                } else {
                }
              }
            });
          }
        });
      });

      // Start observing the expander contents
      repliesObserver.observe(expanderContent, {
        childList: true,
        subtree: false
      });

      // Process any existing replies that might already be there
      const existingReplies = expanderContent.querySelectorAll('ytd-comment-renderer ytd-comment-view-model');
      if (existingReplies.length > 0) {
        existingReplies.forEach(reply => makeCommentSelectable(reply));
      }

      // Store the observer on the element so we can clean it up later
      threadElement._repliesObserver = repliesObserver;
    } else {
    }
  } else {
  }
}

// Set up observer for contents
function setupContentsObserver() {
  // Process existing comments first
  processComments();

  // Set up observer for the comments contents div
  commentObserver = new MutationObserver((mutations) => {
    if (!isExtensionActive) {
      if (commentObserver) {
        commentObserver.disconnect();
      }
      return;
    }

    mutations.forEach(mutation => {
      // Only process if new nodes were added
      if (mutation.addedNodes.length > 0) {
        // Check if we're observing the correct contents div
        const target = mutation.target;
        if (target.id === 'contents' &&
            target.parentElement.id === 'sections' &&
            target.closest('ytd-comments#comments')) {
          // Process only the newly added comment threads
          mutation.addedNodes.forEach(node => {
            if (node.nodeName === 'YTD-COMMENT-THREAD-RENDERER') {
              const mainComment = node.querySelector('ytd-comment-view-model#comment');
              if (mainComment) {
                makeCommentSelectable(mainComment);
              }

              // Set up observer for replies in this thread
              setupRepliesObserver(node);

              // Process any existing replies
              const repliesSection = node.querySelector('ytd-comment-replies-renderer');
              if (repliesSection) {
                const replies = repliesSection.querySelectorAll('ytd-comment-view-model.style-scope.ytd-comment-replies-renderer');
                replies.forEach(reply => makeCommentSelectable(reply));
              }
            }
          });
        }

        // Check if this is a reply being added to an expander
        const expanderContent = target.closest('#expander-contents #contents');
        if (expanderContent) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeName === 'YTD-COMMENT-VIEW-MODEL') {
              makeCommentSelectable(node);
            }
          });
        }
      }
    });
  });

  // Find and observe the comments contents div using the full hierarchy
  const contentsDiv = document.querySelector('#content #page-manager #primary ytd-comments#comments ytd-item-section-renderer#sections #contents');
  if (contentsDiv) {
    commentObserver.observe(contentsDiv, {
      childList: true,
      subtree: true
    });
  } else {
  }
}

// Update panel status
function updatePanelStatus() {
  const panel = document.getElementById('smart-comment-panel');
  if (panel) {
    const status = panel.querySelector('.panel-status');
    if (status) {
      status.textContent = isExtensionActive ? '(Active)' : '(Inactive)';
    }
  }
}

// Handle state changes
async function handleStateChange(activated) {
  // Update state first
  isExtensionActive = activated;

  if (activated) {
    // Initialize extension features
    showPanel();
    await initializeLLMService();
    setTimeout(() => {
      initializeCommentSelection();
    }, 2000);
  } else {
    // Clean up all extension features
    cleanupExtensionFeatures();
    llmService = null;
  }

  // Update panel status
  updatePanelStatus();
}

// Listen for state changes from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'STATE_CHANGED') {
    handleStateChange(message.isActivated);
    sendResponse({ success: true });
  } else if (message.type === 'GET_STATE') {
    sendResponse({ isActivated: isExtensionActive });
  }
  return true;
});

// Initialize on page load
chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
  if (response) {
    handleStateChange(response.isActivated);
  }
});

// Handle style button selection
function handleStyleSelection(event) {
  const button = event.target.closest('.style-button');
  if (!button) return;

  // Remove selection from all buttons
  document.querySelectorAll('.style-button').forEach(btn => {
    btn.classList.remove('selected');
  });

  // Add selection to clicked button
  button.classList.add('selected');
}

// Handle generate button click
async function handleGenerate() {
  if (!llmService) {
    console.warn('LLM service not initialized yet, retrying...');
    // Try to initialize if not ready
    await initializeLLMService();
    if (!llmService) {
      alert('Service not available. Please try again in a moment.');
      return;
    }
  }

  const panel = document.getElementById('smart-comment-panel');
  const generateButton = panel.querySelector('.generate-button');
  const generatedReply = panel.querySelector('.generated-reply');
  const replyTextarea = generatedReply.querySelector('.prompt-input');

  // Get selected comment
  const selectedComment = document.querySelector('ytd-comment-view-model.selected');
  if (!selectedComment) {
    alert('Please select a comment first.');
    return;
  }

  const commentText = selectedComment.querySelector('#content-text').textContent.trim();

  // Get selected style (default to 'positive' if none selected)
  const selectedStyleButton = panel.querySelector('.style-button.selected') || panel.querySelector('[data-style="positive"]');
  if (!selectedStyleButton) {
    alert('Please select a comment style.');
    return;
  }
  const style = selectedStyleButton.dataset.style;

  // Get user prompt
  const userPrompt = panel.querySelector('.prompt-input').value.trim();

  try {
    // Disable button and show loading state
    generateButton.disabled = true;
    generateButton.innerHTML = '<span class="generate-icon">⏳</span><span class="generate-label">Generating...</span>';

    // Generate reply
    const reply = await llmService.generateReply(commentText, style, userPrompt);

    // Show generated reply
    replyTextarea.value = reply;
    replyTextarea.dataset.originalReply = reply;  // Store original reply for reset functionality
    generatedReply.style.display = 'block';
  } catch (error) {
    console.error('Failed to generate reply:', error);
    alert('Failed to generate reply. Please try again.');
  } finally {
    // Reset button state
    generateButton.disabled = false;
    generateButton.innerHTML = '<span class="generate-icon">✨</span><span class="generate-label">Generate Reply</span>';
  }
}

// Update generate button state based on service type and API key
function updateGenerateButtonState() {
  const panel = document.getElementById('smart-comment-panel');
  if (!panel) return;

  const generateButton = panel.querySelector('.generate-button');
  const serviceSelect = panel.querySelector('.service-select');
  const apiKeyInput = panel.querySelector('.service-api-key');
  const selectedComment = document.querySelector('ytd-comment-view-model.selected');

  if (!generateButton || !serviceSelect || !apiKeyInput) return;

  const serviceType = serviceSelect.value;
  const apiKey = apiKeyInput.value.trim();

  // Disable button if:
  // 1. No comment is selected OR
  // 2. Using non-mock service without API key
  const shouldDisable = !selectedComment || (serviceType !== 'mock' && !apiKey);
  generateButton.disabled = shouldDisable;
}

// Handle service selection change
async function handleServiceChange(event) {
  const serviceType = event.target.value;
  const apiKeyInput = document.querySelector('.service-api-key');
  const saveButton = document.querySelector('.save-api-key');
  const clearButton = document.querySelector('.clear-api-key');
  const apiKey = apiKeyInput.value.trim();

  try {
    // If factory not loaded yet, load it
    if (!LLMServiceFactory) {
      const module = await import(serviceURL);
      LLMServiceFactory = module.LLMServiceFactory;
    }

    // Toggle API key input and buttons based on service type
    const isMockService = serviceType === 'mock';
    apiKeyInput.disabled = isMockService;
    saveButton.disabled = isMockService;
    clearButton.disabled = isMockService;

    // Create new service instance or update existing one
    if (!llmService || llmService.type !== serviceType) {
      // Only create new service if type is different
      llmService = LLMServiceFactory.createService(serviceType, {});
      // Set API key after creation if one exists
      if (apiKey) {
        llmService.setApiKey(apiKey);
      }
    }

    // Save service type to storage
    await chrome.storage.sync.set({ llmServiceType: serviceType });

    // If there's an API key and it's not mock service, save it
    if (apiKey && !isMockService) {
      await chrome.storage.sync.set({ apiKey });
    }

    // Update generate button state after service change
    updateGenerateButtonState();
  } catch (error) {
    console.error('Failed to switch service:', error);
    // Fall back to mock service only if there's a critical error
    event.target.value = 'mock';
    apiKeyInput.disabled = true;
    saveButton.disabled = true;
    clearButton.disabled = true;
    llmService = LLMServiceFactory?.createService('mock', {});
  }
}

// Handle API key save
async function handleSaveApiKey() {
  const apiKeyInput = document.querySelector('.service-api-key');
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    alert('Please enter an API key');
    return;
  }

  try {
    // Save API key to storage
    await chrome.storage.sync.set({ apiKey });

    // Update API key in service
    if (llmService) {
      llmService.setApiKey(apiKey);
    }

    alert('API key saved successfully');
    // Update generate button state after saving API key
    updateGenerateButtonState();
  } catch (error) {
    console.error('Failed to save API key:', error);
    alert('Failed to save API key. Please try again.');
  }
}

// Handle API key clear
async function handleClearApiKey() {
  const apiKeyInput = document.querySelector('.service-api-key');

  try {
    // Clear API key from storage
    await chrome.storage.sync.remove('apiKey');

    // Clear input field
    apiKeyInput.value = '';

    // Clear API key in service
    if (llmService) {
      llmService.setApiKey(null);
    }

    // Update generate button state
    updateGenerateButtonState();

    alert('API key cleared successfully');
  } catch (error) {
    console.error('Failed to clear API key:', error);
    alert('Failed to clear API key. Please try again.');
  }
}
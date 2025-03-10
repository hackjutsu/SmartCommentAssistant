// Global state
let isExtensionActive = false;
let commentObserver = null;

// Create banner element
function createBanner() {
  const banner = document.createElement('div');
  banner.id = 'smart-comment-banner';
  banner.textContent = 'Smart Comment Assistant is active';
  return banner;
}

// Show banner
function showBanner() {
  let banner = document.getElementById('smart-comment-banner');
  if (!banner) {
    banner = createBanner();
    // Insert banner as the first element in the body
    if (document.body.firstChild) {
      document.body.insertBefore(banner, document.body.firstChild);
    } else {
      document.body.appendChild(banner);
    }
    // Add margin to prevent content jump
    document.documentElement.style.marginTop = '36px';
    // Force a reflow before adding the visible class
    banner.offsetHeight;
  }
  banner.classList.add('visible');
}

// Hide banner
function hideBanner() {
  const banner = document.getElementById('smart-comment-banner');
  if (banner) {
    banner.classList.remove('visible');
    // Remove banner and reset margin after transition
    setTimeout(() => {
      banner.remove();
      document.documentElement.style.marginTop = '';
    }, 300);
  }
}

// Handle comment selection
function handleCommentSelection(commentElement) {
  if (!isExtensionActive) return;

  console.log('Comment selected:', commentElement);

  // Remove selection from previously selected comment
  const previouslySelected = document.querySelector('ytd-comment-view-model.selected');
  if (previouslySelected) {
    previouslySelected.classList.remove('selected');
  }

  // Add selection to clicked comment
  commentElement.classList.add('selected');

  // Scroll the comment into view if it's not fully visible
  commentElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Create click handler with bound context
function createClickHandler(element) {
  return function clickHandler(e) {
    if (!isExtensionActive) {
      console.log('Click ignored - extension not active');
      return;
    }

    console.log('Click detected on element:', element);
    e.preventDefault();
    e.stopPropagation();
    handleCommentSelection(element);
  };
}

// Clean up all extension features
function cleanupExtensionFeatures() {
  console.log('Cleaning up extension features...');

  // Hide banner
  hideBanner();

  // Remove all comment selection functionality
  const selectableElements = document.querySelectorAll('.selectable, .selected');
  console.log('Removing selection from', selectableElements.length, 'elements');

  selectableElements.forEach(element => {
    element.classList.remove('selectable', 'selected');
    const clickHandler = element._clickHandler;
    if (clickHandler) {
      element.removeEventListener('click', clickHandler);
      delete element._clickHandler;
    }
  });

  // Disconnect observer if it exists
  if (commentObserver) {
    commentObserver.disconnect();
    commentObserver = null;
    console.log('Disconnected comment observer');
  }
}

// Make comment selectable
function makeCommentSelectable(element) {
  if (!element || element.classList.contains('selectable')) return;

  console.log('Making comment selectable:', element);
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
  console.log('Found comment threads:', commentThreads.length);

  commentThreads.forEach(thread => {
    // Make main comment selectable
    const mainComment = thread.querySelector('ytd-comment-view-model#comment');
    if (mainComment) {
      console.log('Found main comment:', mainComment);
      makeCommentSelectable(mainComment);
    }

    // Make replies selectable
    const repliesSection = thread.querySelector('ytd-comment-replies-renderer');
    if (repliesSection) {
      const replies = repliesSection.querySelectorAll('ytd-comment-view-model.style-scope.ytd-comment-replies-renderer');
      console.log('Found replies:', replies.length);
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

  console.log('Initializing comment selection');

  // Wait for comments to load
  const waitForComments = setInterval(() => {
    if (!isExtensionActive) {
      clearInterval(waitForComments);
      return;
    }

    if (processComments()) {
      clearInterval(waitForComments);

      // Set up observer for dynamic comment loading
      commentObserver = new MutationObserver((mutations) => {
        if (!isExtensionActive) {
          commentObserver.disconnect();
          return;
        }

        let shouldProcess = false;
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeName === 'YTD-COMMENT-THREAD-RENDERER' ||
                node.nodeName === 'YTD-COMMENT-RENDERER' ||
                node.nodeName === 'YTD-COMMENT-REPLIES-RENDERER') {
              shouldProcess = true;
            }
          });
        });

        if (shouldProcess) {
          console.log('New comments or replies detected, processing...');
          setTimeout(processComments, 500); // Add a small delay to ensure content is loaded
        }
      });

      // Start observing the comments section
      const commentsSection = document.querySelector('ytd-comments');
      if (commentsSection) {
        commentObserver.observe(commentsSection, {
          childList: true,
          subtree: true,
          attributes: false,
          characterData: false
        });
        console.log('Started observing comments section');
      }

      // Do one more process after a delay to catch any late-loading replies
      setTimeout(processComments, 2000);
    }
  }, 1000);

  // Clear interval after 10 seconds
  setTimeout(() => {
    clearInterval(waitForComments);
    console.log('Comment initialization timeout');
  }, 10000);
}

// Handle state changes
function handleStateChange(activated) {
  console.log('Handling state change:', activated);

  // Update state first
  isExtensionActive = activated;

  if (activated) {
    // Initialize extension features
    showBanner();
    console.log('Banner shown');
    // Small delay to ensure banner is shown before initializing comments
    setTimeout(() => {
      initializeCommentSelection();
    }, 100);
  } else {
    // Clean up all extension features
    cleanupExtensionFeatures();
    console.log('Extension deactivated');
  }
}

// Listen for state changes from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);

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
  console.log('Initial state received:', response);
  if (response) {
    handleStateChange(response.isActivated);
  }
});
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
  // FIXME: this is not working
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

  // First, set up an observer for the primary div to detect when comments section is added
  const primaryObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.tagName === 'YTD-COMMENTS') {
            console.log('Comments section added');
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
      console.log('Comments section already exists');
      watchForSections(existingComments);
    } else {
      console.log('Waiting for comments section to be added');
      primaryObserver.observe(primaryDiv, {
        childList: true,
        subtree: false
      });
    }
  } else {
    console.log('Primary div not found');
  }
}

// Watch for sections being added to comments
function watchForSections(commentsElement) {
  const sectionsObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.id === 'sections') {
            console.log('Comments section renderer added');
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
    console.log('Comments section renderer already exists');
    setupContentsObserver();
  } else {
    console.log('Waiting for comments section renderer to be added');
    sectionsObserver.observe(commentsElement, {
      childList: true,
      subtree: false
    });
  }
}

// Set up observer for contents
function setupContentsObserver() {
  // Process existing comments first
  processComments();

  // Set up observer for the comments contents div
  commentObserver = new MutationObserver((mutations) => {
    if (!isExtensionActive) {
      commentObserver.disconnect();
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
          console.log('New content added to comments section');
          // Process only the newly added comment threads
          mutation.addedNodes.forEach(node => {
            if (node.nodeName === 'YTD-COMMENT-THREAD-RENDERER') {
              console.log('Processing new comment thread');
              const mainComment = node.querySelector('ytd-comment-view-model#comment');
              if (mainComment) {
                makeCommentSelectable(mainComment);
              }

              const repliesSection = node.querySelector('ytd-comment-replies-renderer');
              if (repliesSection) {
                const replies = repliesSection.querySelectorAll('ytd-comment-view-model.style-scope.ytd-comment-replies-renderer');
                replies.forEach(reply => makeCommentSelectable(reply));
              }
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
    console.log('Started observing comments contents div');
  } else {
    console.log('Could not find comments contents div');
  }
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
    // Wait for 2 seconds to ensure DOM is built
    console.log('Waiting 2 seconds for DOM to be ready...');
    setTimeout(() => {
      initializeCommentSelection();
    }, 2000);
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
// Global state
let isExtensionActive = false;
let commentObserver = null;

// Create banner element
function createBanner() {
  const banner = document.createElement('div');
  banner.id = 'smart-comment-banner';
  banner.textContent = isExtensionActive ? 'Smart Comment Assistant is active' : 'Smart Comment Assistant is inactive';
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
  } else {
    // Update banner text to match current state
    banner.textContent = isExtensionActive ? 'Smart Comment Assistant is active' : 'Smart Comment Assistant is inactive';
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

      return;
    }


    e.preventDefault();
    e.stopPropagation();
    handleCommentSelection(element);
  };
}

// Clean up all extension features
function cleanupExtensionFeatures() {


  // Hide banner
  hideBanner();

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

// Handle state changes
function handleStateChange(activated) {


  // Update state first
  isExtensionActive = activated;

  if (activated) {
    // Initialize extension features
    showBanner();

    // Wait for 2 seconds to ensure DOM is built

    setTimeout(() => {
      initializeCommentSelection();
    }, 2000);
  } else {
    // Clean up all extension features
    cleanupExtensionFeatures();

  }
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
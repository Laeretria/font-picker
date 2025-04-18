// background.js - This script runs in the background

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only run when the page is fully loaded
  if (changeInfo.status === 'complete' && tab.url) {
    // Skip chrome:// pages, chrome web store, etc.
    if (
      !tab.url.startsWith('chrome://') &&
      !tab.url.startsWith('chrome-extension://') &&
      !tab.url.includes('chrome.google.com/webstore')
    ) {
      // Execute content script on this tab
      chrome.scripting
        .executeScript({
          target: { tabId: tabId },
          files: ['content.js'],
        })
        .catch((err) => console.error('Error injecting content script:', err))
    }
  }
})

// Listen for when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed or updated')
})

// Listen for messages from the popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkContentScriptStatus') {
    // Forward this message to the content script in the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        // Try to send message to content script
        chrome.tabs.sendMessage(tabs[0].id, { action: 'ping' }, (response) => {
          // Check if we got a response
          const contentScriptRunning =
            !chrome.runtime.lastError && response && response.status === 'ok'
          sendResponse({ contentScriptRunning })
        })
      } else {
        sendResponse({ contentScriptRunning: false })
      }
    })
    return true // Keep the message channel open for async response
  }
})

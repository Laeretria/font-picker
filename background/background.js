// background.js - This script runs in the background

// Track the last analyzed URL
let lastAnalyzedUrl = ''

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
      // Store the URL for comparison
      lastAnalyzedUrl = tab.url

      // Execute content script on this tab
      chrome.scripting
        .executeScript({
          target: { tabId: tabId },
          files: ['content/content.js'],
        })
        .catch((err) => console.error('Error injecting content script:', err))
    }
  }
})

// Listen for tab activation (switching between tabs)
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && tab.url && tab.url !== lastAnalyzedUrl) {
      lastAnalyzedUrl = tab.url

      // Skip chrome:// pages, chrome web store, etc.
      if (
        !tab.url.startsWith('chrome://') &&
        !tab.url.startsWith('chrome-extension://') &&
        !tab.url.includes('chrome.google.com/webstore')
      ) {
        // Execute content script on this tab
        chrome.scripting
          .executeScript({
            target: { tabId: activeInfo.tabId },
            files: ['content/content.js'],
          })
          .catch((err) => console.error('Error injecting content script:', err))
      }
    }
  })
})

// Store popup state
let popupOpen = false

// Listen for when the popup opens
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'popupOpened') {
    popupOpen = true
    sendResponse({ status: 'ok' })
    return true
  }

  if (request.action === 'popupClosed') {
    popupOpen = false
    sendResponse({ status: 'ok' })
    return true
  }

  if (request.action === 'checkContentScriptStatus') {
    // Forward this message to the content script in the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        // Inject content script first to ensure it's available
        chrome.scripting
          .executeScript({
            target: { tabId: tabs[0].id },
            files: ['content/content.js'],
          })
          .then(() => {
            // Now try to send message to content script
            chrome.tabs.sendMessage(
              tabs[0].id,
              { action: 'ping' },
              (response) => {
                // Check if we got a response
                const contentScriptRunning =
                  !chrome.runtime.lastError &&
                  response &&
                  response.status === 'ok'
                sendResponse({ contentScriptRunning })
              }
            )
          })
          .catch((err) => {
            console.error('Error injecting content script:', err)
            sendResponse({ contentScriptRunning: false })
          })
      } else {
        sendResponse({ contentScriptRunning: false })
      }
    })
    return true // Keep the message channel open for async response
  }

  if (request.action === 'getPageData') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        // Get the current URL
        const currentUrl = tabs[0].url

        // Notify content script to analyze page data
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: 'analyzePage' },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error(
                'Error communicating with content script:',
                chrome.runtime.lastError
              )
              // Try to inject content script and retry
              chrome.scripting
                .executeScript({
                  target: { tabId: tabs[0].id },
                  files: ['content/content.js'],
                })
                .then(() => {
                  // Retry after injection
                  chrome.tabs.sendMessage(
                    tabs[0].id,
                    { action: 'analyzePage' },
                    (retryResponse) => {
                      sendResponse(
                        retryResponse || { error: 'Failed to analyze page' }
                      )
                    }
                  )
                })
                .catch((err) => {
                  console.error('Error injecting content script:', err)
                  sendResponse({ error: 'Cannot analyze this page type' })
                })
            } else {
              sendResponse(response)
            }
          }
        )
      } else {
        sendResponse({ error: 'No active tab found' })
      }
    })
    return true // Keep the message channel open for async response
  }
})

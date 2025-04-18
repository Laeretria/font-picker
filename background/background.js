// background.js - This script runs in the background

// Track the last analyzed URL
let lastAnalyzedUrl = ''

// Track last selected element data
let lastSelectedData = null

// Store popup state
let popupOpen = false

// Helper function to safely use storage
function safelyStoreData(key, value) {
  try {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [key]: value }, function () {
        console.log('Data saved to storage:', key)
      })
    } else {
      // Fallback to localStorage if chrome.storage isn't available
      localStorage.setItem(key, JSON.stringify(value))
      console.log('Data saved to localStorage:', key)
    }
  } catch (error) {
    console.error('Storage error:', error)
  }
}

// Helper function to safely get data
function safelyGetData(keys, callback) {
  try {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(keys, callback)
    } else {
      // Fallback to localStorage
      const result = {}
      keys.forEach((key) => {
        try {
          const value = localStorage.getItem(key)
          if (value) {
            result[key] = JSON.parse(value)
          }
        } catch (e) {
          console.error('Error reading from localStorage:', e)
        }
      })
      callback(result)
    }
  } catch (error) {
    console.error('Error getting data:', error)
    callback({})
  }
}

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

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'popupOpened') {
    popupOpen = true

    // If we have recently selected data, send it to the popup
    if (lastSelectedData && Date.now() - lastSelectedData.timestamp < 30000) {
      // Send the data back to the popup that just opened
      setTimeout(() => {
        chrome.runtime.sendMessage({
          action: 'loadSelectedElement',
          fontData: lastSelectedData.fontData,
          colorData: lastSelectedData.colorData,
        })
      }, 200) // Short delay to ensure popup is fully initialized
    }

    sendResponse({ status: 'ok' })
    return true
  }

  if (request.action === 'popupClosed') {
    popupOpen = false
    sendResponse({ status: 'ok' })
    return true
  }

  if (request.action === 'elementSelected') {
    console.log('Background received element selection:', request)

    // Store the data
    lastSelectedData = {
      fontData: request.fontData,
      colorData: request.colorData,
      timestamp: Date.now(),
    }

    // Store data safely
    safelyStoreData('selectedElementFontData', request.fontData)
    safelyStoreData('selectedElementColorData', request.colorData)
    safelyStoreData('lastSelectionTimestamp', Date.now())

    try {
      // Try to show a notification, but handle errors gracefully
      if (chrome.notifications) {
        chrome.notifications.create('element-selected', {
          type: 'basic',
          iconUrl: 'assets/icons/icon128.png',
          title: 'Element Selected',
          message: 'Click here to view the selected element details',
          priority: 2,
          requireInteraction: true,
        })
      } else {
        console.log('Notifications API not available')
        // Try to reopen the popup directly
        if (chrome.action && chrome.action.openPopup) {
          setTimeout(() => {
            try {
              chrome.action.openPopup()
            } catch (e) {
              console.error('Error opening popup:', e)
            }
          }, 300)
        }
      }
    } catch (error) {
      console.error('Error creating notification:', error)
    }

    sendResponse({ status: 'processed' })
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

  // Add a way to retrieve stored element data
  if (request.action === 'getStoredElementData') {
    safelyGetData(
      [
        'selectedElementFontData',
        'selectedElementColorData',
        'lastSelectionTimestamp',
      ],
      function (data) {
        sendResponse(data)
      }
    )
    return true // Keep the channel open for the async response
  }
})

// Try to set up notification click listener if available
try {
  if (chrome.notifications) {
    chrome.notifications.onClicked.addListener(function (notificationId) {
      if (notificationId === 'element-selected') {
        // Clear the notification
        chrome.notifications.clear(notificationId)

        // Try to open the popup
        if (chrome.action && chrome.action.openPopup) {
          try {
            chrome.action.openPopup()
          } catch (e) {
            console.error('Error opening popup:', e)
          }
        }
      }
    })
  }
} catch (error) {
  console.error('Error setting up notification listener:', error)
}

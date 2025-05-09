// background.js - This script runs in the background

// Track the last analyzed URL and tab ID
let lastAnalyzedUrl = ''
let lastActiveTabId = null

// Track last selected element data
let lastSelectedData = null

// Track page refreshes and element selection
let pageLoadTimestamps = {}
let lastElementSelectionTime = 0
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

// Safely inject content script with proper error handling
function safelyInjectContentScript(tabId) {
  // Skip if we don't have the scripting permission
  if (!chrome.scripting) {
    console.log('Scripting API not available')
    return Promise.reject(new Error('Scripting API not available'))
  }

  return new Promise((resolve, reject) => {
    // First check if we can inject into this tab by checking permissions
    chrome.permissions.contains(
      { permissions: ['scripting'], origins: ['<all_urls>'] },
      (hasPermission) => {
        if (!hasPermission) {
          console.log('No scripting permission for this tab')
          reject(new Error('No scripting permission for this tab'))
          return
        }

        // Try to execute script with proper error handling
        chrome.scripting
          .executeScript({
            target: { tabId: tabId },
            files: ['content/content.js'],
          })
          .then(() => {
            console.log('Content script injected successfully')
            resolve()
          })
          .catch((err) => {
            console.error('Error injecting content script:', err)
            reject(err)
          })
      }
    )
  })
}

// Function to clear all stored data
function clearAllStoredData() {
  console.log('CLEARING ALL STORED DATA IN BACKGROUND')

  // Clear in-memory variables
  lastSelectedData = null

  // Clear chrome storage
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.remove([
      'selectedElementFontData',
      'selectedElementColorData',
      'lastSelectionTimestamp',
      'latestColorData',
    ])
  }

  return true
}

// Listen for tab updates - Track page refreshes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only run when the page is fully loaded
  if (changeInfo.status === 'complete' && tab.url) {
    // Record page load timestamp
    pageLoadTimestamps[tabId] = Date.now()

    console.log(`Tab ${tabId} loaded at ${pageLoadTimestamps[tabId]}`)

    // Skip chrome:// pages, chrome web store, file:// URLs, etc.
    if (
      !tab.url.startsWith('chrome://') &&
      !tab.url.startsWith('chrome-extension://') &&
      !tab.url.startsWith('file://') &&
      !tab.url.includes('chrome.google.com/webstore')
    ) {
      // Store the URL for comparison
      lastAnalyzedUrl = tab.url

      // Try to inject the content script but handle potential errors
      safelyInjectContentScript(tabId).catch((err) => {
        // Just log the error - we'll handle this case when the popup tries to communicate
        console.log(
          `Could not inject into tab ${tabId}, will retry when needed: ${err.message}`
        )
      })
    }
  }
})

// Listen for tab activation (switching between tabs) with better error handling and tab ID tracking
chrome.tabs.onActivated.addListener((activeInfo) => {
  const tabId = activeInfo.tabId
  console.log(`Tab activated: ${tabId} (previous: ${lastActiveTabId})`)

  // If we're switching to a different tab, we should clear data
  const tabChanged = lastActiveTabId !== null && lastActiveTabId !== tabId

  // Remember this tab as the last active tab
  lastActiveTabId = tabId

  // Store this tab switch event so popup can check it
  safelyStoreData('lastTabSwitchInfo', {
    tabId: tabId,
    timestamp: Date.now(),
    shouldClearData: tabChanged,
  })

  chrome.tabs.get(tabId, (tab) => {
    if (tab && tab.url) {
      // Check if URL is different from last analyzed URL
      const urlChanged = tab.url !== lastAnalyzedUrl

      // If URL changed, clear data and update lastAnalyzedUrl
      if (urlChanged) {
        console.log('URL changed, clearing data')
        clearAllStoredData()
        lastAnalyzedUrl = tab.url
      }

      // Skip chrome:// pages, chrome web store, etc.
      if (
        !tab.url.startsWith('chrome://') &&
        !tab.url.startsWith('chrome-extension://') &&
        !tab.url.startsWith('file://') &&
        !tab.url.includes('chrome.google.com/webstore')
      ) {
        // Try to inject but handle failures gracefully
        safelyInjectContentScript(tabId).catch((err) => {
          // Just log the error - we'll handle this case when the popup tries to communicate
          console.log(
            `Could not inject into activated tab, will retry when needed: ${err.message}`
          )
        })
      }
    }
  })
})

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'popupOpened') {
    popupOpen = true
    console.log(
      'Popup opened, lastSelectedData status:',
      lastSelectedData ? 'exists' : 'null'
    )

    // Get current tab ID to check for tab switches
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        const currentTabId = tabs[0].id

        // If this is a different tab than before, clear associated data
        if (lastActiveTabId !== null && lastActiveTabId !== currentTabId) {
          // We've switched tabs, should clear data unless there's been a recent element selection
          if (Date.now() - lastElementSelectionTime > 30000) {
            clearAllStoredData()
          }
        }

        // Update the last active tab ID
        lastActiveTabId = currentTabId
      }
    })

    // Check if we should send element data AND switch to font tab
    chrome.storage.local.get(['pendingElementSelection'], function (result) {
      // If we have recently selected data, ALWAYS send it to the popup
      if (
        lastSelectedData &&
        lastSelectedData.fontData &&
        lastSelectedData.colorData &&
        Date.now() - lastSelectedData.timestamp < 30000
      ) {
        // Send the data back to the popup that just opened
        setTimeout(() => {
          chrome.runtime.sendMessage({
            action: result.pendingElementSelection
              ? 'loadSelectedElement'
              : 'updateFontData',
            fontData: lastSelectedData.fontData,
            colorData: lastSelectedData.colorData,
            // Only switch to font tab if pendingElementSelection is true
            switchToFontTab: result.pendingElementSelection === true,
          })
        }, 200) // Short delay to ensure popup is fully initialized
      }
    })

    sendResponse({ status: 'ok' })
    return true
  }

  if (request.action === 'popupClosed') {
    popupOpen = false
    sendResponse({ status: 'ok' })
    return true
  }

  // Handle checking for tab changes
  if (request.action === 'checkTabStatus') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) {
        sendResponse({ error: 'No active tab' })
        return
      }

      const currentTabId = tabs[0].id
      const tabChanged =
        lastActiveTabId !== null && lastActiveTabId !== currentTabId

      console.log(
        `Tab status check: Current tab: ${currentTabId}, Last tab: ${lastActiveTabId}, Changed: ${tabChanged}`
      )

      // Update the stored tab ID
      lastActiveTabId = currentTabId

      sendResponse({
        currentTabId: currentTabId,
        previousTabId: lastActiveTabId,
        tabChanged: tabChanged,
        lastTabSwitchTimestamp: Date.now(),
      })
    })
    return true
  }

  // NEW: Check page status (used by popup to determine when to clear data)
  if (request.action === 'checkPageStatus') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) {
        sendResponse({ error: 'No active tab' })
        return
      }

      const tabId = tabs[0].id
      const currentUrl = tabs[0].url
      const storedUrl = lastAnalyzedUrl

      // Check URL change
      const urlChanged = currentUrl !== storedUrl

      // Check tab change
      const tabChanged = lastActiveTabId !== null && lastActiveTabId !== tabId

      // Check page refresh - was this page loaded recently?
      const loadTime = pageLoadTimestamps[tabId] || 0
      const pageRefreshed = loadTime > lastElementSelectionTime

      // Check for recent element selection (within last 30 seconds)
      const recentElementSelection =
        Date.now() - lastElementSelectionTime < 30000

      console.log(
        `Page status check: URL changed: ${urlChanged}, Tab changed: ${tabChanged}, Page refreshed: ${pageRefreshed}, Recent selection: ${recentElementSelection}`
      )
      console.log(`  Current URL: ${currentUrl}, Stored URL: ${storedUrl}`)
      console.log(`  Current tab: ${tabId}, Last tab: ${lastActiveTabId}`)
      console.log(
        `  Page load time: ${loadTime}, Last selection time: ${lastElementSelectionTime}`
      )

      // Update stored values
      lastAnalyzedUrl = currentUrl
      lastActiveTabId = tabId

      sendResponse({
        urlChanged,
        tabChanged,
        pageRefreshed,
        recentElementSelection,
        pageLoadTime: loadTime,
        lastSelectionTime: lastElementSelectionTime,
        currentTabId: tabId,
      })
    })
    return true
  }

  // NEW: Mark element selection event
  if (request.action === 'markElementSelectionEvent') {
    lastElementSelectionTime = request.timestamp || Date.now()
    console.log(`Marked element selection event at ${lastElementSelectionTime}`)
    sendResponse({ status: 'ok' })
    return true
  }

  // NEW: Clear stored data
  if (request.action === 'clearStoredData') {
    clearAllStoredData()
    sendResponse({ status: 'ok' })
    return true
  }

  if (request.action === 'elementSelected') {
    console.log('Background received element selection:', request)

    // Update selection timestamp
    lastElementSelectionTime = Date.now()

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

    // EXPLICITLY set the pendingElementSelection flag to ensure font tab opens
    chrome.storage.local.set({ pendingElementSelection: true }, function () {
      console.log(
        'EXPLICITLY set pendingElementSelection flag for element selection'
      )
    })

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
      if (!tabs || !tabs[0] || !tabs[0].id) {
        sendResponse({
          contentScriptRunning: false,
          error: 'No active tab found',
        })
        return
      }

      // First try to send a ping to see if content script is already running
      chrome.tabs.sendMessage(tabs[0].id, { action: 'ping' }, (response) => {
        // If we get a response, content script is already running
        if (!chrome.runtime.lastError && response && response.status === 'ok') {
          sendResponse({ contentScriptRunning: true })
          return
        }

        // If we get here, content script isn't running or there was an error
        // Try to inject it
        safelyInjectContentScript(tabs[0].id)
          .then(() => {
            // After injection, try ping again
            chrome.tabs.sendMessage(
              tabs[0].id,
              { action: 'ping' },
              (pingResponse) => {
                const success =
                  !chrome.runtime.lastError &&
                  pingResponse &&
                  pingResponse.status === 'ok'

                sendResponse({
                  contentScriptRunning: success,
                  message: success
                    ? 'Script injected and running'
                    : 'Script injection failed',
                })
              }
            )
          })
          .catch((err) => {
            // If we can't inject, report failure
            sendResponse({
              contentScriptRunning: false,
              error: `Cannot inject script: ${err.message}`,
              message: `This page cannot be analyzed. Try visiting a different website.`,
            })
          })
      })
    })
    return true // Keep the message channel open for async response
  }

  if (request.action === 'getPageData') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0] || !tabs[0].id) {
        sendResponse({ error: 'No active tab found' })
        return
      }

      // Get the current URL
      const currentUrl = tabs[0].url

      // First try to ping the content script to see if it's running
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'ping' },
        (pingResponse) => {
          const isRunning =
            !chrome.runtime.lastError &&
            pingResponse &&
            pingResponse.status === 'ok'

          if (isRunning) {
            // Content script is running, request analysis
            chrome.tabs.sendMessage(
              tabs[0].id,
              { action: 'analyzePage' },
              (response) => {
                if (chrome.runtime.lastError) {
                  sendResponse({ error: 'Error communicating with page' })
                } else {
                  sendResponse(response)
                }
              }
            )
          } else {
            // Content script is not running, try to inject it
            safelyInjectContentScript(tabs[0].id)
              .then(() => {
                // After injection, request analysis
                chrome.tabs.sendMessage(
                  tabs[0].id,
                  { action: 'analyzePage' },
                  (response) => {
                    if (chrome.runtime.lastError) {
                      sendResponse({
                        error: 'Error communicating with page after injection',
                      })
                    } else {
                      sendResponse(response)
                    }
                  }
                )
              })
              .catch((err) => {
                sendResponse({
                  error: 'Cannot analyze this page',
                  message:
                    'This page cannot be analyzed. Try visiting a different website.',
                })
              })
          }
        }
      )
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

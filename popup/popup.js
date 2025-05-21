document.addEventListener('DOMContentLoaded', function () {
  // Add variable to LOCK tab switching completely after initialization
  let initializing = true
  let tabLocked = false
  let lastSelectedTab = null

  // Add a function to force a specific tab after a delay (prevents any flickering)
  function forceTabAfterDelay(tabId, delay) {
    setTimeout(() => {
      activateSpecificTab(tabId)
      // Re-allow tab switching only after we've stabilized
      setTimeout(() => {
        tabLocked = false
      }, 100)
    }, delay)
  }

  // Helper function to activate a specific tab
  function activateSpecificTab(tabId) {
    // Don't allow tab switching if locked (unless it's our own forced switch)
    if (tabLocked && lastSelectedTab === tabId) {
      return
    }

    // Remember this selection
    lastSelectedTab = tabId

    // Reset ALL tab states first
    document.querySelectorAll('.tab-content').forEach((content) => {
      content.classList.remove('active')
    })

    document.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.remove('active')
    })

    // Then activate just the specified tab
    const tabContent = document.getElementById(`${tabId}-tab`)
    const navItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`)

    if (tabContent) tabContent.classList.add('active')
    if (navItem) navItem.classList.add('active')
  }

  // First check for element selection
  chrome.storage.local.get(
    ['pendingElementSelection', 'forceOverviewTab'],
    function (result) {
      // Clean approach: Determine the tab we want to show and then lock to it
      let targetTab = 'overview' // Default to overview

      if (result.pendingElementSelection === true) {
        // Clear this flag immediately
        chrome.storage.local.remove(['pendingElementSelection'])
        // We also want to remove the forceOverviewTab flag since we're handling element selection
        chrome.storage.local.remove(['forceOverviewTab'])

        targetTab = 'font'
      } else {
        // Set flag to enforce overview tab for future openings
        chrome.storage.local.set({ forceOverviewTab: true })
      }

      // Activate the initial tab
      activateSpecificTab(targetTab)

      // LOCK tab switching to prevent flickering
      tabLocked = true

      // Force re-activation of the target tab after a delay to prevent any hijacking
      forceTabAfterDelay(targetTab, 50)

      // After a longer delay, mark initialization as complete
      setTimeout(() => {
        initializing = false
      }, 500)

      // Now continue with regular initialization
      // Notify background script that popup has opened
      chrome.runtime.sendMessage({ action: 'popupOpened' })

      // Initialize variables
      let fontTab = null
      let colorsTab = null
      let pickerActive = false
      let overviewTab = null
      let colorScanInProgress = false

      // Track current tab for tab switching detection
      let currentTabId = null

      // AGGRESSIVE DATA CLEARING APPROACH:
      // We'll check URL, page refresh status, AND tab changes
      checkAndClearData()

      // New helper function to activate the font tab
      function activateFontTab() {
        // Skip if we're still initializing or tab is locked
        if (initializing || tabLocked) {
          return
        }

        // Use our centralized tab activation function
        activateSpecificTab('font')

        // Initialize font tab if needed
        if (!fontTab && typeof FontTab !== 'undefined') {
          fontTab = new FontTab()
        }
      }

      function checkAndClearData() {
        chrome.tabs.query(
          { active: true, currentWindow: true },
          function (tabs) {
            if (tabs && tabs[0] && tabs[0].id) {
              const currentUrl = tabs[0].url
              currentTabId = tabs[0].id

              // Get stored URL from chrome.storage for comparison
              chrome.storage.local.get(['lastVisitedUrl'], function (result) {
                const lastUrl = result.lastVisitedUrl || ''
                const urlChanged = lastUrl && lastUrl !== currentUrl

                // IMMEDIATELY clear data if URL has changed
                if (urlChanged) {
                  clearAllStorageData()

                  // Store new URL in chrome.storage
                  chrome.storage.local.set({ lastVisitedUrl: currentUrl })

                  // Also update localStorage for backward compatibility
                  localStorage.setItem('lastVisitedUrl', currentUrl)
                }

                // Get tab info from background script
                chrome.runtime.sendMessage(
                  {
                    action: 'checkTabStatus',
                  },
                  function (tabResponse) {
                    // Request page information from background script
                    chrome.runtime.sendMessage(
                      {
                        action: 'checkPageStatus',
                        url: currentUrl,
                        tabId: currentTabId,
                      },
                      function (response) {
                        // Store current URL after processing in both storage types
                        chrome.storage.local.set({ lastVisitedUrl: currentUrl })
                        localStorage.setItem('lastVisitedUrl', currentUrl)

                        // If any of these conditions are true, clear data
                        if (
                          response &&
                          (response.urlChanged ||
                            response.tabChanged ||
                            response.pageRefreshed ||
                            !response.recentElementSelection)
                        ) {
                          clearAllStorageData()
                        }
                      }
                    )
                  }
                )
              })
            }
          }
        )
      }

      // Add a function to toggle tab navigation:
      function toggleTabNavigation(enable) {
        const navItems = document.querySelectorAll('.nav-item')
        navItems.forEach((item) => {
          if (enable) {
            item.classList.remove('disabled')
            item.style.pointerEvents = 'auto'
            item.style.opacity = '1'
          } else {
            item.classList.add('disabled')
            item.style.pointerEvents = 'none'
            item.style.opacity = '0.5'
          }
        })
        colorScanInProgress = !enable
      }

      // Function to clear ALL storage locations
      function clearAllStorageData() {
        // 1. Clear localStorage
        localStorage.removeItem('selectedElementFontData')
        localStorage.removeItem('selectedElementColorData')
        localStorage.removeItem('latestColorData')
        localStorage.removeItem('scannedUrls')

        // Keep lastVisitedUrl for reference (don't remove it)

        // 2. Clear chrome.storage
        if (chrome.storage && chrome.storage.local) {
          chrome.storage.local.remove([
            'selectedElementFontData',
            'selectedElementColorData',
            'latestColorData',
            'lastSelectionTimestamp',
            'pendingElementSelection', // Also clear this flag
            'scannedUrls',
          ])
        }

        // 3. Clear session storage if available
        try {
          sessionStorage.clear()
        } catch (e) {}

        // 4. Tell background script to clear its data
        chrome.runtime.sendMessage({ action: 'clearStoredData' })

        // 5. Reset UI
        clearAllFontUI()
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

      // Helper function to safely store data
      function safelyStoreData(key, value) {
        try {
          // Always save to localStorage
          localStorage.setItem(key, JSON.stringify(value))

          // If chrome.storage is available, save there too
          if (chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ [key]: value }, function () {
              console.log('Data saved to chrome.storage:', key)
            })
          }
        } catch (error) {
          console.error('Storage error:', error)
        }
      }

      // Tab switching functionality
      const navItems = document.querySelectorAll('.nav-item')
      const tabContents = document.querySelectorAll('.tab-content')

      navItems.forEach((item) => {
        item.addEventListener('click', function () {
          // Don't allow tab switching if color scan is in progress or during initialization
          if (colorScanInProgress || initializing || tabLocked) {
            return
          }

          // Get the target tab ID
          const tabId = this.getAttribute('data-tab')
          const targetTabElement = document.getElementById(`${tabId}-tab`)

          if (!targetTabElement) {
            console.error(`Tab content with ID "${tabId}-tab" not found!`)
            return
          }

          // Activate the tab with our centralized function
          activateSpecificTab(tabId)

          // ADD THIS LINE: Clear any "pendingElementSelection" flag when user manually switches tabs
          chrome.storage.local.remove(['pendingElementSelection'])

          // Initialize tab controllers if needed
          try {
            if (tabId === 'font' && !fontTab) {
              if (typeof FontTab !== 'undefined') {
                // Pre-clear all font values in the UI
                clearAllFontUI()
                fontTab = new FontTab()
              } else {
                console.error('FontTab class is not defined!')
              }
            }
            if (tabId === 'colors' && !colorsTab) {
              if (typeof ColorsTab !== 'undefined') {
                // Check if we've already completed a full scan for this URL
                const currentUrl = localStorage.getItem('lastVisitedUrl')
                const scannedUrls = JSON.parse(
                  localStorage.getItem('scannedUrls') || '{}'
                )
                const hasScannedThisUrl =
                  currentUrl && scannedUrls[currentUrl] === true

                // Pass the scan status directly to the ColorsTab constructor
                colorsTab = new ColorsTab(hasScannedThisUrl)

                // If we haven't scanned yet, mark that we've now scanned this URL
                if (!hasScannedThisUrl && currentUrl) {
                  scannedUrls[currentUrl] = true
                  localStorage.setItem(
                    'scannedUrls',
                    JSON.stringify(scannedUrls)
                  )
                }

                // Check if we have stored colors from animations/delayed loading
                const latestColorData = localStorage.getItem('latestColorData')
                if (latestColorData) {
                  try {
                    const parsedData = JSON.parse(latestColorData)
                    colorsTab.updateColorUI(parsedData)
                    // Clear the stored data after using it
                    localStorage.removeItem('latestColorData')
                  } catch (e) {
                    console.error('Error applying stored color data:', e)
                  }
                }
              } else {
                console.error('ColorsTab class is not defined!')
              }
            } else if (tabId === 'overview' && !overviewTab) {
              if (typeof OverviewTab !== 'undefined') {
                overviewTab = new OverviewTab()
              } else {
                console.error('OverviewTab class is not defined!')
              }
            }
          } catch (error) {
            console.error('Error initializing tab controller:', error)
          }
        })
      })

      // Helper function to clear all font UI elements
      function clearAllFontUI() {
        // Clear all font-related elements in the UI
        if (document.getElementById('body-font')) {
          document.getElementById('body-font').textContent = ''
        }
        if (document.getElementById('font-style')) {
          document.getElementById('font-style').textContent = ''
        }
        if (document.getElementById('font-weight')) {
          document.getElementById('font-weight').textContent = ''
        }
        if (document.getElementById('font-size')) {
          document.getElementById('font-size').textContent = ''
        }
        if (document.getElementById('line-height')) {
          document.getElementById('line-height').textContent = ''
        }

        if (document.getElementById('css-snippet')) {
          document.getElementById('css-snippet').textContent = ''
        }

        // In the clearAllFontUI function, update the color swatch part to:
        if (document.getElementById('text-color-swatch')) {
          const swatch = document.getElementById('text-color-swatch')
          swatch.style.backgroundColor = ''
          swatch.title = 'Tekstkleur'
          swatch.dataset.color = ''
          swatch.style.display = 'none' // Hide when clearing
        }
      }

      // Element picker functionality
      const elementPickerBtn = document.getElementById('element-picker-btn')
      if (elementPickerBtn) {
        elementPickerBtn.addEventListener('click', function () {
          chrome.tabs.query(
            { active: true, currentWindow: true },
            function (tabs) {
              if (tabs && tabs[0] && tabs[0].id) {
                // Toggle picker state
                pickerActive = !pickerActive

                // Send message to toggle picker in the content script
                chrome.tabs.sendMessage(tabs[0].id, { action: 'togglePicker' })

                // Update button text based on picker state
                elementPickerBtn.textContent = pickerActive
                  ? 'Cancel Selection'
                  : 'Pick Element'

                // Close the popup window when picker is activated
                if (pickerActive) {
                  window.close()
                }
              } else {
                console.error('Unable to find active tab')
              }
            }
          )
        })
      }

      // Inline element picker functionality
      const inlineElementPickerBtn = document.getElementById(
        'inline-element-picker-btn'
      )
      if (inlineElementPickerBtn) {
        inlineElementPickerBtn.addEventListener('click', function () {
          chrome.tabs.query(
            { active: true, currentWindow: true },
            function (tabs) {
              if (tabs && tabs[0] && tabs[0].id) {
                // Toggle picker state
                pickerActive = !pickerActive

                // Send message to toggle picker in the content script
                chrome.tabs.sendMessage(tabs[0].id, { action: 'togglePicker' })

                // Update both buttons' text based on picker state
                if (elementPickerBtn) {
                  elementPickerBtn.textContent = pickerActive
                    ? 'Cancel Selection'
                    : 'Pick Element'
                }
                inlineElementPickerBtn.textContent = pickerActive
                  ? 'Cancel Selection'
                  : 'Selecteer element'

                // Close the popup window when picker is activated
                if (pickerActive) {
                  window.close()
                }
              } else {
                console.error('Unable to find active tab')
              }
            }
          )
        })
      }

      // Initialize tabs - but don't automatically change the active tab
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs && tabs[0] && tabs[0].id) {
          // Store current tab ID
          currentTabId = tabs[0].id

          // Get active tab - DON'T switch tabs here, just load data where needed
          const activeNavItem = document.querySelector('.nav-item.active')
          if (activeNavItem) {
            const activeTabId = activeNavItem.getAttribute('data-tab')

            try {
              if (activeTabId === 'font') {
                // Pre-clear all font UI elements
                clearAllFontUI()

                if (typeof FontTab !== 'undefined') {
                  // Always create a new instance to get fresh data
                  fontTab = new FontTab()
                } else {
                  console.error('FontTab class is not defined!')
                }
              } else if (activeTabId === 'colors') {
                if (typeof ColorsTab !== 'undefined') {
                  // Check if we've already completed a full scan for this URL
                  const currentUrl = localStorage.getItem('lastVisitedUrl')
                  const scannedUrls = JSON.parse(
                    localStorage.getItem('scannedUrls') || '{}'
                  )
                  const hasScannedThisUrl =
                    currentUrl && scannedUrls[currentUrl] === true

                  // Pass the scan status directly to the constructor
                  colorsTab = new ColorsTab(hasScannedThisUrl)

                  // If we haven't scanned yet, mark that we've now scanned this URL
                  if (!hasScannedThisUrl && currentUrl) {
                    scannedUrls[currentUrl] = true
                    localStorage.setItem(
                      'scannedUrls',
                      JSON.stringify(scannedUrls)
                    )
                  }

                  // Check if we have stored updated colors from animations/delayed loading
                  const latestColorData =
                    localStorage.getItem('latestColorData')
                  if (latestColorData) {
                    try {
                      const parsedData = JSON.parse(latestColorData)
                      colorsTab.updateColorUI(parsedData)
                      // Clear the stored data after using it
                      localStorage.removeItem('latestColorData')
                    } catch (e) {
                      console.error('Error applying stored color data:', e)
                    }
                  }
                } else {
                  console.error('ColorsTab class is not defined!')
                }
              } else if (activeTabId === 'overview') {
                if (typeof OverviewTab !== 'undefined') {
                  // Always create a new instance to get fresh data
                  overviewTab = new OverviewTab()
                } else {
                  console.error('OverviewTab class is not defined!')
                }
              }
            } catch (error) {
              console.error('Error initializing active tab:', error)
            }
          }

          // Force tab to remain on the targetTab one more time
          forceTabAfterDelay(lastSelectedTab, 100)
        } else {
          console.error('Unable to find active tab')
        }
      })

      // Listen for messages from content script and background script
      chrome.runtime.onMessage.addListener(function (
        request,
        sender,
        sendResponse
      ) {
        // Replace the entire elementSelected handler with this code
        if (request.action === 'elementSelected') {
          // Reset picker status and button text
          pickerActive = false
          if (elementPickerBtn) {
            elementPickerBtn.textContent = 'Pick Element'
          }

          // Mark this as a special element selection case
          chrome.runtime.sendMessage({
            action: 'markElementSelectionEvent',
            timestamp: Date.now(),
          })

          // Store data in localStorage
          if (request.fontData) {
            request.fontData._isFromElementSelection = true
            localStorage.setItem(
              'selectedElementFontData',
              JSON.stringify(request.fontData)
            )
          }

          if (request.colorData) {
            request.colorData._isFromElementSelection = true
            localStorage.setItem(
              'selectedElementColorData',
              JSON.stringify(request.colorData)
            )
          }

          // Set flag to indicate we're coming back from element selection
          // Use chrome.storage.local instead of localStorage
          chrome.storage.local.set(
            { pendingElementSelection: true },
            function () {}
          )

          // Remove the forceOverviewTab to ensure element selection takes precedence
          chrome.storage.local.remove(['forceOverviewTab'])

          // Force the font tab to be active in DOM
          activateSpecificTab('font')
          // Set the lock to prevent switching
          tabLocked = true
          // Re-force font tab after a delay to fully prevent flickering
          forceTabAfterDelay('font', 50)

          // Update data in controllers after tab is active and initialized
          if (fontTab && request.fontData) {
            try {
              fontTab.updateSelectedElementFontData(
                request.fontData,
                request.colorData
              )
            } catch (error) {
              console.error('Error updating font data:', error)
            }
          }

          if (colorsTab && request.colorData) {
            try {
              colorsTab.updateSelectedElementColorData(request.colorData)
            } catch (error) {
              console.error('Error updating color data:', error)
            }
          }

          sendResponse({ status: 'ok', dataUpdated: true })
          return true
        }
        // Replace the entire loadSelectedElement handler with this code
        if (request.action === 'loadSelectedElement') {
          // Mark this as a special element selection case
          chrome.runtime.sendMessage({
            action: 'markElementSelectionEvent',
            timestamp: Date.now(),
          })

          // Store data in localStorage
          if (request.fontData) {
            request.fontData._isFromElementSelection = true
            localStorage.setItem(
              'selectedElementFontData',
              JSON.stringify(request.fontData)
            )
          }

          if (request.colorData) {
            request.colorData._isFromElementSelection = true
            localStorage.setItem(
              'selectedElementColorData',
              JSON.stringify(request.colorData)
            )
          }

          // Remove the forceOverviewTab to ensure element selection takes precedence
          chrome.storage.local.remove(['forceOverviewTab'])

          // Force the font tab to be active
          activateSpecificTab('font')
          // Set the lock to prevent switching
          tabLocked = true
          // Re-force font tab after a delay to fully prevent flickering
          forceTabAfterDelay('font', 50)

          // Update data in controllers after tab is active and initialized
          if (fontTab && request.fontData) {
            try {
              fontTab.updateSelectedElementFontData(
                request.fontData,
                request.colorData
              )
            } catch (error) {
              console.error('Error updating font data:', error)
            }
          }

          if (colorsTab && request.colorData) {
            try {
              colorsTab.updateSelectedElementColorData(request.colorData)
            } catch (error) {
              console.error('Error updating color data:', error)
            }
          }

          sendResponse({ status: 'ok' })
          return true
        }

        // Add a new handler for updateFontData
        if (request.action === 'updateFontData') {
          // Store data in localStorage
          if (request.fontData) {
            request.fontData._isFromElementSelection = true
            localStorage.setItem(
              'selectedElementFontData',
              JSON.stringify(request.fontData)
            )
          }

          if (request.colorData) {
            request.colorData._isFromElementSelection = true
            localStorage.setItem(
              'selectedElementColorData',
              JSON.stringify(request.colorData)
            )
          }

          // Initialize the Font tab data (if we're on the font tab)
          const activeTabId = document
            .querySelector('.nav-item.active')
            .getAttribute('data-tab')

          // Only load and display the data if we're actually on the font tab
          if (activeTabId === 'font') {
            // Initialize font tab if needed
            if (!fontTab && typeof FontTab !== 'undefined') {
              fontTab = new FontTab()
            }

            // Update data in controllers
            if (fontTab && request.fontData) {
              try {
                fontTab.updateSelectedElementFontData(
                  request.fontData,
                  request.colorData
                )
              } catch (error) {
                console.error('Error updating font data:', error)
              }
            }
          }

          sendResponse({ status: 'ok' })
          return true
        }

        // Handle color updates from delayed/animated content
        if (request.action === 'colorUpdateAvailable') {
          // If color tab is initialized, update it with new colors
          if (colorsTab) {
            try {
              colorsTab.updateColorUI(request.colors)
            } catch (error) {
              console.error('Error updating colors UI:', error)
            }
          } else {
            // Store for later if tab isn't active yet
            localStorage.setItem(
              'latestColorData',
              JSON.stringify(request.colors)
            )
          }

          sendResponse({ status: 'ok' })
          return true
        }

        if (request.action === 'colorScanProgress') {
          // If this is the first progress update, disable tab navigation
          if (request.progress < 5 && !colorScanInProgress) {
            toggleTabNavigation(false)
          }

          // Update progress UI if colorsTab is initialized
          if (colorsTab) {
            colorsTab.updateScanProgress(request.progress)
          }

          sendResponse({ status: 'ok' })
          return true
        }

        // Handle color updates during scrolling
        if (request.action === 'colorUpdateDuringScroll') {
          // Update the colors UI with new colors if colorsTab is initialized
          if (colorsTab) {
            // Update progress
            colorsTab.updateScanProgress(request.progress)

            // Update colors display with new colors
            if (request.colors) {
              colorsTab.updateColorUI(request.colors)
            }
          }

          sendResponse({ status: 'ok' })
          return true
        }

        // Handle completion of color scan
        if (request.action === 'colorScanComplete') {
          // Re-enable tab navigation
          toggleTabNavigation(true)

          if (colorsTab) {
            // Hide the loading overlay
            colorsTab.hideLoadingOverlay()

            // Final update of colors with complete results
            if (request.colors) {
              colorsTab.updateColorUI(request.colors)
            }
          }

          sendResponse({ status: 'ok' })
          return true
        }

        // Ensure proper sizing
        if (document.querySelector('.app-container')) {
          document.querySelector('.app-container').style.height = '550px'
          document.querySelector('.app-container').style.overflowX = 'hidden'
        }

        // Ensure main content doesn't overflow
        const mainContent = document.querySelector('.main-content')
        if (mainContent) {
          mainContent.style.overflowX = 'hidden'
        }

        return true // Keep the message channel open for async response
      })

      // Add this to notify when popup is closing/being unloaded
      window.addEventListener('beforeunload', function () {
        chrome.runtime.sendMessage({ action: 'popupClosed' })

        // Set forceOverviewTab flag for next opening unless there's a pending selection
        chrome.storage.local.get(
          ['pendingElementSelection'],
          function (result) {
            if (!result.pendingElementSelection) {
              chrome.storage.local.set({ forceOverviewTab: true })
            }
          }
        )
      })
    }
  )
})

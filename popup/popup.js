// Cleaned popup.js with added support for animated/delayed color updates
document.addEventListener('DOMContentLoaded', function () {
  // Notify background script that popup has opened
  chrome.runtime.sendMessage({ action: 'popupOpened' })

  // Initialize variables
  let fontTab = null
  let colorsTab = null
  let pickerActive = false
  let overviewTab = null

  // Track current tab for tab switching detection
  let currentTabId = null

  // AGGRESSIVE DATA CLEARING APPROACH:
  // We'll check URL, page refresh status, AND tab changes
  checkAndClearData()

  console.log('Popup initialized')

  // Helper function to aggressively check and clear data
  // In the popup.js, modify the checkAndClearData function
  function checkAndClearData() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs && tabs[0] && tabs[0].id) {
        const currentUrl = tabs[0].url
        currentTabId = tabs[0].id

        // Get stored URL from localStorage for comparison
        const lastUrl = localStorage.getItem('lastVisitedUrl')
        const urlChanged = lastUrl && lastUrl !== currentUrl

        // IMMEDIATELY clear data if URL has changed
        if (urlChanged) {
          console.log(
            'URL changed, clearing data:',
            lastUrl,
            ' -> ',
            currentUrl
          )
          clearAllStorageData()
          localStorage.setItem('lastVisitedUrl', currentUrl)
        }

        // Get tab info from background script
        chrome.runtime.sendMessage(
          {
            action: 'checkTabStatus',
          },
          function (tabResponse) {
            console.log('Tab status:', tabResponse)

            // Request page information from background script
            chrome.runtime.sendMessage(
              {
                action: 'checkPageStatus',
                url: currentUrl,
                tabId: currentTabId,
              },
              function (response) {
                console.log('Page status:', response)

                // Store current URL after processing
                localStorage.setItem('lastVisitedUrl', currentUrl)

                // If any of these conditions are true, clear data:
                // 1. URL has changed
                // 2. Tab has changed
                // 3. Page has been refreshed
                // 4. No recent element selection
                if (
                  response &&
                  (response.urlChanged ||
                    response.tabChanged ||
                    response.pageRefreshed ||
                    !response.recentElementSelection)
                ) {
                  console.log('Clearing data because:', response)
                  clearAllStorageData()
                }
              }
            )
          }
        )
      }
    })
  }

  // Function to clear ALL storage locations
  function clearAllStorageData() {
    console.log('PERFORMING COMPLETE DATA CLEAR')

    // 1. Clear localStorage
    localStorage.removeItem('selectedElementFontData')
    localStorage.removeItem('selectedElementColorData')
    localStorage.removeItem('latestColorData')
    localStorage.removeItem('lastVisitedUrl')

    // 2. Clear chrome.storage
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.remove([
        'selectedElementFontData',
        'selectedElementColorData',
        'latestColorData',
        'lastVisitedUrl',
        'lastSelectionTimestamp',
      ])
    }

    // 3. Clear session storage if available
    try {
      sessionStorage.clear()
    } catch (e) {
      console.log('Session storage not available')
    }

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

  console.log('Found nav items:', navItems.length)
  console.log('Found tab contents:', tabContents.length)

  navItems.forEach((item) => {
    item.addEventListener('click', function () {
      console.log('Tab clicked:', this.getAttribute('data-tab'))

      // Get the target tab ID
      const tabId = this.getAttribute('data-tab')
      const targetTabElement = document.getElementById(`${tabId}-tab`)

      if (!targetTabElement) {
        console.error(`Tab content with ID "${tabId}-tab" not found!`)
        return
      }

      // Remove active class from all nav items
      navItems.forEach((navItem) => {
        navItem.classList.remove('active')
      })

      // Add active class to clicked nav item
      this.classList.add('active')

      // Hide all tab contents by removing active class
      // This preserves flex display and gap properties from CSS
      tabContents.forEach((content) => {
        content.classList.remove('active')
      })

      // Show the selected tab content by adding active class
      targetTabElement.classList.add('active')

      console.log(`Switched to ${tabId} tab`)

      // Initialize tab controllers if needed
      try {
        if (tabId === 'font' && !fontTab) {
          console.log('Initializing FontTab')
          if (typeof FontTab !== 'undefined') {
            // Pre-clear all font values in the UI
            clearAllFontUI()
            fontTab = new FontTab()
          } else {
            console.error('FontTab class is not defined!')
          }
        } else if (tabId === 'colors' && !colorsTab) {
          console.log('Initializing ColorsTab')
          if (typeof ColorsTab !== 'undefined') {
            colorsTab = new ColorsTab()

            // Check if we have stored updated colors from animations/delayed loading
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
        } // In the tab switching functionality, add:
        else if (tabId === 'overview' && !overviewTab) {
          console.log('Initializing OverviewTab')
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
    if (document.getElementById('font-preview')) {
      document.getElementById('font-preview').textContent = ''
      const preview = document.getElementById('font-preview')
      if (preview) {
        preview.style.fontFamily = ''
        preview.style.fontSize = ''
        preview.style.fontStyle = ''
        preview.style.fontWeight = ''
        preview.style.lineHeight = ''
      }
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
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
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
      })
    })
  }

  // Always refresh data on popup open
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs && tabs[0] && tabs[0].id) {
      // Store current tab ID
      currentTabId = tabs[0].id

      // Initialize the default active tab
      const activeNavItem = document.querySelector('.nav-item.active')
      if (activeNavItem) {
        const activeTabId = activeNavItem.getAttribute('data-tab')
        console.log('Default active tab:', activeTabId)
        try {
          if (activeTabId === 'font') {
            console.log('Initializing FontTab on popup open')

            // Pre-clear all font UI elements
            clearAllFontUI()

            if (typeof FontTab !== 'undefined') {
              // Always create a new instance to get fresh data
              fontTab = new FontTab()
            } else {
              console.error('FontTab class is not defined!')
            }
          } else if (activeTabId === 'colors') {
            console.log('Initializing ColorsTab on popup open')
            if (typeof ColorsTab !== 'undefined') {
              // Always create a new instance to get fresh data
              colorsTab = new ColorsTab()
              // Check if we have stored updated colors from animations/delayed loading
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
          } // In the part where we initialize the default active tab, add:
          else if (activeTabId === 'overview') {
            console.log('Initializing OverviewTab on popup open')
            if (typeof OverviewTab !== 'undefined') {
              // Always create a new instance to get fresh data
              overviewTab = new OverviewTab()
            } else {
              console.error('OverviewTab class is not defined!')
            }
          }
        } catch (error) {
          console.error('Error initializing default tab:', error)
        }
      }
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
    // Handle element selection (this might come from content script or background)
    if (request.action === 'elementSelected') {
      console.log('Element selected message received:', request)

      // Reset picker status and button text
      pickerActive = false
      if (elementPickerBtn) {
        elementPickerBtn.textContent = 'Pick Element'
      }

      // Focus on font tab after element selection
      const fontNavItem = document.querySelector('.nav-item[data-tab="font"]')
      if (fontNavItem) {
        fontNavItem.click()
      }

      // Mark this as a special element selection case
      chrome.runtime.sendMessage({
        action: 'markElementSelectionEvent',
        timestamp: Date.now(),
      })

      // Add a special flag to indicate this is from element selection
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

      if (request.fontData && fontTab) {
        try {
          fontTab.updateSelectedElementFontData(
            request.fontData,
            request.colorData
          )
        } catch (error) {
          console.error('Error updating font data:', error)
        }
      }

      if (request.colorData && colorsTab) {
        try {
          colorsTab.updateSelectedElementColorData(request.colorData)
        } catch (error) {
          console.error('Error updating color data:', error)
        }
      }

      sendResponse({ status: 'ok', dataUpdated: true })
      return true
    }

    // Handle loadSelectedElement message from background script
    if (request.action === 'loadSelectedElement') {
      console.log('Popup received loadSelectedElement message:', request)

      // Mark this as a special element selection case
      chrome.runtime.sendMessage({
        action: 'markElementSelectionEvent',
        timestamp: Date.now(),
      })

      // Focus on font tab
      const fontNavItem = document.querySelector('.nav-item[data-tab="font"]')
      if (fontNavItem) {
        fontNavItem.click()
      }

      // Handle font data
      if (request.fontData) {
        // Add flag to indicate this is from element selection
        request.fontData._isFromElementSelection = true

        // Save to localStorage
        localStorage.setItem(
          'selectedElementFontData',
          JSON.stringify(request.fontData)
        )

        // Update UI if fontTab is initialized
        if (fontTab) {
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

      // Handle color data
      if (request.colorData) {
        // Add flag to indicate this is from element selection
        request.colorData._isFromElementSelection = true

        // Save to localStorage
        localStorage.setItem(
          'selectedElementColorData',
          JSON.stringify(request.colorData)
        )

        // Update UI if colorsTab is initialized
        if (colorsTab) {
          try {
            colorsTab.updateSelectedElementColorData(request.colorData)
          } catch (error) {
            console.error('Error updating color data:', error)
          }
        }
      }

      sendResponse({ status: 'ok' })
      return true
    }

    // Handle color updates from delayed/animated content
    if (request.action === 'colorUpdateAvailable') {
      console.log('Received updated colors from delayed/animated content')

      // If color tab is initialized, update it with new colors
      if (colorsTab) {
        try {
          colorsTab.updateColorUI(request.colors)
        } catch (error) {
          console.error('Error updating colors UI:', error)
        }
      } else {
        // Store for later if tab isn't active yet
        localStorage.setItem('latestColorData', JSON.stringify(request.colors))
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
  })
})

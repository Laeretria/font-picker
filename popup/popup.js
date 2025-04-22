// Cleaned popup.js without minimizer functionality
document.addEventListener('DOMContentLoaded', function () {
  // Notify background script that popup has opened
  chrome.runtime.sendMessage({ action: 'popupOpened' })

  // Initialize variables
  let fontTab = null
  let colorsTab = null
  let pickerActive = false

  console.log('Popup initialized')
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
            fontTab = new FontTab()
          } else {
            console.error('FontTab class is not defined!')
          }
        } else if (tabId === 'colors' && !colorsTab) {
          console.log('Initializing ColorsTab')
          if (typeof ColorsTab !== 'undefined') {
            colorsTab = new ColorsTab()
          } else {
            console.error('ColorsTab class is not defined!')
          }
        }
      } catch (error) {
        console.error('Error initializing tab controller:', error)
      }
    })
  })

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
      // Initialize the default active tab
      const activeNavItem = document.querySelector('.nav-item.active')
      if (activeNavItem) {
        const activeTabId = activeNavItem.getAttribute('data-tab')
        console.log('Default active tab:', activeTabId)

        try {
          if (activeTabId === 'font') {
            console.log('Initializing FontTab on popup open')
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
            } else {
              console.error('ColorsTab class is not defined!')
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

      // Save the data to localStorage
      if (request.fontData) {
        localStorage.setItem(
          'selectedElementFontData',
          JSON.stringify(request.fontData)
        )
      }

      if (request.colorData) {
        localStorage.setItem(
          'selectedElementColorData',
          JSON.stringify(request.colorData)
        )
      }

      if (request.fontData && fontTab) {
        try {
          fontTab.updateSelectedElementFontData(request.fontData)
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

      // Focus on font tab
      const fontNavItem = document.querySelector('.nav-item[data-tab="font"]')
      if (fontNavItem) {
        fontNavItem.click()
      }

      // Handle font data
      if (request.fontData) {
        // Save to localStorage
        localStorage.setItem(
          'selectedElementFontData',
          JSON.stringify(request.fontData)
        )

        // Update UI if fontTab is initialized
        if (fontTab) {
          try {
            fontTab.updateSelectedElementFontData(request.fontData)
          } catch (error) {
            console.error('Error updating font data:', error)
          }
        }
      }

      // Handle color data
      if (request.colorData) {
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

  // Try to load the most recent element data
  safelyGetData(
    ['selectedElementFontData', 'selectedElementColorData'],
    function (data) {
      // Load font data if available
      if (data.selectedElementFontData) {
        localStorage.setItem(
          'selectedElementFontData',
          JSON.stringify(data.selectedElementFontData)
        )

        if (fontTab) {
          try {
            fontTab.updateSelectedElementFontData(data.selectedElementFontData)
          } catch (error) {
            console.error('Error updating font data:', error)
          }
        }
      }

      // Load color data if available
      if (data.selectedElementColorData) {
        localStorage.setItem(
          'selectedElementColorData',
          JSON.stringify(data.selectedElementColorData)
        )

        if (colorsTab) {
          try {
            colorsTab.updateSelectedElementColorData(
              data.selectedElementColorData
            )
          } catch (error) {
            console.error('Error updating color data:', error)
          }
        }
      }
    }
  )

  // Add this to notify when popup is closing/being unloaded
  window.addEventListener('beforeunload', function () {
    chrome.runtime.sendMessage({ action: 'popupClosed' })
  })
})

// FIXED popup.js that preserves flex and gap layouts and refreshes data on open
document.addEventListener('DOMContentLoaded', function () {
  // Initialize variables
  let fontTab = null
  let colorsTab = null

  console.log('Popup initialized')

  // Tab switching functionality
  const navItems = document.querySelectorAll('.nav-item')
  const tabContents = document.querySelectorAll('.tab-content')

  console.log('Found nav items:', navItems.length)
  console.log('Found tab contents:', tabContents.length)

  navItems.forEach((item) => {
    item.addEventListener('click', function (e) {
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
          chrome.tabs.sendMessage(tabs[0].id, { action: 'togglePicker' })
          window.close()
        } else {
          console.error('Unable to find active tab')
        }
      })
    })
  }

  // Always refresh data on popup open, regardless of if tabs were previously initialized
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

  // Listen for messages from content script
  chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {
    if (request.action === 'elementSelected') {
      console.log('Element selected message received:', request)

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
    }
    return true // Keep the message channel open for async response
  })
})

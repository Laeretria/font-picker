// Modified popup.js that includes minimizer functionality
document.addEventListener('DOMContentLoaded', function () {
  // Grab DOM elements for minimizer functionality
  const appContainer = document.querySelector('.app-container')
  const sidebar = document.querySelector('.sidebar')
  const minimizeButton = document.getElementById('minimize-button')
  const tabButtons = document.querySelectorAll('.nav-item')

  // Initialize variables
  let fontTab = null
  let colorsTab = null
  let pickerActive = false

  console.log('Popup initialized')

  // Function to adjust sidebar height when minimizing/maximizing
  function adjustSidebarHeight() {
    if (appContainer.classList.contains('minimized')) {
      // Force the sidebar height to match your hardcoded CSS value
      appContainer.style.height = '335px'
      sidebar.style.width = '50px'

      // Hide "Minimaliseer" text with opacity
      const minimizeText = minimizeButton.querySelector('.minimize-text')
      if (minimizeText) {
        minimizeText.style.opacity = '0'
        minimizeText.style.visibility = 'hidden'
      }

      // Hide the credits section with opacity
      const credits = sidebar.querySelector('.credits')
      if (credits) {
        credits.style.opacity = '0'
        credits.style.visibility = 'hidden'
        // After transition completes, set display none
        setTimeout(() => {
          if (appContainer.classList.contains('minimized')) {
            credits.style.display = 'none'
          }
        }, 300)
      }

      // Ensure tab text is hidden with opacity
      const tabLabels = sidebar.querySelectorAll('.nav-item span')
      tabLabels.forEach((span) => {
        span.style.opacity = '0'
        span.style.visibility = 'hidden'
      })
    } else {
      // Reset styles when maximized
      appContainer.style.height = '550px'
      sidebar.style.height = '100%'
      sidebar.style.width = '200px'

      // Show the credits section
      const credits = sidebar.querySelector('.credits')
      if (credits) {
        credits.style.display = 'flex'
        // Small delay to allow display:flex to take effect before transition
        setTimeout(() => {
          credits.style.visibility = 'visible'
          credits.style.opacity = '1'
        }, 10)
      }

      // Show tab text and minimize text with opacity
      const tabLabels = sidebar.querySelectorAll('.nav-item span')
      tabLabels.forEach((span) => {
        span.style.visibility = 'visible'
        span.style.opacity = '1'
      })

      // Show "Minimaliseer" text with opacity
      const minimizeText = minimizeButton.querySelector('.minimize-text')
      if (minimizeText) {
        minimizeText.style.visibility = 'visible'
        minimizeText.style.opacity = '1'
      }
    }
  }

  // Apply minimized state or maximized state
  function applyMinimizedState(isMinimized) {
    // Toggle minimized class
    if (isMinimized) {
      appContainer.classList.add('minimized')
    } else {
      appContainer.classList.remove('minimized')
    }

    // Add favicon
    addFaviconToHeader()

    // Apply correct height
    adjustSidebarHeight()
  }

  // Helper function to add favicon to the header when minimized
  function addFaviconToHeader() {
    // Check if favicon already exists
    let favicon = document.querySelector('.minimized-favicon')

    // If not, create it
    if (!favicon) {
      favicon = document.createElement('img')
      favicon.className = 'minimized-favicon'
      favicon.src = 'assets/icon-32.png' // Update this path to your actual favicon
      sidebar.querySelector('.sidebar-header').appendChild(favicon)
    }
  }

  // Set up minimize button click event
  if (minimizeButton) {
    minimizeButton.addEventListener('click', function () {
      const newMinimizedState = !appContainer.classList.contains('minimized')

      // Update localStorage
      localStorage.setItem('elementPickerMinimized', newMinimizedState)

      // Handle title display directly (no opacity transition)
      const title = sidebar.querySelector('.sidebar-title')
      if (title) {
        title.style.display = newMinimizedState ? 'none' : 'block'
      }

      // Toggle class immediately
      if (newMinimizedState) {
        appContainer.classList.add('minimized')
      } else {
        appContainer.classList.remove('minimized')
      }

      // Apply the state
      applyMinimizedState(newMinimizedState)

      // Toggle icon visibility
      const minimizeIcon = minimizeButton.querySelector('.minimize-icon')
      const maximizeIcon = minimizeButton.querySelector('.maximize-icon')

      if (minimizeIcon && maximizeIcon) {
        if (newMinimizedState) {
          minimizeIcon.style.display = 'none'
          maximizeIcon.style.display = 'block'
        } else {
          minimizeIcon.style.display = 'block'
          maximizeIcon.style.display = 'none'
        }
      }
    })
  }

  // Add click events to all tab buttons to maximize when minimized
  tabButtons.forEach((tabButton) => {
    tabButton.addEventListener('click', function () {
      // If sidebar is minimized, expand it when clicking any tab
      if (appContainer.classList.contains('minimized')) {
        // Update localStorage
        localStorage.setItem('elementPickerMinimized', false)

        // Apply maximized state
        applyMinimizedState(false)

        // Toggle icon visibility manually
        const minimizeIcon = minimizeButton.querySelector('.minimize-icon')
        const maximizeIcon = minimizeButton.querySelector('.maximize-icon')

        if (minimizeIcon && maximizeIcon) {
          minimizeIcon.style.display = 'block'
          maximizeIcon.style.display = 'none'
        }
      }
    })
  })

  // Initialize state on page load
  const isMinimized = localStorage.getItem('elementPickerMinimized') === 'true'
  if (isMinimized) {
    // Apply minimized state immediately
    applyMinimizedState(true)

    // Toggle icon visibility manually
    const minimizeIcon = minimizeButton.querySelector('.minimize-icon')
    const maximizeIcon = minimizeButton.querySelector('.maximize-icon')

    if (minimizeIcon && maximizeIcon) {
      minimizeIcon.style.display = 'none'
      maximizeIcon.style.display = 'block'
    }

    // Also apply after a short delay to ensure everything is applied correctly
    setTimeout(() => {
      applyMinimizedState(true)
    }, 100)
  }

  // Also adjust on window resize
  window.addEventListener('resize', function () {
    if (appContainer.classList.contains('minimized')) {
      adjustSidebarHeight()
    }
  })

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

  // Modified element picker functionality
  const elementPickerBtn = document.getElementById('element-picker-btn')
  if (elementPickerBtn) {
    elementPickerBtn.addEventListener('click', function () {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs && tabs[0] && tabs[0].id) {
          // Instead of closing the popup, minimize it when activating the picker
          if (!appContainer.classList.contains('minimized')) {
            // Simulate a click on the minimize button
            minimizeButton.click()
          }

          // Toggle picker state
          pickerActive = !pickerActive

          // Send message to toggle picker in the content script
          chrome.tabs.sendMessage(tabs[0].id, { action: 'togglePicker' })

          // Update button text based on picker state
          elementPickerBtn.textContent = pickerActive
            ? 'Cancel Selection'
            : 'Pick Element'
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

  // Listen for messages from content script
  chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {
    if (request.action === 'elementSelected') {
      console.log('Element selected message received:', request)

      // Maximize the popup when element is selected
      if (appContainer.classList.contains('minimized')) {
        // Update localStorage
        localStorage.setItem('elementPickerMinimized', false)

        // Apply maximized state
        applyMinimizedState(false)

        // Toggle icon visibility manually
        const minimizeIcon = minimizeButton.querySelector('.minimize-icon')
        const maximizeIcon = minimizeButton.querySelector('.maximize-icon')

        if (minimizeIcon && maximizeIcon) {
          minimizeIcon.style.display = 'block'
          maximizeIcon.style.display = 'none'
        }
      }

      // Reset picker status and button text
      pickerActive = false
      if (elementPickerBtn) {
        elementPickerBtn.textContent = 'Pick Element'
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
    }
    return true // Keep the message channel open for async response
  })
})

// Font tab specific functionality
class FontTab {
  constructor() {
    // Font elements
    this.bodyFontElement = document.getElementById('body-font')
    this.fontStyleElement = document.getElementById('font-style')
    this.fontWeightElement = document.getElementById('font-weight')
    this.fontSizeElement = document.getElementById('font-size')
    this.lineHeightElement = document.getElementById('line-height')
    this.cssSnippetElement = document.getElementById('css-snippet')
    this.copySnippetButton = document.getElementById('copy-snippet-btn')
    this.textColorSwatch = document.getElementById('text-color-swatch')
    this.colorDropdown = document.querySelector('.color-format-dropdown')
    this.dropdownButton = document.querySelector('.dropdown-button')
    this.dropdownMenu = document.querySelector('.dropdown-menu')
    this.dropdownArrow = document.querySelector('.dropdown-arrow')
    this.currentFormatDisplay = document.getElementById('current-format')
    this.colorCodeDisplay = document.getElementById('color-code')
    this.copyColorButton = document.querySelector('.copy-color-button')
    this.letterSpacingElement = document.getElementById('letter-spacing')

    // Track current font data - initialize with empty values
    this.currentFontData = {
      body: {
        family: '',
        style: '',
        weight: '',
        size: '',
        lineHeight: '',
        element: '',
      },
    }

    this.currentColorData = {
      text: '',
    }

    // Track current snippet format
    this.currentSnippetFormat = 'element'

    // Add a current format property
    this.currentColorFormat = 'HEX' // Initial format

    // Add a format indicator element reference
    this.formatIndicator = null

    // Initialize
    this.initialize()
  }

  // Initialize method
  initialize() {
    // Clear all displayed values FIRST before any other operations
    this.clearAllFontValues()

    // Make sure the new UI elements are hidden initially
    if (this.colorCodeDisplay) {
      this.colorCodeDisplay.style.display = 'none'
    }

    if (this.colorDropdown) {
      this.colorDropdown.style.display = 'none'
    }

    if (this.copyColorButton) {
      this.copyColorButton.style.display = 'none'
    }

    // AGGRESSIVE CHECK: Check if current URL matches the URL when the data was collected
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].url) {
        const currentUrl = tabs[0].url

        // Get the URL that was stored with the font data
        const storedData = localStorage.getItem('selectedElementFontData')
        if (storedData) {
          try {
            const parsedData = JSON.parse(storedData)

            // Check if there's a stored URL and if it doesn't match current URL
            if (
              !parsedData._sourceUrl ||
              parsedData._sourceUrl !== currentUrl
            ) {
              localStorage.removeItem('selectedElementFontData')
              if (chrome.storage && chrome.storage.local) {
                chrome.storage.local.remove(['selectedElementFontData'])
              }
            } else if (!parsedData._isFromElementSelection) {
              localStorage.removeItem('selectedElementFontData')
              if (chrome.storage && chrome.storage.local) {
                chrome.storage.local.remove(['selectedElementFontData'])
              }
            } else {
              // console.log
            }
          } catch (e) {
            console.error('Error parsing stored font data:', e)
            // Remove invalid data
            localStorage.removeItem('selectedElementFontData')
          }
        }
      }
    })

    // Set up event listeners
    this.setupEventListeners()

    // Explicitly reset stored data
    this.currentFontData = {
      body: {
        family: '',
        style: '',
        weight: '',
        size: '',
        lineHeight: '',
        element: '',
      },
    }
  }

  clearAllFontValues() {
    // Clear font names
    if (this.bodyFontElement) this.bodyFontElement.textContent = ''

    // Clear font properties
    if (this.fontStyleElement) this.fontStyleElement.textContent = ''
    if (this.fontWeightElement) this.fontWeightElement.textContent = ''
    if (this.fontSizeElement) this.fontSizeElement.textContent = ''
    if (this.lineHeightElement) this.lineHeightElement.textContent = ''

    // Clear CSS snippet
    if (this.cssSnippetElement) this.cssSnippetElement.textContent = ''

    // Disable copy button when no data
    if (this.copySnippetButton) {
      this.copySnippetButton.disabled = !this.cssSnippetElement.textContent
      if (!this.cssSnippetElement.textContent) {
        this.copySnippetButton.classList.add('disabled')
      } else {
        this.copySnippetButton.classList.remove('disabled')
      }
    }

    if (this.letterSpacingElement) this.letterSpacingElement.textContent = ''

    // Clear color swatch
    if (this.textColorSwatch) {
      this.textColorSwatch.style.backgroundColor = ''
      this.textColorSwatch.dataset.color = ''
      this.textColorSwatch.removeAttribute('title') // Add this line
      this.textColorSwatch.style.display = 'none' // Hide when no data
    }

    // Clear and hide color code and dropdown
    if (this.colorCodeDisplay) {
      this.colorCodeDisplay.textContent = ''
      this.colorCodeDisplay.style.display = 'none'
    }

    if (this.colorDropdown) {
      this.colorDropdown.style.display = 'none'
    }

    if (this.copyColorButton) {
      this.copyColorButton.style.display = 'none'
    }

    // Reset current color data
    this.currentColorData = {
      text: '',
    }
  }

  // Add this method right after initialize() method
  setupColorDropdown() {
    // Toggle dropdown menu when button is clicked
    if (this.dropdownButton) {
      this.dropdownButton.addEventListener('click', (e) => {
        e.stopPropagation()
        this.toggleDropdownMenu()
      })
    }

    // Handle format selection
    if (this.dropdownMenu) {
      const items = this.dropdownMenu.querySelectorAll('.dropdown-item')
      items.forEach((item) => {
        item.addEventListener('click', (e) => {
          e.stopPropagation()
          const newFormat = item.getAttribute('data-format')
          this.currentColorFormat = newFormat
          this.currentFormatDisplay.textContent = newFormat

          // Update displayed color
          this.setColorSwatchFormat()

          // Close the dropdown
          this.closeDropdownMenu()
        })
      })
    }

    // Handle copy button click
    if (this.copyColorButton) {
      this.copyColorButton.addEventListener('click', () => {
        const colorValue = this.textColorSwatch.dataset.color
        if (colorValue) {
          this.copyColorToClipboard(colorValue)
        }
      })
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      this.closeDropdownMenu()
    })
  }

  // Add methods for dropdown functionality
  toggleDropdownMenu() {
    const isVisible = this.dropdownMenu.classList.contains('show')

    if (isVisible) {
      this.closeDropdownMenu()
    } else {
      this.openDropdownMenu()
    }
  }

  openDropdownMenu() {
    this.dropdownMenu.classList.add('show')
    this.dropdownArrow.style.transform = 'rotate(180deg)'
  }

  closeDropdownMenu() {
    this.dropdownMenu.classList.remove('show')
    this.dropdownArrow.style.transform = 'rotate(0)'
  }

  // Update setupEventListeners method for the color swatch
  setupEventListeners() {
    // Add copy snippet button event listener
    if (this.copySnippetButton) {
      this.copySnippetButton.addEventListener('click', (e) => {
        const textToCopy = this.cssSnippetElement.textContent
        this.copyToClipboard(textToCopy, e)
      })
    }

    // Snippet format option listeners
    document
      .querySelectorAll('.snippet-format-options .format-option')
      .forEach((option) => {
        option.addEventListener('click', () => {
          document
            .querySelectorAll('.snippet-format-options .format-option')
            .forEach((opt) => {
              opt.classList.remove('active')
            })
          option.classList.add('active')
          this.currentSnippetFormat = option.dataset.format
          this.updateCSSSnippet()

          // Add this new code to adjust the button position
          if (this.copySnippetButton) {
            if (option.dataset.format === 'variable') {
              this.copySnippetButton.style.right = '20px'
            } else {
              this.copySnippetButton.style.right = '20px'
            }
          }
        })
      })

    // Setup the color dropdown
    this.setupColorDropdown()
  }

  // Add color format conversion methods
  rgbToHex(rgb) {
    // Handle empty or invalid rgb values
    if (!rgb || typeof rgb !== 'string') return rgb

    // Check if it's already a hex color
    if (rgb.startsWith('#')) return rgb

    // Extract RGB values
    const rgbMatch = rgb.match(
      /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/
    )
    if (!rgbMatch) return rgb // Return original if not matching RGB format

    const r = parseInt(rgbMatch[1])
    const g = parseInt(rgbMatch[2])
    const b = parseInt(rgbMatch[3])

    // Convert to hex
    return (
      '#' +
      ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
    )
  }

  // Function to convert RGB to HSL
  rgbToHsl(rgb) {
    // Handle empty or invalid rgb values
    if (!rgb || typeof rgb !== 'string') return rgb

    // Extract RGB values
    const rgbMatch = rgb.match(
      /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/
    )
    if (!rgbMatch) return rgb // Return original if not matching RGB format

    let r = parseInt(rgbMatch[1]) / 255
    let g = parseInt(rgbMatch[2]) / 255
    let b = parseInt(rgbMatch[3]) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h,
      s,
      l = (max + min) / 2

    if (max === min) {
      // Achromatic
      h = s = 0
    } else {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0)
          break
        case g:
          h = (b - r) / d + 2
          break
        case b:
          h = (r - g) / d + 4
          break
      }

      h = Math.round(h * 60)
    }

    s = Math.round(s * 100)
    l = Math.round(l * 100)

    return `hsl(${h}, ${s}%, ${l}%)`
  }

  // Modify the copyColorToClipboard method
  copyColorToClipboard(colorText) {
    if (!colorText) return

    navigator.clipboard
      .writeText(colorText)
      .then(() => {
        // Show toast notification
        this.showColorToastNotification(colorText)
      })
      .catch((err) => {
        console.error('Could not copy color: ', err)
      })
  }

  // Replace the existing showColorToastNotification method with this one:
  showColorToastNotification(colorText) {
    try {
      // Get the main content element
      const mainContent = document.querySelector('.main-content')

      if (!mainContent) {
        console.error('Could not find main-content div')
        return
      }

      // Create a fixed position toast container if it doesn't exist
      let toastContainer = document.getElementById('font-toast-container')

      if (!toastContainer) {
        toastContainer = document.createElement('div')
        toastContainer.id = 'font-toast-container'

        // Style the container for fixed positioning
        toastContainer.style.position = 'fixed'
        toastContainer.style.zIndex = '9999'
        toastContainer.style.display = 'flex'
        toastContainer.style.flexDirection = 'column'
        toastContainer.style.alignItems = 'center'
        toastContainer.style.pointerEvents = 'none'

        document.body.appendChild(toastContainer)
      }

      // Position the toast at the bottom center of the main content area
      const updateToastPosition = () => {
        const rect = mainContent.getBoundingClientRect()
        toastContainer.style.bottom = '20px'
        toastContainer.style.left = `${rect.left + rect.width / 2}px`
        toastContainer.style.transform = 'translateX(-50%)'
      }

      // Set initial position
      updateToastPosition()

      // Update position on scroll (horizontal or vertical)
      const scrollHandler = () => {
        updateToastPosition()
      }

      // Add scroll event listener
      window.addEventListener('scroll', scrollHandler, { passive: true })

      // Create toast element
      const toast = document.createElement('div')
      toast.className = 'font-toast'

      // Style the toast element
      toast.style.display = 'flex'
      toast.style.alignItems = 'center'
      toast.style.padding = '8px 12px'
      toast.style.backgroundColor = '#000'
      toast.style.color = 'white'
      toast.style.borderRadius = '4px'
      toast.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)'
      toast.style.pointerEvents = 'auto'
      toast.style.transform = 'translateY(40px)'
      toast.style.opacity = '0'
      toast.style.transition = 'transform 0.3s ease, opacity 0.3s ease'
      toast.style.whiteSpace = 'nowrap'
      toast.style.marginBottom = '10px'

      // Create color preview
      const colorPreview = document.createElement('div')
      colorPreview.className = 'toast-color-preview'

      // Style the color preview
      colorPreview.style.width = '16px'
      colorPreview.style.height = '16px'
      colorPreview.style.minWidth = '16px'
      colorPreview.style.borderRadius = '2px'
      colorPreview.style.marginRight = '10px'
      colorPreview.style.border = '1px solid rgba(255, 255, 255, 0.2)'
      colorPreview.style.flexShrink = '0'
      colorPreview.style.backgroundColor = colorText

      // Create message text
      const message = document.createElement('span')
      message.textContent = `${colorText} gekopieerd`
      message.className = 'toast-message'

      // Style the message
      message.style.fontSize = '13px'
      message.style.whiteSpace = 'nowrap'
      message.style.fontFamily = 'Regola-Regular, sans-serif'

      // Add elements to toast
      toast.appendChild(colorPreview)
      toast.appendChild(message)

      // Add to container
      toastContainer.appendChild(toast)

      // Trigger animation
      setTimeout(() => {
        toast.style.transform = 'translateY(0)'
        toast.style.opacity = '1'
      }, 10)

      // Auto-dismiss after 2 seconds
      setTimeout(() => {
        toast.style.transform = 'translateY(10px)'
        toast.style.opacity = '0'

        setTimeout(() => {
          if (toastContainer && toast && toastContainer.contains(toast)) {
            toastContainer.removeChild(toast)

            // Remove scroll listener
            window.removeEventListener('scroll', scrollHandler)

            // Remove container if empty
            if (toastContainer.children.length === 0) {
              document.body.removeChild(toastContainer)
            }
          }
        }, 300)
      }, 2000)
    } catch (error) {
      console.error('Error showing toast notification:', error)
    }
  }

  copyToClipboard(text, event) {
    // Only proceed if there's text to copy
    if (!text) return

    // Get the button element
    const button = event.target

    // If already in the process of copying, don't do anything
    if (button.dataset.copying === 'true') {
      return
    }

    // Mark as currently copying to prevent multiple clicks
    button.dataset.copying = 'true'
    const originalText = button.textContent

    navigator.clipboard
      .writeText(text)
      .then(() => {
        // Show visual feedback on the button itself
        button.textContent = 'Gekopieerd!'
        button.style.backgroundColor = 'var(--secondary-color)'

        // Reset button after 1.5 seconds
        setTimeout(() => {
          button.textContent = originalText
          button.style.backgroundColor = ''
          // Allow copying again
          button.dataset.copying = 'false'
        }, 1500)
      })
      .catch((err) => {
        console.error('Could not copy text: ', err)
        // Show error notification
        button.textContent = 'Failed to copy'
        button.style.backgroundColor = '#f44336'

        setTimeout(() => {
          button.textContent = originalText
          button.style.backgroundColor = ''
          // Allow copying again
          button.dataset.copying = 'false'
        }, 1500)
      })
  }

  analyzeFonts() {
    this.clearAllFontValues()
    /*     chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'analyzeFonts' },
        (response) => {
          if (response && response.fonts) {
            this.updateFontUI(response.fonts)
            // Store the font data
            this.currentFontData = response.fonts
            // Update the CSS snippet
            this.updateCSSSnippet()
          }
        }
      )
    }) */
  }

  updateFontUI(fontData) {
    // If no font data, clear everything first
    if (!fontData || !fontData.body) {
      this.clearAllFontValues()
      return
    }

    // Update body font
    this.bodyFontElement.textContent = fontData.body.family || ''

    // Update font properties
    this.fontStyleElement.textContent = fontData.body.style || ''
    this.fontWeightElement.textContent = fontData.body.weight || ''
    this.fontSizeElement.textContent = fontData.body.size || ''
    this.lineHeightElement.textContent = fontData.body.lineHeight || ''

    // Update CSS snippet
    this.updateCSSSnippet()
  }

  updateColorUI(colorData) {
    // If no color data or no text color, clear the color swatch
    if (!colorData || !colorData.text) {
      if (this.textColorSwatch) {
        this.textColorSwatch.style.backgroundColor = ''
        this.textColorSwatch.dataset.color = ''
        this.textColorSwatch.style.display = 'none' // Hide the swatch when no data

        // Hide the color code display
        if (this.colorCodeDisplay) {
          this.colorCodeDisplay.textContent = ''
          this.colorCodeDisplay.style.display = 'none'
        }

        // Hide dropdown and copy button
        if (this.colorDropdown) {
          this.colorDropdown.style.display = 'none'
        }

        if (this.copyColorButton) {
          this.copyColorButton.style.display = 'none'
        }
      }
      return
    }

    // Convert to different formats
    const hexColor = this.rgbToHex(colorData.text)
    const rgbColor = colorData.text
    const hslColor = this.rgbToHsl(colorData.text)

    // Update text color swatch
    if (this.textColorSwatch) {
      this.textColorSwatch.style.display = 'block' // Show the swatch
      this.textColorSwatch.style.backgroundColor = colorData.text // Keep original for display

      // Store all formats
      this.textColorSwatch.dataset.hexColor = hexColor
      this.textColorSwatch.dataset.rgbColor = rgbColor
      this.textColorSwatch.dataset.hslColor = hslColor
    }

    // Show dropdown and copy button
    if (this.colorDropdown) {
      this.colorDropdown.style.display = 'block'
    }

    if (this.copyColorButton) {
      this.copyColorButton.style.display = 'flex'
    }

    // Make sure color code is visible
    if (this.colorCodeDisplay) {
      this.colorCodeDisplay.style.display = 'block'
    }

    // Store the color data with all formats
    this.currentColorData = {
      hex: hexColor,
      rgb: rgbColor,
      hsl: hslColor,
    }

    // Apply the current format
    this.setColorSwatchFormat()
  }

  // Update the setColorSwatchFormat method:
  setColorSwatchFormat() {
    if (!this.textColorSwatch) return

    // Get color values, with fallbacks to prevent undefined
    const hexColor =
      this.textColorSwatch.dataset.hexColor || this.currentColorData.hex || ''
    const rgbColor =
      this.textColorSwatch.dataset.rgbColor || this.currentColorData.rgb || ''
    const hslColor =
      this.textColorSwatch.dataset.hslColor || this.currentColorData.hsl || ''

    // Update dropdown display
    if (this.currentFormatDisplay) {
      this.currentFormatDisplay.textContent = this.currentColorFormat
    }

    // Get the appropriate color value
    let colorValue = ''
    switch (this.currentColorFormat) {
      case 'HEX':
        colorValue = hexColor
        break
      case 'RGB':
        colorValue = rgbColor
        break
      case 'HSL':
        colorValue = hslColor
        break
    }

    // Update color code display
    if (this.colorCodeDisplay) {
      this.colorCodeDisplay.textContent = colorValue
      this.colorCodeDisplay.style.display = colorValue ? 'block' : 'none'
    }

    // Update dataset color and REMOVE the title attribute
    this.textColorSwatch.dataset.color = colorValue
    this.textColorSwatch.removeAttribute('title') // Add this line to explicitly remove the title
  }

  showFormatChangeNotification(format) {
    try {
      // Find the parent container of the color swatch
      const parentContainer = this.textColorSwatch.parentElement
      if (!parentContainer) return

      // Check if notification area exists, create if not
      let notificationArea = document.getElementById('format-notification-area')
      if (!notificationArea) {
        notificationArea = document.createElement('div')
        notificationArea.id = 'format-notification-area'
        notificationArea.style.height = '20px' // Fixed height to prevent layout shifts
        notificationArea.style.fontSize = '12px'
        notificationArea.style.marginTop = '4px'
        notificationArea.style.textAlign = 'right'
        notificationArea.style.color = 'var(--body)'

        // Insert after the parent container
        parentContainer.parentNode.insertBefore(
          notificationArea,
          parentContainer.nextSibling
        )
      }

      // Create notification content
      const notification = document.createElement('div')
      notification.className = 'format-change-notification'
      notification.style.display = 'flex'
      notification.style.alignItems = 'center'
      notification.style.justifyContent = 'flex-end'
      notification.style.opacity = '0'
      notification.style.transition = 'opacity 0.3s ease'

      // Create dot indicator with primary color
      const dot = document.createElement('div')
      dot.style.width = '6px'
      dot.style.height = '6px'
      dot.style.borderRadius = '50%'
      dot.style.backgroundColor = 'var(--primary-color)' // Use your primary color variable
      dot.style.marginRight = '5px'

      // Create text
      const text = document.createElement('span')
      text.textContent = `${format} format`

      // Assemble notification
      notification.appendChild(dot)
      notification.appendChild(text)

      // Clear previous notification and add new one
      notificationArea.innerHTML = ''
      notificationArea.appendChild(notification)

      // Trigger animation
      setTimeout(() => {
        notification.style.opacity = '1'
      }, 10)

      // Remove notification after delay
      setTimeout(() => {
        notification.style.opacity = '0'

        // Remove element after fade out
        setTimeout(() => {
          if (notificationArea.contains(notification)) {
            notificationArea.removeChild(notification)
          }
        }, 300)
      }, 2000)
    } catch (error) {
      console.error('Error showing format change notification:', error)
    }
  }

  // Add this method
  clearColorValues() {
    // In the clearAllFontValues method, update the color swatch part to:
    if (this.textColorSwatch) {
      this.textColorSwatch.style.backgroundColor = ''
      this.textColorSwatch.dataset.color = ''
      this.textColorSwatch.style.display = 'none' // Hide by default
    }
  }

  // Helper method for formatting line-height
  formatLineHeight(lineHeight) {
    if (!lineHeight) return ''

    if (lineHeight.includes('.')) {
      const match = lineHeight.match(/(\d+)\.(\d+)/)
      if (match) {
        const integer = parseInt(match[1], 10)
        const decimal = parseInt(match[2].charAt(0), 10) // Get first decimal digit

        // Round up if decimal is 0.9 or higher
        if (decimal >= 5) {
          return integer + 1 + 'px'
        } else {
          return integer + 'px'
        }
      }
    }

    // If no decimal or cannot parse, just return the numeric part with px
    const numericMatch = lineHeight.match(/\d+/)
    return numericMatch ? numericMatch[0] + 'px' : lineHeight
  }

  // Update the updateSelectedElementFontData method to also handle color data
  updateSelectedElementFontData(fontData, colorData) {
    // If no font data passed, clear everything and return
    if (!fontData || !fontData.family) {
      this.clearAllFontValues()
      return
    }

    // Mark this as coming from element selection
    fontData._isFromElementSelection = true

    // Store the selected element's font data
    if (!this.currentFontData) {
      this.currentFontData = {
        body: {},
      }
    }

    // Update the body font data with the selected element's data
    this.currentFontData.body = {
      ...this.currentFontData.body,
      ...fontData,
    }

    // Format line height
    let lineHeight = fontData.lineHeight || ''
    if (lineHeight && lineHeight.includes('.')) {
      const match = lineHeight.match(/(\d+)\.(\d+)/)
      if (match) {
        const integer = parseInt(match[1], 10)
        const decimal = parseInt(match[2].charAt(0), 10)

        // Round up if decimal is 0.9 or higher
        if (decimal >= 5) {
          lineHeight = integer + 1 + 'px'
        } else {
          lineHeight = integer + 'px'
        }
      }
    }

    // Add this with the other property updates
    if (this.letterSpacingElement) {
      this.letterSpacingElement.textContent = fontData.letterSpacing || ''
    }

    // Update body font name
    if (this.bodyFontElement) {
      this.bodyFontElement.textContent = fontData.family || ''
    }

    // Update font properties for selected element
    if (this.fontStyleElement) {
      this.fontStyleElement.textContent = fontData.style || ''
    }
    if (this.fontWeightElement) {
      this.fontWeightElement.textContent = fontData.weight || ''
    }
    if (this.fontSizeElement) {
      this.fontSizeElement.textContent = fontData.size || ''
    }
    if (this.lineHeightElement) {
      this.lineHeightElement.textContent = lineHeight || ''
    }

    // Update CSS snippet
    this.updateCSSSnippet()

    // Update color data if provided
    if (colorData && colorData.text) {
      this.updateColorUI(colorData)
    } else {
      // Clear color data if not provided
      this.updateColorUI(null)
    }
  }

  // Update CSS snippet method
  updateCSSSnippet() {
    if (!this.cssSnippetElement) return

    const fontData = this.currentFontData.body

    // If no font family, display empty snippet and disable copy button
    if (!fontData || !fontData.family) {
      this.cssSnippetElement.textContent = ''

      // Disable the copy button
      if (this.copySnippetButton) {
        this.copySnippetButton.disabled = true
        this.copySnippetButton.classList.add('disabled')
      }

      return
    }

    // Enable the copy button
    if (this.copySnippetButton) {
      this.copySnippetButton.disabled = false
      this.copySnippetButton.classList.remove('disabled')
    }

    let cssSnippet = ''

    // Format line height
    let lineHeight = fontData.lineHeight || ''
    if (lineHeight && lineHeight.includes('.')) {
      const match = lineHeight.match(/(\d+)\.(\d+)/)
      if (match) {
        const integer = parseInt(match[1], 10)
        const decimal = parseInt(match[2].charAt(0), 10) // Get first decimal digit

        // Round up if decimal is 0.9 or higher
        if (decimal >= 5) {
          lineHeight = integer + 1 + 'px'
        } else {
          lineHeight = integer + 'px'
        }
      }
    }

    // Generate CSS snippet based on the current format option
    switch (this.currentSnippetFormat) {
      case 'element':
        // Element-specific selector
        const element = fontData.element || 'p'
        cssSnippet = `${element} {\n  font-family: "${
          fontData.family
        }", sans-serif;\n  font-size: ${fontData.size};\n  font-weight: ${
          fontData.weight
        };\n  font-style: ${
          fontData.style
        };\n  line-height: ${lineHeight};\n} letter-spacing: ${
          fontData.letterSpacing || '0px'
        };`
        break

      case 'class':
        // Class-based selector
        cssSnippet = `.font-style {\n  font-family: "${
          fontData.family
        }", sans-serif;\n  font-size: ${fontData.size};\n  font-weight: ${
          fontData.weight
        };\n  font-style: ${
          fontData.style
        };\n  line-height: ${lineHeight};\n} letter-spacing: ${
          fontData.letterSpacing || '0px'
        }; `
        break

      case 'variable':
        // CSS variables
        cssSnippet = `:root {\n  --font-family: "${
          fontData.family
        }", sans-serif;\n  --font-size: ${fontData.size};\n  --font-weight: ${
          fontData.weight
        };\n  --font-style: ${
          fontData.style
        };\n  --line-height: ${lineHeight};\n  --letter-spacing: ${
          fontData.letterSpacing || '0px'
        };}\n\n/* Usage example */\nbody {\n  font-family: var(--font-family);\n  font-size: var(--font-size);\n  font-weight: var(--font-weight);\n  font-style: var(--font-style);\n  line-height: var(--line-height);\n  letter-spacing: var(--letter-spacing);}`
        break
    }

    // Update the snippet element
    this.cssSnippetElement.textContent = cssSnippet
  }
}

// Export the FontTab class
window.FontTab = FontTab

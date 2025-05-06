// Font tab specific functionality
class FontTab {
  constructor() {
    // Font elements
    this.bodyFontElement = document.getElementById('body-font')
    this.fontStyleElement = document.getElementById('font-style')
    this.fontWeightElement = document.getElementById('font-weight')
    this.fontSizeElement = document.getElementById('font-size')
    this.lineHeightElement = document.getElementById('line-height')
    this.fontPreviewElement = document.getElementById('font-preview')
    this.cssSnippetElement = document.getElementById('css-snippet')
    this.copySnippetButton = document.getElementById('copy-snippet-btn')
    this.textColorSwatch = document.getElementById('text-color-swatch')

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
  // In the font.js file, modify the initialize method
  initialize() {
    console.log('FontTab: Initializing and clearing all values')

    // Clear all displayed values FIRST before any other operations
    this.clearAllFontValues()

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
              console.log('Font data is from a different URL, clearing it')
              localStorage.removeItem('selectedElementFontData')
              if (chrome.storage && chrome.storage.local) {
                chrome.storage.local.remove(['selectedElementFontData'])
              }
            } else if (!parsedData._isFromElementSelection) {
              console.log(
                'FontTab: Found data without element selection flag - removing it'
              )
              localStorage.removeItem('selectedElementFontData')
              if (chrome.storage && chrome.storage.local) {
                chrome.storage.local.remove(['selectedElementFontData'])
              }
            } else {
              console.log(
                'FontTab: Found valid element selection data, will use it'
              )
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

    // Add check mark animation styles
    const style = document.createElement('style')
    style.textContent = `
    .check-mark-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: rgba(0, 0, 0, 0.3);
      border-radius: 4px;
      animation: fadeIn 0.2s ease-in-out;
    }
    
    .check-icon {
      stroke: white;
      animation: scaleIn 0.3s ease-out;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes scaleIn {
      from { transform: scale(0); }
      to { transform: scale(1); }
    }
  `
    document.head.appendChild(style)
  }

  // Clear all font values method
  clearAllFontValues() {
    console.log('Clearing all font values')
    // Clear font names
    if (this.bodyFontElement) this.bodyFontElement.textContent = ''
    console.log('Cleared body font element')

    // Clear font properties
    if (this.fontStyleElement) this.fontStyleElement.textContent = ''
    if (this.fontWeightElement) this.fontWeightElement.textContent = ''
    if (this.fontSizeElement) this.fontSizeElement.textContent = ''
    if (this.lineHeightElement) this.lineHeightElement.textContent = ''
    console.log('Cleared font style element')

    // Clear font preview - important to empty the text, not just styles
    if (this.fontPreviewElement) {
      this.fontPreviewElement.textContent = ''
      this.fontPreviewElement.style.fontFamily = ''
      this.fontPreviewElement.style.fontSize = ''
      this.fontPreviewElement.style.fontStyle = ''
      this.fontPreviewElement.style.fontWeight = 'normal'
      this.fontPreviewElement.style.lineHeight = ''
    }
    console.log('Cleared font preview')

    // Clear CSS snippet
    if (this.cssSnippetElement) this.cssSnippetElement.textContent = ''
    console.log('Cleared CSS snippet')

    // Clear color swatch
    if (this.textColorSwatch) {
      this.textColorSwatch.style.backgroundColor = ''
      this.textColorSwatch.title = 'Tekstkleur'
      this.textColorSwatch.dataset.color = ''
    }
    console.log('Cleared color swatch')

    // Reset current color data
    this.currentColorData = {
      text: '',
    }
  }

  // Update setupEventListeners method for the color swatch
  setupEventListeners() {
    // Add event listener for copy snippet button
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
              this.copySnippetButton.style.right = '5px'
            }
          }
        })
      })

    // Update this for the color swatch click event
    if (this.textColorSwatch) {
      this.textColorSwatch.addEventListener('click', (e) => {
        // If Shift key is pressed, cycle through formats
        if (e.shiftKey) {
          this.cycleColorFormat()
          return
        }

        // Otherwise, copy the current format
        const colorValue = this.textColorSwatch.dataset.color
        if (colorValue) {
          this.copyColorToClipboard(colorValue)
        }
      })

      // Add double click to cycle formats
      this.textColorSwatch.addEventListener('dblclick', () => {
        this.cycleColorFormat()
      })
    }
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

        // Show check mark animation on the color swatch
        this.showCheckMarkAnimation(this.textColorSwatch)
      })
      .catch((err) => {
        console.error('Could not copy color: ', err)
      })
  }

  // Add this method to the FontTab class
  showCheckMarkAnimation(element) {
    // Find the color box inside the element
    const colorBox = element || this.textColorSwatch
    if (!colorBox) return

    // Create check mark overlay
    const checkMarkOverlay = document.createElement('div')
    checkMarkOverlay.className = 'check-mark-overlay'

    // Create SVG check mark icon
    const checkSvg = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    )
    checkSvg.setAttribute('viewBox', '0 0 24 24')
    checkSvg.setAttribute('width', '12')
    checkSvg.setAttribute('height', '12')
    checkSvg.setAttribute('stroke', 'currentColor')
    checkSvg.setAttribute('stroke-width', '3')
    checkSvg.setAttribute('stroke-linecap', 'round')
    checkSvg.setAttribute('stroke-linejoin', 'round')
    checkSvg.setAttribute('fill', 'none')
    checkSvg.classList.add('check-icon')

    // Create check mark path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', 'M20 6L9 17l-5-5')
    checkSvg.appendChild(path)

    // Add check mark to overlay
    checkMarkOverlay.appendChild(checkSvg)

    // Add the overlay to the color box
    colorBox.style.position = 'relative'
    colorBox.appendChild(checkMarkOverlay)

    // Remove after animation completes
    setTimeout(() => {
      try {
        if (colorBox.contains(checkMarkOverlay)) {
          colorBox.removeChild(checkMarkOverlay)
        }
      } catch (e) {
        console.error('Error removing check mark overlay:', e)
      }
    }, 1500)
  }

  // Update the showColorToastNotification method
  showColorToastNotification(colorText) {
    try {
      // Get the main content element
      const mainContent = document.querySelector('.main-content')

      if (!mainContent) {
        console.error('Could not find main-content div')
        return
      }

      // Create a toast container if it doesn't exist
      let toastContainer = document.getElementById('font-toast-container')

      if (!toastContainer) {
        toastContainer = document.createElement('div')
        toastContainer.id = 'font-toast-container'
        document.body.appendChild(toastContainer)
      }

      // Create toast element
      const toast = document.createElement('div')
      toast.className = 'font-toast'

      // Create color preview
      const colorPreview = document.createElement('div')
      colorPreview.className = 'toast-color-preview'
      colorPreview.style.backgroundColor = colorText

      // Create message text with format info
      const message = document.createElement('span')
      message.className = 'toast-message'

      // Add the format type to the message
      if (colorText.startsWith('#')) {
        message.textContent = `${colorText} gekopieerd`
      } else if (colorText.startsWith('rgb')) {
        message.textContent = `${colorText} gekopieerd`
      } else if (colorText.startsWith('hsl')) {
        message.textContent = `${colorText} gekopieerd`
      } else {
        message.textContent = `${colorText} gekopieerd`
      }

      // Add elements to toast
      toast.appendChild(colorPreview)
      toast.appendChild(message)

      // Add to container
      toastContainer.appendChild(toast)

      // Trigger animation
      setTimeout(() => {
        toast.classList.add('toast-visible')
      }, 10)

      // Auto-dismiss after 2 seconds
      setTimeout(() => {
        toast.classList.add('toast-hiding')
        toast.classList.remove('toast-visible')

        setTimeout(() => {
          if (toastContainer && toast && toastContainer.contains(toast)) {
            toastContainer.removeChild(toast)

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

    // Update font preview
    this.updateFontPreview(fontData.body)

    // Update CSS snippet
    this.updateCSSSnippet()
  }

  // Modify the updateColorUI method
  updateColorUI(colorData) {
    // If no color data or no text color, clear the color swatch
    if (!colorData || !colorData.text) {
      if (this.textColorSwatch) {
        this.textColorSwatch.style.backgroundColor = ''
        this.textColorSwatch.title = 'Tekstkleur'
        this.textColorSwatch.dataset.color = ''
        this.textColorSwatch.style.display = 'none' // Hide the swatch when no data

        // Hide format indicator if it exists
        this.hideFormatIndicator()
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

      // Set title based on current format
      this.setColorSwatchFormat()
    }

    // Store the color data with all formats
    this.currentColorData = {
      hex: hexColor,
      rgb: rgbColor,
      hsl: hslColor,
    }

    // Create or update format indicator
    this.updateFormatIndicator()
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

    switch (this.currentColorFormat) {
      case 'HEX':
        this.textColorSwatch.dataset.color = hexColor
        this.textColorSwatch.title = hexColor
          ? `${hexColor} (klik om te kopiëren)`
          : 'Tekstkleur'
        break
      case 'RGB':
        this.textColorSwatch.dataset.color = rgbColor
        this.textColorSwatch.title = rgbColor
          ? `${rgbColor} (klik om te kopiëren)`
          : 'Tekstkleur'
        break
      case 'HSL':
        this.textColorSwatch.dataset.color = hslColor
        this.textColorSwatch.title = hslColor
          ? `${hslColor} (klik om te kopiëren)`
          : 'Tekstkleur'
        break
    }
  }

  // Add method to cycle through formats
  cycleColorFormat() {
    // Cycle through formats: HEX -> RGB -> HSL -> HEX
    switch (this.currentColorFormat) {
      case 'HEX':
        this.currentColorFormat = 'RGB'
        break
      case 'RGB':
        this.currentColorFormat = 'HSL'
        break
      case 'HSL':
        this.currentColorFormat = 'HEX'
        break
      default:
        this.currentColorFormat = 'HEX'
    }

    // Update color swatch
    this.setColorSwatchFormat()

    // Update format indicator
    this.updateFormatIndicator()
  }

  // Create or update format indicator
  updateFormatIndicator() {
    if (!this.textColorSwatch || !this.currentColorData) return

    // Find parent container (usually font-card-header)
    const parentContainer = this.textColorSwatch.parentElement
    if (!parentContainer) return

    // Create indicator if it doesn't exist
    if (!this.formatIndicator) {
      this.formatIndicator = document.createElement('span')
      this.formatIndicator.className = 'format-indicator'
      this.formatIndicator.style.fontSize = '12px'
      this.formatIndicator.style.marginRight = '4px'
      this.formatIndicator.style.color = 'var(--body)'
      this.formatIndicator.style.cursor = 'pointer'
      this.formatIndicator.style.padding = '3px'
      this.formatIndicator.style.borderRadius = '4px'
      this.formatIndicator.style.backgroundColor = 'var(--header-bg)'
      this.formatIndicator.title = 'Klik om formaat te wisselen'

      // Add event listener to cycle format when clicked
      this.formatIndicator.addEventListener('click', () => {
        this.cycleColorFormat()
      })

      // Insert before the color swatch
      parentContainer.insertBefore(this.formatIndicator, this.textColorSwatch)
    }

    // In the updateFormatIndicator method, add these lines:
    this.formatIndicator.style.transition =
      'transform 0.2s ease, background-color 0.2s ease'

    this.formatIndicator.addEventListener('mouseenter', () => {
      this.formatIndicator.style.backgroundColor = 'var(--header-bg)'
      this.formatIndicator.style.transform = 'scale(1.2)'
    })

    this.formatIndicator.addEventListener('mouseleave', () => {
      this.formatIndicator.style.backgroundColor = 'var(--header-bg)'
      this.formatIndicator.style.transform = 'scale(1)'
    })

    // Update indicator text
    this.formatIndicator.textContent = this.currentColorFormat

    // Show the indicator
    this.formatIndicator.style.display = 'inline-block'
  }

  // Hide format indicator
  hideFormatIndicator() {
    if (this.formatIndicator) {
      this.formatIndicator.style.display = 'none'
    }
  }

  // Add this method after clearAllFontValues
  clearColorValues() {
    console.log('Clearing color values')

    // In the clearAllFontValues method, update the color swatch part to:
    if (this.textColorSwatch) {
      this.textColorSwatch.style.backgroundColor = ''
      this.textColorSwatch.title = 'Tekstkleur'
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

  updateFontPreview(fontData) {
    if (!fontData || !fontData.family) {
      // If no font data, clear the preview
      this.fontPreviewElement.textContent = ''
      this.fontPreviewElement.style.fontFamily = ''
      this.fontPreviewElement.style.fontSize = ''
      this.fontPreviewElement.style.fontStyle = ''
      this.fontPreviewElement.style.fontWeight = ''
      this.fontPreviewElement.style.lineHeight = ''
      return
    }

    // If we have font data, set the preview text and styles
    this.fontPreviewElement.textContent =
      'AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz'
    this.fontPreviewElement.style.fontFamily = fontData.family || ''
    this.fontPreviewElement.style.fontSize = fontData.size || ''
    this.fontPreviewElement.style.fontStyle = fontData.style || ''
    this.fontPreviewElement.style.fontWeight = 'normal'
    this.fontPreviewElement.style.lineHeight = fontData.lineHeight || ''
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

    // Update font preview
    this.updateFontPreview(fontData)

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

    // If no font family, display empty snippet
    if (!fontData || !fontData.family) {
      this.cssSnippetElement.textContent = ''
      return
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
        cssSnippet = `${element} {\n  font-family: "${fontData.family}", sans-serif;\n  font-size: ${fontData.size};\n  font-weight: ${fontData.weight};\n  font-style: ${fontData.style};\n  line-height: ${lineHeight};\n}`
        break

      case 'class':
        // Class-based selector
        cssSnippet = `.font-style {\n  font-family: "${fontData.family}", sans-serif;\n  font-size: ${fontData.size};\n  font-weight: ${fontData.weight};\n  font-style: ${fontData.style};\n  line-height: ${lineHeight};\n}`
        break

      case 'variable':
        // CSS variables
        cssSnippet = `:root {\n  --font-family: "${fontData.family}", sans-serif;\n  --font-size: ${fontData.size};\n  --font-weight: ${fontData.weight};\n  --font-style: ${fontData.style};\n  --line-height: ${lineHeight};\n}\n\n/* Usage example */\nbody {\n  font-family: var(--font-family);\n  font-size: var(--font-size);\n  font-weight: var(--font-weight);\n  font-style: var(--font-style);\n  line-height: var(--line-height);\n}`
        break
    }

    // Update the snippet element
    this.cssSnippetElement.textContent = cssSnippet
  }
}

// Export the FontTab class
window.FontTab = FontTab

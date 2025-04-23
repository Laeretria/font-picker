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

    // Track current snippet format
    this.currentSnippetFormat = 'element'

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

    // Add copy buttons with empty values
    this.addCopyButtons()

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

    // Reset copy buttons' data attributes
    const bodyCopyBtn = document.querySelector('.copy-body-font')
    if (bodyCopyBtn) bodyCopyBtn.dataset.copy = ''
  }

  setupEventListeners() {
    // Add event listeners for copy buttons and other interactions
    document.querySelectorAll('.copy-font-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const textToCopy = e.target.dataset.copy
        this.copyToClipboard(textToCopy, e)
      })
    })

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
        })
      })
  }

  addCopyButtons() {
    // Update the data-copy attribute values
    const bodyCopyBtn = document.querySelector('.copy-body-font')
    if (bodyCopyBtn) {
      bodyCopyBtn.dataset.copy = this.bodyFontElement.textContent || ''
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
            // Update copy buttons after fonts are loaded
            this.addCopyButtons()
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

    // Update copy buttons
    const bodyCopyBtn = document.querySelector('.copy-body-font')
    if (bodyCopyBtn) {
      bodyCopyBtn.dataset.copy = fontData.body.family || ''
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

  // Update selected element font data method
  updateSelectedElementFontData(fontData) {
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

    // Update copy buttons
    this.addCopyButtons()
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

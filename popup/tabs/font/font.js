// Font tab specific functionality
class FontTab {
  constructor() {
    // Font elements
    this.headingFontElement = document.getElementById('heading-font')
    this.bodyFontElement = document.getElementById('body-font')
    this.fontStyleElement = document.getElementById('font-style')
    this.fontWeightElement = document.getElementById('font-weight')
    this.fontSizeElement = document.getElementById('font-size')
    this.lineHeightElement = document.getElementById('line-height')
    this.fontPreviewElement = document.getElementById('font-preview')
    this.cssSnippetElement = document.getElementById('css-snippet')
    this.copySnippetButton = document.getElementById('copy-snippet-btn')

    // Track current font data
    this.currentFontData = {
      heading: { family: 'Unknown' },
      body: {
        family: 'Unknown',
        style: 'normal',
        weight: '400',
        size: '16px',
        lineHeight: '24px',
        element: 'p',
      },
    }

    // Track current snippet format
    this.currentSnippetFormat = 'element'

    // Initialize
    this.initialize()
  }

  initialize() {
    // Set up event listeners
    this.setupEventListeners()

    // Initial analysis
    this.analyzeFonts()

    // Add copy buttons (after fonts have been analyzed)
    this.addCopyButtons()
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
    const headingCopyBtn = document.querySelector('.copy-heading-font')
    if (headingCopyBtn) {
      headingCopyBtn.dataset.copy = this.headingFontElement.textContent || ''
    }

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
        button.textContent = 'Copied!'
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
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
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
    })
  }

  updateFontUI(fontData) {
    // Update heading font
    this.headingFontElement.textContent = fontData.heading.family || 'Unknown'

    // Update body font
    this.bodyFontElement.textContent = fontData.body.family || 'Unknown'

    // Update font properties
    this.fontStyleElement.textContent = fontData.body.style || 'normal'
    this.fontWeightElement.textContent = fontData.body.weight || '400'
    this.fontSizeElement.textContent = fontData.body.size || '16px'
    this.lineHeightElement.textContent = fontData.body.lineHeight
      ? fontData.body.lineHeight.includes('.')
        ? fontData.body.lineHeight.replace(/(\d+)\.(\d+).*/, '$1px')
        : fontData.body.lineHeight.match(/\d+/)
        ? fontData.body.lineHeight.match(/\d+/)[0] + 'px'
        : fontData.body.lineHeight
      : '24px'

    // Update font preview
    this.updateFontPreview(fontData.body)

    // Update copy buttons
    const headingCopyBtn = document.querySelector('.copy-heading-font')
    if (headingCopyBtn) {
      headingCopyBtn.dataset.copy = fontData.heading.family || ''
    }

    const bodyCopyBtn = document.querySelector('.copy-body-font')
    if (bodyCopyBtn) {
      bodyCopyBtn.dataset.copy = fontData.body.family || ''
    }
  }

  updateFontPreview(fontData) {
    this.fontPreviewElement.style.fontFamily = fontData.family || 'sans-serif'
    this.fontPreviewElement.style.fontSize = fontData.size || '16px'
    this.fontPreviewElement.style.fontStyle = fontData.style || 'normal'
    this.fontPreviewElement.style.lineHeight = fontData.lineHeight || '24px'
  }

  updateSelectedElementFontData(fontData) {
    // Store the selected element's font data
    if (!this.currentFontData) {
      this.currentFontData = {
        heading: { family: 'Unknown' },
        body: {},
      }
    }

    // Update the body font data with the selected element's data
    this.currentFontData.body = {
      ...this.currentFontData.body,
      ...fontData,
    }

    // Update font properties for selected element
    this.fontStyleElement.textContent = fontData.style || 'normal'
    this.fontWeightElement.textContent = fontData.weight || '400'
    this.fontSizeElement.textContent = fontData.size || '16px'
    this.lineHeightElement.textContent = fontData.lineHeight
      ? fontData.lineHeight.includes('.')
        ? fontData.lineHeight.replace(/(\d+)\.(\d+).*/, '$1px')
        : fontData.lineHeight.match(/\d+/)
        ? fontData.lineHeight.match(/\d+/)[0] + 'px'
        : fontData.lineHeight
      : '24px'

    // Update font preview
    this.updateFontPreview(fontData)

    // Update CSS snippet
    this.updateCSSSnippet()
  }

  updateCSSSnippet() {
    if (!this.cssSnippetElement) return

    const fontData = this.currentFontData.body
    let cssSnippet = ''

    // Generate CSS snippet based on the current format option
    switch (this.currentSnippetFormat) {
      case 'element':
        // Element-specific selector
        const element = fontData.element || 'p'
        cssSnippet = `${element} {\n  font-family: "${fontData.family}", sans-serif;\n  font-size: ${fontData.size};\n  font-weight: ${fontData.weight};\n  font-style: ${fontData.style};\n  line-height: ${fontData.lineHeight};\n}`
        break

      case 'class':
        // Class-based selector
        cssSnippet = `.font-style {\n  font-family: "${fontData.family}", sans-serif;\n  font-size: ${fontData.size};\n  font-weight: ${fontData.weight};\n  font-style: ${fontData.style};\n  line-height: ${fontData.lineHeight};\n}`
        break

      case 'variable':
        // CSS variables
        cssSnippet = `:root {\n  --font-family: "${fontData.family}", sans-serif;\n  --font-size: ${fontData.size};\n  --font-weight: ${fontData.weight};\n  --font-style: ${fontData.style};\n  --line-height: ${fontData.lineHeight};\n}\n\n/* Usage example */\nbody {\n  font-family: var(--font-family);\n  font-size: var(--font-size);\n  font-weight: var(--font-weight);\n  font-style: var(--font-style);\n  line-height: var(--line-height);\n}`
        break
    }

    // Update the snippet element
    this.cssSnippetElement.textContent = cssSnippet
  }
}

// Export the FontTab class
window.FontTab = FontTab

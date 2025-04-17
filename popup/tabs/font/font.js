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

    // Format toggle buttons
    document.querySelectorAll('.format-option').forEach((option) => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.format-option').forEach((opt) => {
          opt.classList.remove('active')
        })
        option.classList.add('active')
        // Potentially change the format display here
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
    this.lineHeightElement.textContent = fontData.body.lineHeight || '24px'

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
    this.fontPreviewElement.style.fontWeight = fontData.weight || '400'
    this.fontPreviewElement.style.fontStyle = fontData.style || 'normal'
    this.fontPreviewElement.style.lineHeight = fontData.lineHeight || '24px'
  }

  updateSelectedElementFontData(fontData) {
    // Update font properties for selected element
    this.fontStyleElement.textContent = fontData.style || 'normal'
    this.fontWeightElement.textContent = fontData.weight || '400'
    this.fontSizeElement.textContent = fontData.size || '16px'
    this.lineHeightElement.textContent = fontData.lineHeight || '24px'

    // Update font preview
    this.updateFontPreview(fontData)
  }
}

// Export the FontTab class
window.FontTab = FontTab

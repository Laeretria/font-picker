// Overview tab specific functionality
class OverviewTab {
  constructor() {
    // Main container for all heading elements
    this.headingsContainer = document.getElementById('headings-container')

    // Initialize
    this.initialize()
  }

  initialize() {
    // Immediately analyze the current page for headings
    this.analyzeCurrentPageHeadings()

    // Set up event listener for tab changes or page refreshes
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete') {
        // Refresh headings data when the page is loaded
        this.analyzeCurrentPageHeadings()
      }
    })
  }

  analyzeCurrentPageHeadings() {
    // Clear existing headings and show loading state
    if (this.headingsContainer) {
      this.headingsContainer.innerHTML =
        '<div class="loading-message">Koppen laden...</div>'
    }

    // Query active tab and analyze headings directly
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        // Ensure content script is injected
        this.ensureContentScriptLoaded(tabs[0].id, () => {
          // Request headings analysis from content script
          chrome.tabs.sendMessage(
            tabs[0].id,
            { action: 'analyzeHeadings' },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error(
                  'Error analyzing headings:',
                  chrome.runtime.lastError
                )
                this.showNoHeadingsMessage(
                  'Kon geen koppen laden. Probeer de pagina te vernieuwen.'
                )
                return
              }

              if (
                response &&
                response.headings &&
                response.headings.length > 0
              ) {
                // Clear container before adding new headings
                this.headingsContainer.innerHTML = ''

                // Process unique heading levels - take only first of each type
                const uniqueHeadings = this.getUniqueHeadingLevels(
                  response.headings
                )

                if (uniqueHeadings.length > 0) {
                  // Add each unique heading level to the overview
                  uniqueHeadings.forEach((heading) => {
                    this.addHeadingElement(heading)
                  })
                } else {
                  this.showNoHeadingsMessage(
                    'Geen koppen gevonden op deze pagina.'
                  )
                }
              } else {
                // Show message if no headings found
                this.showNoHeadingsMessage(
                  'Geen koppen gevonden op deze pagina.'
                )
              }
            }
          )
        })
      } else {
        this.showNoHeadingsMessage('Kon geen actief tabblad vinden.')
      }
    })
  }

  // Get one example of each heading level
  getUniqueHeadingLevels(headings) {
    // Create a map to store one heading per level (h1-h6)
    const headingMap = new Map()

    // Process all headings, keeping only the first of each level
    headings.forEach((heading) => {
      const level = heading.element.toLowerCase() // e.g., 'h1', 'h2', etc.

      // Only store the first instance of each heading level
      if (!headingMap.has(level)) {
        headingMap.set(level, heading)
      }
    })

    // Convert map values to array and sort by heading level
    return Array.from(headingMap.values()).sort((a, b) => {
      // Extract the number from h1, h2, etc.
      const levelA = parseInt(a.element.substring(1))
      const levelB = parseInt(b.element.substring(1))

      // Sort in ascending order (h1, h2, h3...)
      return levelA - levelB
    })
  }

  ensureContentScriptLoaded(tabId, callback) {
    // Try to ping the content script first
    chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        // Content script not loaded, ask background to inject it
        chrome.runtime.sendMessage(
          { action: 'checkContentScriptStatus' },
          (statusResponse) => {
            if (statusResponse && statusResponse.contentScriptRunning) {
              callback()
            } else {
              this.showNoHeadingsMessage(
                'Kon content script niet laden. Probeer het opnieuw.'
              )
            }
          }
        )
      } else {
        // Content script is already loaded
        callback()
      }
    })
  }

  showNoHeadingsMessage(message) {
    if (this.headingsContainer) {
      this.headingsContainer.innerHTML = `
        <div class="no-headings-message">
          ${message}
        </div>
      `
    }
  }

  addHeadingElement(headingData) {
    if (!this.headingsContainer) return

    // Create new heading card
    const headingCard = document.createElement('div')
    headingCard.className = 'font-card heading-card'
    headingCard.dataset.level = headingData.element.toLowerCase() // Add data attribute for level-specific styling

    // Create card header
    const cardHeader = document.createElement('div')
    cardHeader.className = 'font-card-header'

    // Add header icon
    cardHeader.innerHTML = `
      <svg fill="#1448ff" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke="#1448ff" stroke-width="0.8879999999999999">
        <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
        <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
        <g id="SVGRepo_iconCarrier">
          <path fill-rule="evenodd" d="M11,9 L9,9 L9,10 L7,10 L7,7 L17,7 L17,10 L15,10 L15,9 L13,9 L13,15 L14,15 L14,17 L10,17 L10,15 L11,15 L11,9 Z M4,2 L20,2 C21.1045695,2 22,2.8954305 22,4 L22,20 C22,21.1045695 21.1045695,22 20,22 L4,22 C2.8954305,22 2,21.1045695 2,20 L2,4 C2,2.8954305 2.8954305,2 4,2 Z M4,4 L4,20 L20,20 L20,4 L4,4 Z"></path>
        </g>
      </svg>
    `

    // Add heading level (H1, H2, etc)
    const headingLevel = document.createElement('span')
    headingLevel.className = 'heading-level'
    headingLevel.textContent = headingData.element.toUpperCase()
    cardHeader.appendChild(headingLevel)

    headingCard.appendChild(cardHeader)

    // Create card content
    const cardContent = document.createElement('div')
    cardContent.className = 'font-card-content'

    // Font family container
    const fontValueContainer = document.createElement('div')
    fontValueContainer.className = 'font-value-container'

    const fontValue = document.createElement('p')
    fontValue.className = 'font-value'
    fontValue.textContent = headingData.family || 'Unknown font'
    fontValueContainer.appendChild(fontValue)

    // Copy button
    const copyButton = document.createElement('button')
    copyButton.className = 'copy-font-btn'
    copyButton.dataset.copy = headingData.family || ''
    copyButton.textContent = 'Kopiëren'
    copyButton.addEventListener('click', () => {
      navigator.clipboard.writeText(copyButton.dataset.copy)
      copyButton.textContent = 'Gekopieerd!'
      setTimeout(() => {
        copyButton.textContent = 'Kopiëren'
      }, 2000)
    })
    fontValueContainer.appendChild(copyButton)

    cardContent.appendChild(fontValueContainer)

    // Property boxes for style, weight, size, line-height
    const propertiesDiv = document.createElement('div')
    propertiesDiv.className = 'body-properties'

    const propertyBoxes = document.createElement('div')
    propertyBoxes.className = 'property-boxes'

    // Style property
    const styleItem = this.createPropertyItem(
      'Stijl',
      headingData.style || 'normal'
    )
    propertyBoxes.appendChild(styleItem)

    // Weight property
    const weightItem = this.createPropertyItem(
      'Gewicht',
      headingData.weight || '400'
    )
    propertyBoxes.appendChild(weightItem)

    // Size property
    const sizeItem = this.createPropertyItem(
      'Grootte',
      headingData.size || '16px'
    )
    propertyBoxes.appendChild(sizeItem)

    // Line height property
    const lineHeightItem = this.createPropertyItem(
      'Lijnhoogte',
      headingData.lineHeight || 'normal'
    )
    propertyBoxes.appendChild(lineHeightItem)

    propertiesDiv.appendChild(propertyBoxes)

    // Preview container
    const previewContainer = document.createElement('div')
    previewContainer.className = 'font-preview-container'

    const previewLabel = document.createElement('div')
    previewLabel.className = 'preview-label'
    previewLabel.textContent = 'Titel'
    previewContainer.appendChild(previewLabel)

    const fontPreview = document.createElement('div')
    fontPreview.className = 'font-preview heading-preview'
    fontPreview.textContent = headingData.text || 'Sample text'

    // Apply the font styles to the preview
    fontPreview.style.fontFamily = headingData.family || ''
    fontPreview.style.fontSize = headingData.size || ''
    fontPreview.style.fontStyle = headingData.style || ''
    fontPreview.style.lineHeight = headingData.lineHeight || ''

    previewContainer.appendChild(fontPreview)

    propertiesDiv.appendChild(previewContainer)
    cardContent.appendChild(propertiesDiv)
    headingCard.appendChild(cardContent)

    // Add the card to the container
    this.headingsContainer.appendChild(headingCard)
  }

  createPropertyItem(label, value) {
    const propertyItem = document.createElement('div')
    propertyItem.className = 'property-item'

    const propertyLabel = document.createElement('div')
    propertyLabel.className = 'property-label'
    propertyLabel.textContent = label
    propertyItem.appendChild(propertyLabel)

    const propertyValue = document.createElement('div')
    propertyValue.className = 'property-value'
    propertyValue.textContent = value
    propertyItem.appendChild(propertyValue)

    return propertyItem
  }
}

// Export the OverviewTab class
window.OverviewTab = OverviewTab

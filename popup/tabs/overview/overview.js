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

  // Replace the addHeadingElement method with this ultra-compact version

  addHeadingElement(headingData) {
    if (!this.headingsContainer) return

    // Create new ultra-compact heading card
    const headingCard = document.createElement('div')
    headingCard.className = 'heading-card ultra-compact'
    headingCard.dataset.level = headingData.element.toLowerCase()

    // Create horizontal layout container
    const cardLayout = document.createElement('div')
    cardLayout.className = 'card-layout'

    // Left column - heading type
    const headingType = document.createElement('div')
    headingType.className = 'heading-type'

    const headingLevel = document.createElement('div')
    headingLevel.className = 'heading-level'
    headingLevel.textContent = headingData.element.toUpperCase()
    headingType.appendChild(headingLevel)

    // Right column - heading details
    const headingDetails = document.createElement('div')
    headingDetails.className = 'heading-details'

    // Font family row with copy button
    const fontFamilyRow = document.createElement('div')
    fontFamilyRow.className = 'font-family-row'

    const fontFamily = document.createElement('div')
    fontFamily.className = 'font-family'
    fontFamily.textContent = headingData.family || 'Unknown font'
    fontFamilyRow.appendChild(fontFamily)

    const copyBtn = document.createElement('button')
    copyBtn.className = 'copy-btn'
    copyBtn.textContent = 'Kopiëren'
    copyBtn.dataset.copy = headingData.family || ''
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(copyBtn.dataset.copy)
      copyBtn.textContent = 'Gekopieerd!'
      setTimeout(() => {
        copyBtn.textContent = 'Kopiëren'
      }, 2000)
    })
    fontFamilyRow.appendChild(copyBtn)
    headingDetails.appendChild(fontFamilyRow)

    // Properties grid
    const propertiesGrid = document.createElement('div')
    propertiesGrid.className = 'properties-grid'

    // Style property
    const styleProperty = this.createUltraCompactProperty(
      'Stijl',
      headingData.style || 'normal'
    )
    propertiesGrid.appendChild(styleProperty)

    // Weight property
    const weightProperty = this.createUltraCompactProperty(
      'Gewicht',
      headingData.weight || '400'
    )
    propertiesGrid.appendChild(weightProperty)

    // Size property
    const sizeProperty = this.createUltraCompactProperty(
      'Grootte',
      headingData.size || '16px'
    )
    propertiesGrid.appendChild(sizeProperty)

    // Line height property
    const lineHeightProperty = this.createUltraCompactProperty(
      'Lijnhoogte',
      headingData.lineHeight || 'normal'
    )
    propertiesGrid.appendChild(lineHeightProperty)

    headingDetails.appendChild(propertiesGrid)

    // Preview section
    const previewSection = document.createElement('div')
    previewSection.className = 'preview-section'

    const previewLabel = document.createElement('div')
    previewLabel.className = 'preview-label'
    previewLabel.textContent = 'Titel'
    previewSection.appendChild(previewLabel)

    const previewText = document.createElement('div')
    previewText.className = 'preview-text'
    previewText.textContent = headingData.text || 'Sample text'

    // Apply only font family and size to preview text
    previewText.style.fontFamily = headingData.family || ''
    previewText.style.fontStyle = headingData.style || ''
    // Removed weight as requested

    previewSection.appendChild(previewText)
    headingDetails.appendChild(previewSection)

    // Assemble the card
    cardLayout.appendChild(headingType)
    cardLayout.appendChild(headingDetails)
    headingCard.appendChild(cardLayout)

    // Add the card to the container
    this.headingsContainer.appendChild(headingCard)
  }

  // Helper method for creating ultra-compact property items
  createUltraCompactProperty(label, value) {
    const property = document.createElement('div')
    property.className = 'property'

    const propertyLabel = document.createElement('div')
    propertyLabel.className = 'property-label'
    propertyLabel.textContent = label
    property.appendChild(propertyLabel)

    const propertyValue = document.createElement('div')
    propertyValue.className = 'property-value'
    propertyValue.textContent = value
    property.appendChild(propertyValue)

    return property
  }

  // Update the showNoHeadingsMessage method
  showNoHeadingsMessage(message) {
    if (this.headingsContainer) {
      this.headingsContainer.innerHTML = `
      <div class="no-headings-message ultra-compact">
        ${message}
      </div>
    `
    }
  }

  // Add this to your initialize method
  initialize() {
    // Make sure to add ultra-compact class to the container
    if (this.headingsContainer) {
      this.headingsContainer.classList.add('ultra-compact')
    }

    // Rest of your initialization code
    this.analyzeCurrentPageHeadings()

    // Set up event listener for tab changes or page refreshes
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete') {
        // Refresh headings data when the page is loaded
        this.analyzeCurrentPageHeadings()
      }
    })
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

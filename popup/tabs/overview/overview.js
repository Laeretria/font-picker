// Overview tab specific functionality
class OverviewTab {
  constructor() {
    // Main container for all heading elements
    this.headingsContainer = document.getElementById('headings-container')

    // Initialize
    this.initialize()
  }

  initialize() {
    // Make sure to add ultra-compact class to the container
    if (this.headingsContainer) {
      this.headingsContainer.classList.add('ultra-compact')
    }

    console.log('OverviewTab initialized, analyzing page...')

    // Immediately analyze the current page for headings and body font
    this.analyzeCurrentPageHeadingsAndBody()

    // Set up event listener for tab changes or page refreshes
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete') {
        // Refresh headings data when the page is loaded
        this.analyzeCurrentPageHeadingsAndBody()
      }
    })
  }

  analyzeCurrentPageHeadingsAndBody() {
    // Clear existing headings and show loading state
    if (this.headingsContainer) {
      this.headingsContainer.innerHTML =
        '<div class="loading-message">Koppen en body font laden...</div>'
    }

    // Query active tab and analyze headings directly
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        // Ensure content script is injected
        this.ensureContentScriptLoaded(tabs[0].id, () => {
          // Create a promise for the body font analysis
          const bodyFontPromise = new Promise((resolve) => {
            chrome.tabs.sendMessage(
              tabs[0].id,
              { action: 'analyzeBodyFont' },
              (response) => {
                if (chrome.runtime.lastError) {
                  console.error(
                    'Error analyzing body font:',
                    chrome.runtime.lastError
                  )
                  resolve(null)
                } else {
                  resolve(response?.bodyFont || null)
                }
              }
            )
          })

          // Create a promise for the headings analysis
          const headingsPromise = new Promise((resolve) => {
            chrome.tabs.sendMessage(
              tabs[0].id,
              { action: 'analyzeHeadings' },
              (response) => {
                if (chrome.runtime.lastError) {
                  console.error(
                    'Error analyzing headings:',
                    chrome.runtime.lastError
                  )
                  resolve(null)
                } else {
                  resolve(response?.headings || null)
                }
              }
            )
          })

          // Modified section of the Promise.all handler in the analyzeCurrentPageHeadingsAndBody method
          Promise.all([bodyFontPromise, headingsPromise])
            .then(([bodyFontData, headingsData]) => {
              // Clear container before adding content
              this.headingsContainer.innerHTML = ''

              let contentAdded = false

              // Add the headings FIRST
              if (headingsData && headingsData.length > 0) {
                // Process unique heading levels - take only first of each type
                const uniqueHeadings = this.getUniqueHeadingLevels(headingsData)

                if (uniqueHeadings.length > 0) {
                  // Add each unique heading level to the overview
                  uniqueHeadings.forEach((heading) => {
                    this.addHeadingElement(heading)
                  })
                  contentAdded = true
                }
              }

              // Add the body font data LAST (if available)
              if (bodyFontData) {
                console.log('Adding body font element with data:', bodyFontData)
                this.addBodyFontElement(bodyFontData)
                contentAdded = true
              }

              // Show message if no content was added
              if (!contentAdded) {
                this.showNoHeadingsMessage(
                  'Geen koppen of body font gevonden op deze pagina.'
                )
              }
            })
            .catch((error) => {
              console.error('Error during analysis:', error)
              this.showNoHeadingsMessage(
                'Fout bij het analyseren van de pagina.'
              )
            })
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
      <div class="no-headings-message ultra-compact">
        ${message}
      </div>
    `
    }
  }

  // Add body font element in the same style as headings
  addBodyFontElement(bodyFontData) {
    if (!this.headingsContainer) {
      console.error('Headings container not found')
      return
    }

    console.log('Creating body font card with data:', bodyFontData)

    try {
      // Create new ultra-compact body font card
      const bodyCard = document.createElement('div')
      bodyCard.className = 'heading-card ultra-compact'
      bodyCard.dataset.level = 'body'

      // Add some basic styling to make it stand out
      bodyCard.style.borderLeft = '3px solid var(--primary-color)'
      bodyCard.style.marginBottom = '15px'

      // Create horizontal layout container
      const cardLayout = document.createElement('div')
      cardLayout.className = 'card-layout'

      // Left column - heading type
      const headingType = document.createElement('div')
      headingType.className = 'heading-type'

      const headingLevel = document.createElement('div')
      headingLevel.className = 'heading-level'
      headingLevel.textContent = 'BODY'
      headingType.appendChild(headingLevel)

      // Right column - heading details
      const headingDetails = document.createElement('div')
      headingDetails.className = 'heading-details'

      // Font family row without copy button
      const fontFamilyRow = document.createElement('div')
      fontFamilyRow.className = 'font-family-row'

      const fontFamily = document.createElement('div')
      fontFamily.className = 'font-family'
      fontFamily.textContent = bodyFontData.family || 'Unknown font'
      fontFamilyRow.appendChild(fontFamily)

      headingDetails.appendChild(fontFamilyRow)

      // Properties grid
      const propertiesGrid = document.createElement('div')
      propertiesGrid.className = 'properties-grid'

      // Style property
      const styleProperty = this.createUltraCompactProperty(
        'Stijl',
        bodyFontData.style || 'normal'
      )
      propertiesGrid.appendChild(styleProperty)

      // Weight property
      const weightProperty = this.createUltraCompactProperty(
        'Gewicht',
        bodyFontData.weight || '400'
      )
      propertiesGrid.appendChild(weightProperty)

      // Size property
      const sizeProperty = this.createUltraCompactProperty(
        'Grootte',
        bodyFontData.size || '16px'
      )
      propertiesGrid.appendChild(sizeProperty)

      // Line height property
      const lineHeightProperty = this.createUltraCompactProperty(
        'Lijnhoogte',
        bodyFontData.lineHeight || 'normal'
      )
      propertiesGrid.appendChild(lineHeightProperty)

      headingDetails.appendChild(propertiesGrid)

      // Assemble the card
      cardLayout.appendChild(headingType)
      cardLayout.appendChild(headingDetails)
      bodyCard.appendChild(cardLayout)

      // Add the card to the container at the beginning
      this.headingsContainer.appendChild(bodyCard)
      console.log('Body font card added to container')
    } catch (error) {
      console.error('Error creating body font card:', error)
    }
  }

  // Modified addHeadingElement method with the copy button removed
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

    // Font family row without copy button
    const fontFamilyRow = document.createElement('div')
    fontFamilyRow.className = 'font-family-row'

    const fontFamily = document.createElement('div')
    fontFamily.className = 'font-family'
    fontFamily.textContent = headingData.family || 'Unknown font'
    fontFamilyRow.appendChild(fontFamily)

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

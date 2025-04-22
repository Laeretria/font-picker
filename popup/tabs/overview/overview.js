// Overview tab specific functionality
class OverviewTab {
  constructor() {
    // Font elements in overview
    this.headingFontElement = document.getElementById('overview-heading-font')
    this.bodyFontElement = document.getElementById('overview-body-font')

    // Color elements in overview
    this.backgroundColorsContainer = document.getElementById(
      'overview-background-colors'
    )
    this.textColorsContainer = document.getElementById('overview-text-colors')

    // Initialize
    this.initialize()
  }

  initialize() {
    // Load stored data
    this.loadStoredData()
  }

  loadStoredData() {
    // Load font data
    const storedFontData = localStorage.getItem('selectedElementFontData')
    if (storedFontData) {
      try {
        const fontData = JSON.parse(storedFontData)
        this.updateFontOverview(fontData)
      } catch (e) {
        console.error('Error parsing stored font data:', e)
      }
    }

    // Load color data
    const storedColorData = localStorage.getItem('selectedElementColorData')
    if (storedColorData) {
      try {
        const colorData = JSON.parse(storedColorData)
        this.updateColorOverview(colorData)
      } catch (e) {
        console.error('Error parsing stored color data:', e)
      }
    }
  }

  updateFontOverview(fontData) {
    if (this.bodyFontElement && fontData.family) {
      this.bodyFontElement.textContent = fontData.family
    }

    // Try to get heading font from storage
    const storedData = localStorage.getItem('selectedElementFontData')
    if (storedData && this.headingFontElement) {
      try {
        const parsedData = JSON.parse(storedData)
        if (parsedData && parsedData.heading && parsedData.heading.family) {
          this.headingFontElement.textContent = parsedData.heading.family
        }
      } catch (e) {
        console.error('Error parsing heading font data:', e)
      }
    }
  }

  updateColorOverview(colorData) {
    // Update background colors
    if (this.backgroundColorsContainer && colorData.background) {
      this.renderColorGrid(this.backgroundColorsContainer, colorData.background)
    }

    // Update text colors
    if (this.textColorsContainer && colorData.text) {
      this.renderColorGrid(this.textColorsContainer, colorData.text)
    }
  }

  renderColorGrid(container, colors) {
    // Clear container
    container.innerHTML = ''

    // Add each color as a swatch
    colors.forEach((color) => {
      if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
        const swatch = document.createElement('div')
        swatch.className = 'color-swatch'
        swatch.style.backgroundColor = color

        const colorValue = document.createElement('div')
        colorValue.className = 'color-value'
        colorValue.textContent = color

        swatch.appendChild(colorValue)
        container.appendChild(swatch)
      }
    })

    // If no colors, show message
    if (container.children.length === 0) {
      const message = document.createElement('p')
      message.className = 'no-colors-message'
      message.textContent =
        'Geen kleuren gevonden. Selecteer eerst een element.'
      container.appendChild(message)
    }
  }
}

// Export the OverviewTab class
window.OverviewTab = OverviewTab

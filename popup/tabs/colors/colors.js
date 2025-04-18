// Colors tab specific functionality

class ColorsTab {
  constructor() {
    // Color elements
    this.colorWheelElement = document.getElementById('color-wheel')
    this.backgroundColorsElement = document.getElementById('background-colors')
    this.textColorsElement = document.getElementById('text-colors')
    this.borderColorsElement = document.getElementById('border-colors')

    // Color format (hex, rgb, hsl)
    this.currentFormat = 'hex'

    // All colors data
    this.colorsData = null

    // Initialize
    this.initialize()
  }

  initialize() {
    // Set up event listeners
    this.setupEventListeners()

    // Initial analysis
    this.analyzeColors()
  }

  setupEventListeners() {
    // Format toggle buttons
    if (document.getElementById('format-selector')) {
      document.querySelectorAll('.format-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.format-btn').forEach((b) => {
            b.classList.remove('active')
          })
          btn.classList.add('active')
          this.currentFormat = btn.dataset.format

          // Update color displays with new format
          if (this.colorsData) {
            this.updateColorUI(this.colorsData)
          }
        })
      })
    }
  }

  analyzeColors() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'analyzeColors' },
        (response) => {
          if (response && response.colors) {
            this.colorsData = response.colors
            this.updateColorUI(response.colors)
          }
        }
      )
    })
  }

  updateColorUI(colorData) {
    // Cache the data
    this.colorsData = colorData

    // Generate color wheel
    this.generateColorWheel(colorData.all)

    // Update color lists
    this.updateColorList(this.backgroundColorsElement, colorData.background)
    this.updateColorList(this.textColorsElement, colorData.text)
    this.updateColorList(this.borderColorsElement, colorData.border)

    // Update stats if we have that element
    if (document.getElementById('total-colors')) {
      document.getElementById('total-colors').textContent =
        this.getUniqueColors(colorData.all).length

      document.getElementById('bg-colors').textContent = this.getUniqueColors(
        colorData.background
      ).length

      document.getElementById('txt-colors').textContent = this.getUniqueColors(
        colorData.text
      ).length
    }
  }

  getUniqueColors(colors) {
    return [...new Set(colors)].filter(
      (color) => color && color !== 'transparent'
    )
  }

  generateColorWheel(colors) {
    this.colorWheelElement.innerHTML = ''

    // Create SVG for color wheel
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 100 100')

    const uniqueColors = this.getUniqueColors(colors)
    const total = uniqueColors.length

    // Create pie slices for color wheel
    if (total > 0) {
      const centerX = 50
      const centerY = 50
      const radius = 40
      const innerRadius = 20

      let startAngle = 0
      const angleStep = (2 * Math.PI) / total

      uniqueColors.forEach((color, index) => {
        const endAngle = startAngle + angleStep

        // Calculate path
        const startX1 = centerX + innerRadius * Math.cos(startAngle)
        const startY1 = centerY + innerRadius * Math.sin(startAngle)
        const endX1 = centerX + radius * Math.cos(startAngle)
        const endY1 = centerY + radius * Math.sin(startAngle)

        const startX2 = centerX + radius * Math.cos(endAngle)
        const startY2 = centerY + radius * Math.sin(endAngle)
        const endX2 = centerX + innerRadius * Math.cos(endAngle)
        const endY2 = centerY + innerRadius * Math.sin(endAngle)

        const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0

        const path = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'path'
        )
        path.setAttribute(
          'd',
          `
                    M ${startX1} ${startY1}
                    L ${endX1} ${endY1}
                    A ${radius} ${radius} 0 ${largeArcFlag} 1 ${startX2} ${startY2}
                    L ${endX2} ${endY2}
                    A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${startX1} ${startY1}
                    Z
                `
        )
        path.setAttribute('fill', color)
        path.setAttribute('stroke', '#fff')
        path.setAttribute('stroke-width', '0.5')

        // Add title for tooltip
        const title = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'title'
        )
        title.textContent = this.formatColor(color)
        path.appendChild(title)

        // Add click event to copy color code
        path.addEventListener('click', () => {
          this.copyToClipboard(this.formatColor(color))
        })

        svg.appendChild(path)

        startAngle = endAngle
      })
    } else {
      // No colors message
      const textElement = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'text'
      )
      textElement.setAttribute('x', '50')
      textElement.setAttribute('y', '50')
      textElement.setAttribute('text-anchor', 'middle')
      textElement.setAttribute('fill', '#999')
      textElement.textContent = 'No colors found'
      svg.appendChild(textElement)
    }

    this.colorWheelElement.appendChild(svg)
  }

  updateColorList(container, colors) {
    container.innerHTML = ''

    // Get unique colors
    const uniqueColors = this.getUniqueColors(colors)

    // Count frequency of each color
    const colorFrequency = {}
    colors.forEach((color) => {
      if (color && color !== 'transparent') {
        colorFrequency[color] = (colorFrequency[color] || 0) + 1
      }
    })

    // Create color items
    uniqueColors.forEach((color) => {
      const colorItem = document.createElement('div')
      colorItem.className = 'color-item'

      const colorBox = document.createElement('div')
      colorBox.className = 'color-box'
      colorBox.style.backgroundColor = color

      const colorHex = document.createElement('div')
      colorHex.className = 'color-hex'
      colorHex.textContent = this.formatColor(color)

      const colorUsage = document.createElement('div')
      colorUsage.className = 'color-usage'
      colorUsage.textContent = `${colorFrequency[color]} uses`

      colorItem.appendChild(colorBox)
      colorItem.appendChild(colorHex)
      colorItem.appendChild(colorUsage)

      // Add click event to copy color code
      colorItem.addEventListener('click', () => {
        this.copyToClipboard(this.formatColor(color))
      })

      container.appendChild(colorItem)
    })

    // If no colors found
    if (uniqueColors.length === 0) {
      const noColorsMsg = document.createElement('p')
      noColorsMsg.className = 'empty-list-message'
      noColorsMsg.textContent = 'No colors found'
      container.appendChild(noColorsMsg)
    }
  }

  formatColor(color) {
    if (this.currentFormat === 'hex') {
      return this.rgbToHex(color)
    } else if (this.currentFormat === 'rgb') {
      return color
    } else if (this.currentFormat === 'hsl') {
      return this.rgbToHsl(color)
    }
    return color
  }

  rgbToHex(rgb) {
    // Check if already in hex format
    if (rgb.startsWith('#')) {
      return rgb
    }

    // Parse RGB values
    const rgbMatch = rgb.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/
    )
    if (!rgbMatch) return rgb

    const r = parseInt(rgbMatch[1])
    const g = parseInt(rgbMatch[2])
    const b = parseInt(rgbMatch[3])
    const a = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1

    // Convert to hex
    const toHex = (c) => {
      const hex = c.toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }

    // If fully opaque, return simple hex
    if (a === 1) {
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`
    }

    // If transparent, include alpha
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(Math.round(a * 255))}`
  }

  rgbToHsl(rgb) {
    // Check if already in hsl format
    if (rgb.startsWith('hsl')) {
      return rgb
    }

    // Parse RGB values
    const rgbMatch = rgb.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/
    )
    if (!rgbMatch) return rgb

    let r = parseInt(rgbMatch[1]) / 255
    let g = parseInt(rgbMatch[2]) / 255
    let b = parseInt(rgbMatch[3]) / 255
    const a = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h,
      s,
      l = (max + min) / 2

    if (max === min) {
      h = s = 0 // achromatic
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

      h /= 6
    }

    h = Math.round(h * 360)
    s = Math.round(s * 100)
    l = Math.round(l * 100)

    // If fully opaque, return simple hsl
    if (a === 1) {
      return `hsl(${h}, ${s}%, ${l}%)`
    }

    // If transparent, include alpha
    return `hsla(${h}, ${s}%, ${l}%, ${a})`
  }

  copyToClipboard(text) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        // Show a temporary success message
        const message = document.createElement('div')
        message.textContent = 'Copied!'
        message.className = 'copy-tooltip'

        // Position near the mouse
        const x = event.clientX + 10
        const y = event.clientY - 10
        message.style.left = `${x}px`
        message.style.top = `${y}px`

        document.body.appendChild(message)

        // Remove after 1.5 seconds
        setTimeout(() => {
          document.body.removeChild(message)
        }, 1500)
      })
      .catch((err) => {
        console.error('Could not copy text: ', err)
      })
  }

  updateSelectedElementColorData(colorData) {
    // Update the color lists with the selected element's colors
    if (colorData.text) {
      this.updateColorList(this.textColorsElement, [colorData.text])
    }

    if (colorData.background) {
      this.updateColorList(this.backgroundColorsElement, [colorData.background])
    }

    if (colorData.border) {
      this.updateColorList(this.borderColorsElement, [colorData.border])
    }
  }
}

// Export the ColorsTab class
window.ColorsTab = ColorsTab

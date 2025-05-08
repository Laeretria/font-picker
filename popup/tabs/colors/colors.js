// Colors tab specific functionality

class ColorsTab {
  constructor(hasScannedUrl = false) {
    // Color elements
    this.colorWheelElement = document.getElementById('color-wheel')
    this.backgroundColorsElement = document.getElementById('background-colors')
    this.textColorsElement = document.getElementById('text-colors')
    this.borderColorsElement = document.getElementById('border-colors')

    // Color format (hex, rgb, hsl)
    this.currentFormat = 'hex'

    // All colors data
    this.colorsData = null

    // Flag to track if this URL has already been scanned
    this.hasScannedUrl = hasScannedUrl

    // Initialize
    this.initialize()
  }

  initialize() {
    // Set up event listeners
    this.setupEventListeners()

    // Start automatic color analysis with scrolling only if we haven't scanned this URL
    if (!this.hasScannedUrl) {
      this.startAutoScrollAnalysis()
    } else {
      console.log('URL already scanned, skipping auto-scroll analysis')
    }

    // Initial analysis (always do this to get current colors)
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

          // Update the indicator text format if it exists
          if (this.colorsData && this.colorsData.all.length > 0) {
            const colorFrequency = {}
            this.colorsData.all.forEach((color) => {
              if (color && color !== 'transparent') {
                colorFrequency[color] = (colorFrequency[color] || 0) + 1
              }
            })

            const uniqueColors = this.getUniqueColors(this.colorsData.all)
            const sortedColors = [...uniqueColors].sort(
              (a, b) => colorFrequency[b] - colorFrequency[a]
            )

            if (sortedColors.length > 0) {
              const indicatorText = document.getElementById(
                'color-indicator-text'
              )
              if (indicatorText) {
                indicatorText.textContent = this.formatColor(sortedColors[0])
              }
            }
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

  // Modify the startAutoScrollAnalysis method in the ColorsTab class:
  startAutoScrollAnalysis() {
    // Show loading overlay
    this.showLoadingOverlay()

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'startAutoScroll' },
        (response) => {
          // Response will come through progress messages,
          // so we don't need to handle it here
        }
      )
    })
  }

  // Show loading overlay with progress
  showLoadingOverlay(progress = 0) {
    let overlay = document.getElementById('color-scan-overlay')

    // Create overlay if it doesn't exist
    if (!overlay) {
      overlay = document.createElement('div')
      overlay.id = 'color-scan-overlay'
      overlay.style.position = 'absolute'
      overlay.style.top = '54px'
      overlay.style.left = '0'
      overlay.style.borderRadius = '8px'
      overlay.style.width = '100%'
      overlay.style.height = 'calc(100% - 54px)'
      overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'
      overlay.style.display = 'flex'
      overlay.style.flexDirection = 'column'
      overlay.style.alignItems = 'center'
      overlay.style.justifyContent = 'flex-start' // Changed from 'center' to 'flex-start'
      overlay.style.paddingTop = '200px' // Add some padding at the top
      overlay.style.zIndex = '1000'

      // Add to the colors tab
      const colorsTab = document.getElementById('colors-tab')
      if (colorsTab) {
        colorsTab.style.position = 'relative'
        colorsTab.appendChild(overlay)
      }
    }

    // Update or create progress content
    let progressContent = overlay.querySelector('.progress-content')
    if (!progressContent) {
      progressContent = document.createElement('div')
      progressContent.className = 'progress-content'
      progressContent.style.textAlign = 'center'

      const message = document.createElement('p')
      message.textContent = 'Pagina scannen voor alle kleuren...'
      message.style.fontFamily = 'Regola-Medium, sans-serif'
      message.style.fontSize = '16px'
      message.style.marginBottom = '5px'

      const subMessage = document.createElement('p')
      subMessage.textContent =
        'Automatisch scrollen om alle kleuren te detecteren'
      subMessage.style.fontFamily = 'Regola-Regular, sans-serif'
      subMessage.style.fontSize = '14px'
      subMessage.style.marginBottom = '15px'
      subMessage.style.color = '#666'

      const progressContainer = document.createElement('div')
      progressContainer.style.width = '80%'
      progressContainer.style.height = '10px'
      progressContainer.style.backgroundColor = '#eee'
      progressContainer.style.borderRadius = '5px'
      progressContainer.style.overflow = 'hidden'
      progressContainer.style.margin = '0 auto'

      const progressBar = document.createElement('div')
      progressBar.className = 'progress-bar'
      progressBar.style.width = `${progress}%`
      progressBar.style.height = '100%'
      progressBar.style.backgroundColor = '#1448ff'
      progressBar.style.transition = 'width 0.3s ease'

      const progressText = document.createElement('p')
      progressText.className = 'progress-text'
      // Format without decimal places, just whole numbers
      progressText.textContent = `${Math.round(progress)}% complete`
      progressText.style.marginTop = '8px'
      progressText.style.fontSize = '14px'

      progressContainer.appendChild(progressBar)
      progressContent.appendChild(message)
      progressContent.appendChild(subMessage)
      progressContent.appendChild(progressContainer)
      progressContent.appendChild(progressText)

      overlay.appendChild(progressContent)
    } else {
      // Update existing progress
      const progressBar = overlay.querySelector('.progress-bar')
      const progressText = overlay.querySelector('.progress-text')

      if (progressBar) {
        progressBar.style.width = `${progress}%`
      }

      if (progressText) {
        // Format without decimal places, just whole numbers
        progressText.textContent = `${Math.round(progress)}% complete`
      }
    }
  }

  // Hide loading overlay
  hideLoadingOverlay() {
    const overlay = document.getElementById('color-scan-overlay')
    if (overlay) {
      overlay.remove()
    }
  }

  // Update progress
  updateScanProgress(progress) {
    this.showLoadingOverlay(progress)
  }

  updateColorUI(colorData) {
    // Cache the data
    this.colorsData = colorData

    // Generate color wheel
    this.generateColorWheel(colorData.all)

    // Update color lists
    this.updateColorList(this.backgroundColorsElement, colorData.background)
    this.updateColorList(this.textColorsElement, colorData.text)

    // Filter out colors that already appear in background or text colors to create "overige kleuren"
    const backgroundAndTextColors = [...colorData.background, ...colorData.text]
    const uniqueOtherColors = colorData.border.filter(
      (color) => !backgroundAndTextColors.includes(color)
    )

    this.updateColorList(this.borderColorsElement, uniqueOtherColors)
  }

  getUniqueColors(colors) {
    // Filter out transparent and white colors
    return [...new Set(colors)].filter(
      (color) =>
        color && color !== 'transparent' && !this.isTransparentOrWhite(color)
    )
  }

  isTransparentOrWhite(color) {
    // First check for full transparency in hex format
    if (color.startsWith('#') && color.length === 9) {
      // Check if the last two characters (alpha) are "00"
      if (color.substring(7, 9).toLowerCase() === '00') {
        return true // Fully transparent
      }
    }

    // Handle RGBA format for transparency
    if (color.startsWith('rgba')) {
      const rgbaMatch = color.match(
        /rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)/
      )
      if (rgbaMatch) {
        const alpha = parseFloat(rgbaMatch[4])
        // Check if fully or nearly transparent
        if (alpha <= 0.05) {
          return true
        }
      }
    }

    // Handle HSLA format for transparency
    if (color.startsWith('hsla')) {
      const hslaMatch = color.match(
        /hsla\((\d+),\s*(\d+)%,\s*(\d+)%,\s*([0-9.]+)\)/
      )
      if (hslaMatch) {
        const alpha = parseFloat(hslaMatch[4])
        // Check if fully or nearly transparent
        if (alpha <= 0.05) {
          return true
        }
      }
    }

    // Then check for white color
    // Handle hex format
    if (color.startsWith('#')) {
      const hex = color.toLowerCase()
      return (
        hex === '#fff' ||
        hex === '#ffffff' ||
        hex === '#ffff' ||
        hex === '#ffffffff'
      )
    }

    // Handle RGB format
    if (color.startsWith('rgb')) {
      const rgbMatch = color.match(
        /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/
      )
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1])
        const g = parseInt(rgbMatch[2])
        const b = parseInt(rgbMatch[3])
        // Check if all rgb values are high (white or nearly white)
        return r >= 250 && g >= 250 && b >= 250
      }
    }

    // Handle HSL format
    if (color.startsWith('hsl')) {
      const hslMatch = color.match(
        /hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*([0-9.]+))?\)/
      )
      if (hslMatch) {
        const l = parseInt(hslMatch[3]) // lightness value
        // Check if lightness is very high (white or nearly white)
        return l >= 98
      }
    }

    return false
  }

  generateColorWheel(colors) {
    this.colorWheelElement.innerHTML = ''

    // Create SVG for color wheel
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 100 100')

    const uniqueColors = this.getUniqueColors(colors)
    const total = uniqueColors.length

    // Count frequency of each color
    const colorFrequency = {}
    colors.forEach((color) => {
      if (color && color !== 'transparent') {
        colorFrequency[color] = (colorFrequency[color] || 0) + 1
      }
    })

    // Sort colors by frequency (most used first)
    const sortedColors = [...uniqueColors].sort(
      (a, b) => colorFrequency[b] - colorFrequency[a]
    )

    // Create pie slices for color wheel
    if (total > 0) {
      const centerX = 50
      const centerY = 50
      const radius = 40
      const innerRadius = 20

      let startAngle = -Math.PI / 2 // Start at the top (12 o'clock)
      const angleStep = (2 * Math.PI) / total

      // Add the main color wheel slices
      sortedColors.forEach((color, index) => {
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

        /*         // Add title for tooltip
        const title = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'title'
        )
        title.textContent = this.formatColor(color)
        path.appendChild(title) */

        // Add click event to copy color code
        path.addEventListener('click', () => {
          this.copyToClipboard(this.formatColor(color))
        })

        // Add mouseenter/mouseleave for instant tooltip
        path.addEventListener('mouseenter', (e) => {
          // Get or create tooltip element
          let tooltip = document.getElementById('instant-color-tooltip')
          if (!tooltip) {
            tooltip = document.createElement('div')
            tooltip.id = 'instant-color-tooltip'
            tooltip.style.position = 'fixed'
            tooltip.style.backgroundColor = 'rgb(0, 0, 0)'
            tooltip.style.color = 'white'
            tooltip.style.padding = '4px 8px'
            tooltip.style.borderRadius = '4px'
            tooltip.style.fontSize = '12px'
            tooltip.style.zIndex = '9999'
            tooltip.style.pointerEvents = 'none'
            tooltip.style.fontFamily = 'Regola-Regular, sans-serif'
            document.body.appendChild(tooltip)
          }

          // Position near cursor
          const rect = svg.getBoundingClientRect()
          tooltip.style.left = e.clientX + 10 + 'px'
          tooltip.style.top = e.clientY + 10 + 'px'

          // Show tooltip with color
          tooltip.textContent = this.formatColor(color)
          tooltip.style.display = 'block'
        })

        path.addEventListener('mouseleave', () => {
          const tooltip = document.getElementById('instant-color-tooltip')
          if (tooltip) {
            tooltip.style.display = 'none'
          }
        })

        svg.appendChild(path)

        startAngle = endAngle
      })
      // Remove any existing indicator containers
      const existingIndicator = document.getElementById(
        'color-indicator-container'
      )
      if (existingIndicator) {
        existingIndicator.remove()
      }

      // Add external HTML indicator for the most used color
      if (sortedColors.length > 0) {
        const mostUsedColor = sortedColors[0]

        // Create a container for the indicator and text
        const indicatorContainer = document.createElement('div')
        indicatorContainer.id = 'color-indicator-container'

        // Position it absolutely within the color wheel container
        indicatorContainer.style.position = 'absolute'
        indicatorContainer.style.top = '10px'
        indicatorContainer.style.left = '76%'
        indicatorContainer.style.transform = 'translateX(-50%)'
        indicatorContainer.style.display = 'flex'
        indicatorContainer.style.alignItems = 'center'
        indicatorContainer.style.zIndex = '10'

        // Create the image element
        const indicatorImg = document.createElement('img')
        indicatorImg.src = '/assets/images/nodes-black.png' // Your PNG path here
        indicatorImg.style.width = '24px'
        indicatorImg.style.height = '24px'
        indicatorImg.style.marginRight = '5px'

        // Create the color code text element
        const colorText = document.createElement('span')
        colorText.id = 'color-indicator-text'
        colorText.textContent = this.formatColor(mostUsedColor)
        colorText.style.fontFamily = 'Regola-Regular, sans-serif'
        colorText.style.fontSize = '14px'
        colorText.style.paddingBottom = '20px'
        colorText.style.color = 'var(--heading)'
        colorText.style.width = '100px' // Fixed width for the text
        colorText.style.textAlign = 'left' // Align text to the left
        colorText.style.overflow = 'visible' // Allow overflow

        // Add elements to the container
        indicatorContainer.appendChild(indicatorImg)
        indicatorContainer.appendChild(colorText)

        // Make sure the color wheel container has position relative
        this.colorWheelElement.style.position = 'relative'

        // Add the container to the DOM
        this.colorWheelElement.appendChild(indicatorContainer)
      }
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

    // Sort colors by frequency (most used first)
    uniqueColors.sort((a, b) => colorFrequency[b] - colorFrequency[a])

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

      colorItem.appendChild(colorBox)
      colorItem.appendChild(colorHex)

      // Add click event to copy color code
      colorItem.addEventListener('click', () => {
        this.copyToClipboard(this.formatColor(color), colorItem)
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

  hexToRgb(colorStr) {
    // If it's already RGB or RGBA, return as is
    if (colorStr.startsWith('rgb')) {
      return colorStr
    }

    // If it's a valid hex code, return as is
    if (colorStr.startsWith('#')) {
      return colorStr
    }

    // Default fallback
    return colorStr
  }

  copyToClipboard(text, element) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        // Show check mark animation on the color box element
        this.showCheckMarkAnimation(element)

        // Also show the toast notification
        this.showToastNotification(text)
      })
      .catch((err) => {
        console.error('Could not copy text: ', err)
      })
  }
  showCheckMarkAnimation(element) {
    // Find the color box inside the color item
    const colorBox = element.querySelector('.color-box')

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
    checkSvg.setAttribute('width', '16')
    checkSvg.setAttribute('height', '16')
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

  /**
   * This solution creates a floating toast that always appears at the bottom of the main content area,
   * regardless of scrolling position. This is the most reliable approach.
   */

  // Add this method to your ColorsTab class
  showToastNotification(colorText) {
    try {
      // Get the main content element
      const mainContent = document.querySelector('.main-content')

      if (!mainContent) {
        console.error('Could not find main-content div')
        return
      }

      // Create a fixed position toast container if it doesn't exist
      let toastContainer = document.getElementById('toast-container')

      if (!toastContainer) {
        toastContainer = document.createElement('div')
        toastContainer.id = 'toast-container'

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
      toast.className = 'material-toast'

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

  updateSelectedElementColorData(colorData) {
    // Update the color lists with the selected element's colors
    if (colorData.text && !this.isTransparentOrWhite(colorData.text)) {
      this.updateColorList(this.textColorsElement, [colorData.text])
    }

    if (
      colorData.background &&
      !this.isTransparentOrWhite(colorData.background)
    ) {
      this.updateColorList(this.backgroundColorsElement, [colorData.background])
    }

    // Only add to "overige kleuren" if the color isn't already in the other categories
    if (colorData.border && !this.isTransparentOrWhite(colorData.border)) {
      const isUnique =
        (!colorData.text || colorData.border !== colorData.text) &&
        (!colorData.background || colorData.border !== colorData.background)

      if (isUnique) {
        this.updateColorList(this.borderColorsElement, [colorData.border])
      }
    }
  }
}

// Export the ColorsTab class
window.ColorsTab = ColorsTab

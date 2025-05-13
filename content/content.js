// Variables to store state
let pickerActive = false
let highlightedElement = null

// Send a ready message when the content script loads
console.log('Content script loaded on: ' + window.location.href)

// Add a style element for the highlighter
const styleElement = document.createElement('style')
styleElement.textContent = `
  .picker-active {
    cursor: crosshair !important;
  }

  .picker-active * {
    cursor: crosshair !important;
  }
  
  .inspector-highlight {
    outline: 2px dashed #1448ff !important;
    background-color: rgba(20, 72, 255, 0.1) !important;
    cursor: pointer !important;
  }
`
document.head.appendChild(styleElement)

// Set up a message listener
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log('Content script received message:', request.action)

  // Simple ping to check if content script is running
  if (request.action === 'ping') {
    sendResponse({ status: 'ok' })
    return true
  }

  if (request.action === 'analyzeHeadings') {
    analyzeHeadings()
      .then((result) => {
        sendResponse({ headings: result })
      })
      .catch((error) => {
        console.error('Error analyzing headings:', error)
        sendResponse({ error: 'Failed to analyze headings' })
      })
    return true // Keep the message channel open for async response
  }

  if (request.action === 'togglePicker') {
    toggleElementPicker()
    sendResponse({ status: 'ok' })
    return true
  } else if (request.action === 'analyzeFonts') {
    analyzeFonts()
      .then((result) => {
        sendResponse({ fonts: result })
      })
      .catch((error) => {
        console.error('Error analyzing fonts:', error)
        sendResponse({ error: 'Failed to analyze fonts' })
      })
    return true // Keep the message channel open for async response
  } else if (request.action === 'analyzeColors') {
    analyzeColors()
      .then((result) => {
        sendResponse({ colors: result })
      })
      .catch((error) => {
        console.error('Error analyzing colors:', error)
        sendResponse({ error: 'Failed to analyze colors' })
      })
    return true // Keep the message channel open for async response
  } else if (request.action === 'cancelPicker') {
    if (pickerActive) {
      toggleElementPicker() // Deactivate the picker
    }
    sendResponse({ status: 'ok' })
    return true
  } else if (request.action === 'analyzePage') {
    // This is a new action to analyze both fonts and colors at once
    Promise.all([analyzeFonts(), analyzeColors()])
      .then(([fonts, colors]) => {
        sendResponse({
          fonts: fonts,
          colors: colors,
          url: window.location.href,
        })
      })
      .catch((error) => {
        console.error('Error analyzing page:', error)
        sendResponse({ error: 'Failed to analyze page' })
      })
    return true // Keep the message channel open for async response
  } else if (request.action === 'analyzeBodyFont') {
    analyzeBodyFont()
      .then((result) => {
        sendResponse({ bodyFont: result })
      })
      .catch((error) => {
        console.error('Error analyzing body font:', error)
        sendResponse({ error: 'Failed to analyze body font' })
      })
    return true // Keep the message channel open for async response
  } else if (request.action === 'startAutoScroll') {
    autoScrollPageForColorAnalysis()
      .then((results) => {
        sendResponse({
          status: 'complete',
          colors: results,
        })
      })
      .catch((error) => {
        console.error('Error during auto-scroll analysis:', error)
        sendResponse({
          error: 'Failed to complete auto-scroll analysis',
          status: 'error',
        })
      })
    return true // Keep the message channel open for async response
  }
})

// Toggle element picker
function toggleElementPicker() {
  pickerActive = !pickerActive

  if (pickerActive) {
    // Add event listeners when picker is activated
    document.addEventListener('mouseover', highlightElement)
    document.addEventListener('click', selectElement)
    document.addEventListener('keydown', cancelPicker)
    document.body.classList.add('picker-active')

    // Add a visual indicator that the picker is active
    const indicatorDiv = document.createElement('div')
    indicatorDiv.id = 'element-picker-indicator'
    indicatorDiv.textContent =
      'Selecteer element is actief (ESC om te annuleren)'
    indicatorDiv.style.position = 'fixed'
    indicatorDiv.style.top = '10px'
    indicatorDiv.style.right = '10px'
    indicatorDiv.style.backgroundColor = '#1448FF'
    indicatorDiv.style.color = 'white'
    indicatorDiv.style.padding = '5px 10px'
    indicatorDiv.style.borderRadius = '4px'
    indicatorDiv.style.zIndex = '9999999'
    indicatorDiv.style.fontSize = '14px'
    indicatorDiv.style.fontFamily = 'Arial, sans-serif'
    document.body.appendChild(indicatorDiv)
  } else {
    // Remove event listeners when picker is deactivated
    document.removeEventListener('mouseover', highlightElement)
    document.removeEventListener('click', selectElement)
    document.removeEventListener('keydown', cancelPicker)
    document.body.classList.remove('picker-active')
    removeHighlight()

    // Remove the indicator
    const indicator = document.getElementById('element-picker-indicator')
    if (indicator) {
      indicator.remove()
    }
  }
}

// Function to analyze heading elements on the page
async function analyzeHeadings() {
  try {
    const headings = []

    // Get all heading elements (H1-H6)
    const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6')

    // Process each heading element
    headingElements.forEach((element) => {
      // Skip hidden or empty headings
      if (isElementHidden(element) || !element.textContent.trim()) {
        return
      }

      // Get computed styles
      const computedStyle = window.getComputedStyle(element)

      // Format line height as you do in other functions
      let lineHeight = computedStyle.lineHeight || ''
      lineHeight = formatLineHeight(lineHeight)

      // Create heading data object
      const headingData = {
        element: element.tagName.toLowerCase(),
        family: getActualFontFamily(element),
        style: computedStyle.fontStyle,
        weight: computedStyle.fontWeight,
        size: computedStyle.fontSize,
        lineHeight: lineHeight,
        letterSpacing: formatLetterSpacing(
          element,
          computedStyle.letterSpacing
        ),
        text:
          element.textContent.trim().slice(0, 50) +
          (element.textContent.trim().length > 50 ? '...' : ''),
        index: headings.length, // Add an index to track the order
      }

      headings.push(headingData)
    })

    // Sort headings by their hierarchy (h1, h2, h3, etc.)
    headings.sort((a, b) => {
      // First by heading level
      const levelA = parseInt(a.element.substring(1))
      const levelB = parseInt(b.element.substring(1))

      if (levelA !== levelB) {
        return levelA - levelB
      }

      // If same level, sort by their order in the document
      return a.index - b.index
    })

    return headings
  } catch (error) {
    console.error('Error in analyzeHeadings:', error)
    return []
  }
}

// Helper function to check if an element is hidden
function isElementHidden(element) {
  const style = window.getComputedStyle(element)
  return (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    parseFloat(style.opacity) < 0.1 ||
    element.offsetWidth === 0 ||
    element.offsetHeight === 0
  )
}

// Highlight element on hover
function highlightElement(e) {
  e.preventDefault()
  e.stopPropagation()

  // Get the target element
  const element = e.target

  // Check if this is a text element or has text content
  if (!isTextElement(element)) {
    // Skip non-text elements
    return
  }

  // Remove previous highlight
  removeHighlight()

  // Add highlight to current element
  highlightedElement = element

  // Save the original styles to restore later
  highlightedElement._originalOutline = highlightedElement.style.outline
  highlightedElement._originalOutlineOffset =
    highlightedElement.style.outlineOffset
  highlightedElement._originalBackgroundColor =
    highlightedElement.style.backgroundColor

  // Apply highlight styles using the inspector-highlight class
  highlightedElement.classList.add('inspector-highlight')
}

// Remove highlight
function removeHighlight() {
  if (highlightedElement) {
    // Remove the highlight class
    highlightedElement.classList.remove('inspector-highlight')

    // Restore original styles
    highlightedElement.style.outline = highlightedElement._originalOutline || ''
    highlightedElement.style.outlineOffset =
      highlightedElement._originalOutlineOffset || ''
    highlightedElement.style.backgroundColor =
      highlightedElement._originalBackgroundColor || ''

    highlightedElement = null
  }
}

// Cancel picker with ESC key
function cancelPicker(e) {
  if (e.key === 'Escape') {
    toggleElementPicker()
  }
}

// Helper function to determine if an element is a text element
function isTextElement(element) {
  // Skip image elements directly
  if (element.tagName === 'IMG') {
    return false
  }

  // Skip SVG elements
  if (element.tagName === 'svg' || element instanceof SVGElement) {
    return false
  }

  // Skip canvas elements
  if (element.tagName === 'CANVAS') {
    return false
  }

  // Skip video and audio elements
  if (element.tagName === 'VIDEO' || element.tagName === 'AUDIO') {
    return false
  }

  // Skip elements with background images but no text
  const computedStyle = window.getComputedStyle(element)
  const hasBackgroundImage = computedStyle.backgroundImage !== 'none'
  const textContent = element.textContent.trim()

  if (hasBackgroundImage && textContent === '') {
    return false
  }

  // Check if element has visible text content
  if (textContent === '') {
    // No text content, but check if it's a valid container that might have text styling
    const isTextContainer = [
      'P',
      'H1',
      'H2',
      'H3',
      'H4',
      'H5',
      'H6',
      'SPAN',
      'A',
      'BUTTON',
      'LI',
      'TD',
      'TH',
      'LABEL',
      'STRONG',
      'EM',
      'B',
      'I',
    ].includes(element.tagName)

    if (!isTextContainer) {
      return false
    }
  }

  // If we get here, it's likely a text element or container
  return true
}

// Select element function
function selectElement(e) {
  e.preventDefault()
  e.stopPropagation()

  // Get computed styles of selected element
  const element = e.target
  const computedStyle = window.getComputedStyle(element)

  // Check if this is a text element
  if (!isTextElement(element)) {
    // Skip selection for non-text elements
    return
  }

  // Format line height
  let lineHeight = computedStyle.lineHeight || ''
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
  } else if (lineHeight && lineHeight.match(/\d+/)) {
    lineHeight = lineHeight.match(/\d+/)[0] + 'px'
  }

  // Get font data
  const fontData = {
    family: getActualFontFamily(element),
    style: computedStyle.fontStyle,
    weight: computedStyle.fontWeight,
    size: computedStyle.fontSize,
    lineHeight: lineHeight,
    letterSpacing: formatLetterSpacing(element, computedStyle.letterSpacing),
    element: element.tagName.toLowerCase(),
    text:
      element.textContent.slice(0, 20) +
      (element.textContent.length > 20 ? '...' : ''),
    _isFromElementSelection: true, // Add flag indicating this is from element selection
    _sourceUrl: window.location.href, // Add current URL to the data
    timestamp: Date.now(), // Add timestamp for freshness checking
  }

  // Get color data
  const colorData = {
    text: computedStyle.color,
    background: computedStyle.backgroundColor,
    border: computedStyle.borderColor,
    element: element.tagName.toLowerCase(),
    _isFromElementSelection: true, // Add flag indicating this is from element selection
    _sourceUrl: window.location.href, // Add current URL to the data
    timestamp: Date.now(), // Add timestamp for freshness checking
  }

  console.log(
    'Element selected:',
    element.tagName,
    'with font family:',
    fontData.family
  )

  // Try multiple approaches to ensure data is captured
  try {
    // SET THE FLAG before sending the message - use chrome.storage instead of localStorage
    chrome.storage.local.set({ pendingElementSelection: true }, function () {
      console.log('Flag set for pending element selection')
    })

    // Send to background script
    chrome.runtime.sendMessage(
      {
        action: 'elementSelected',
        fontData: fontData,
        colorData: colorData,
        reopenPopup: true, // Signal to reopen the popup
      },
      function (response) {
        // Response handling code...
      }
    )
  } catch (error) {
    console.error('Error in element selection:', error)
  }

  // Deactivate picker mode
  pickerActive = false
  document.removeEventListener('mouseover', highlightElement)
  document.removeEventListener('click', selectElement)
  document.removeEventListener('keydown', cancelPicker)
  document.body.classList.remove('picker-active')
  removeHighlight()

  // Remove the indicator
  const indicator = document.getElementById('element-picker-indicator')
  if (indicator) {
    indicator.remove()
  }
}

// Helper function to format line-height
function formatLineHeight(lineHeight) {
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

// Helper function to format letter-spacing with precision
function formatLetterSpacing(element, letterSpacing) {
  if (!letterSpacing) return ''

  // If "normal", return 0px
  if (letterSpacing === 'normal') return '0px'

  // For em values, convert based on the element's font size
  if (letterSpacing.includes('em')) {
    const emMatch = letterSpacing.match(/([-]?\d+(\.\d+)?)em/)
    if (emMatch) {
      const emValue = parseFloat(emMatch[1])

      // Get the computed font size of the element in pixels
      const computedStyle = window.getComputedStyle(element)
      const fontSizeStr = computedStyle.fontSize
      const fontSizeMatch = fontSizeStr.match(/(\d+(\.\d+)?)px/)
      const fontSize = fontSizeMatch ? parseFloat(fontSizeMatch[1]) : 16

      // Calculate pixel value from em - keep decimal precision
      const pxValue = emValue * fontSize

      // Format to 1 decimal place for display
      return pxValue.toFixed(1) + 'px'
    }
  }

  // Handle regular px values without rounding
  if (letterSpacing.includes('px')) {
    const pxMatch = letterSpacing.match(/([-]?\d+(\.\d+)?)px/)
    if (pxMatch) {
      const pxValue = parseFloat(pxMatch[1])

      // Format to 1 decimal place for display
      return pxValue.toFixed(1) + 'px'
    }
  }

  // If it's a number without units, assume px
  const numberMatch = letterSpacing.match(/([-]?\d+(\.\d+)?)/)
  if (numberMatch) {
    const value = parseFloat(numberMatch[1])

    // Format to 1 decimal place
    return value.toFixed(1) + 'px'
  }

  // If all else fails, return the original
  return letterSpacing
}

// Detect the actual font being used
function getActualFontFamily(element) {
  // Get the full font-family stack from computed style
  const fontFamily = window.getComputedStyle(element).fontFamily

  // Create a test span element
  const testSpan = document.createElement('span')
  testSpan.style.visibility = 'hidden'
  testSpan.style.position = 'absolute'
  testSpan.style.fontSize = '72px' // Larger font size to better compare widths
  testSpan.textContent = 'mmmmmmmmmmlli' // Text with different widths in different fonts
  document.body.appendChild(testSpan)

  // Parse font-family stack (handles quotes and commas correctly)
  const fonts = fontFamily.split(',').map((font) => {
    // Remove quotes and trim whitespace
    return font.trim().replace(/['"]/g, '')
  })

  // Measure with each font in the stack to find which one is actually rendering
  let actualFont = fonts[0] // Default to first font if we can't determine
  let originalWidth

  // First, measure with the actual computed font-family to get baseline
  testSpan.style.fontFamily = fontFamily
  originalWidth = testSpan.getBoundingClientRect().width

  // Check each font individually
  for (const font of fonts) {
    testSpan.style.fontFamily = font
    const width = testSpan.getBoundingClientRect().width

    // If width matches original, this is likely the font being used
    if (Math.abs(width - originalWidth) < 0.5) {
      actualFont = font
      break
    }
  }

  // Clean up
  document.body.removeChild(testSpan)

  return actualFont
}

// Analyze fonts on the page
async function analyzeFonts() {
  try {
    // Find body text
    const bodyElements = document.querySelectorAll(
      'p, div:not(:empty), span:not(:empty), li:not(:empty)'
    )
    let bodyFontFamily = ''
    let bodyStyle = ''
    let bodyWeight = ''
    let bodySize = ''
    let bodyLineHeight = ''

    if (bodyElements.length > 0) {
      // Filter to get elements that actually contain text
      const textElements = Array.from(bodyElements).filter((el) => {
        // Check if element contains actual text content, not just whitespace
        const text = el.textContent.trim()
        return text.length > 10 // Element should have a reasonable amount of text
      })

      if (textElements.length > 0) {
        // Sort by content length to prioritize elements with more text
        textElements.sort((a, b) => b.textContent.length - a.textContent.length)

        // Get the element with the most text content (likely a main paragraph)
        const mainTextElement = textElements[0]
        const computedStyle = window.getComputedStyle(mainTextElement)

        bodyFontFamily = getActualFontFamily(mainTextElement)
        bodyStyle = computedStyle.fontStyle
        bodyWeight = computedStyle.fontWeight
        bodySize = computedStyle.fontSize
        bodyLineHeight = formatLineHeight(computedStyle.lineHeight)
      }
    }

    return {
      body: {
        family: bodyFontFamily || 'Not found',
        style: bodyStyle || 'normal',
        weight: bodyWeight || '400',
        size: bodySize || '16px',
        lineHeight: bodyLineHeight || '24px',
        _isFromElementSelection: false, // Indicate this is NOT from element selection
      },
    }
  } catch (error) {
    console.error('Error in analyzeFonts:', error)
    // Return fallback data
    return {
      body: {
        family: 'Error analyzing',
        style: 'normal',
        weight: '400',
        size: '16px',
        lineHeight: '24px',
        _isFromElementSelection: false, // Indicate this is NOT from element selection
      },
    }
  }
}

// New function to specifically analyze body font with the accurate method
async function analyzeBodyFont() {
  try {
    // Find actual body text elements
    const bodyElements = document.querySelectorAll(
      'p, article p, main p, .content p, .main-content p, #content p, .article p'
    )

    let bodyFontData = {
      family: 'Default font',
      style: 'normal',
      weight: '400',
      size: '16px',
      lineHeight: '24px',
    }

    // If no specific elements found, try a broader selection
    if (bodyElements.length === 0) {
      console.log('No specific body elements found, checking broader selectors')
      const allParagraphs = document.querySelectorAll('p')

      if (allParagraphs.length > 0) {
        // Sort by content length to prioritize elements with more text
        const textElements = Array.from(allParagraphs).filter((el) => {
          const text = el.textContent.trim()
          return text.length > 20 // Element should have a reasonable amount of text
        })

        if (textElements.length > 0) {
          // Sort by content length to prioritize elements with more text
          textElements.sort(
            (a, b) => b.textContent.length - a.textContent.length
          )

          // Get the element with the most text content (likely a main paragraph)
          const mainTextElement = textElements[0]

          // Get computed styles
          const computedStyle = window.getComputedStyle(mainTextElement)

          // Get font data, using the more accurate getActualFontFamily function
          bodyFontData = {
            family: getActualFontFamily(mainTextElement),
            style: computedStyle.fontStyle,
            weight: computedStyle.fontWeight,
            size: computedStyle.fontSize,
            lineHeight: formatLineHeight(computedStyle.lineHeight || ''),
            letterSpacing: formatLetterSpacing(
              mainTextElement,
              computedStyle.letterSpacing
            ),
            isAccurate: true, // Flag indicating this used the accurate method
          }
        }
      }
    } else {
      // Filter to get elements that actually contain text
      const textElements = Array.from(bodyElements).filter((el) => {
        // Check if element contains actual text content, not just whitespace
        const text = el.textContent.trim()
        return text.length > 20 // Element should have a reasonable amount of text
      })

      if (textElements.length > 0) {
        // Sort by content length to prioritize elements with more text
        textElements.sort((a, b) => b.textContent.length - a.textContent.length)

        // Get the element with the most text content (likely a main paragraph)
        const mainTextElement = textElements[0]

        // Get computed styles
        const computedStyle = window.getComputedStyle(mainTextElement)

        // Get font data, using the more accurate getActualFontFamily function
        bodyFontData = {
          family: getActualFontFamily(mainTextElement),
          style: computedStyle.fontStyle,
          weight: computedStyle.fontWeight,
          size: computedStyle.fontSize,
          lineHeight: formatLineHeight(computedStyle.lineHeight || ''),
          letterSpacing: formatLetterSpacing(
            mainTextElement,
            computedStyle.letterSpacing
          ),
          isAccurate: true, // Flag indicating this used the accurate method
        }
      }
    }

    // If still no specific elements found, fall back to the body element
    if (!bodyFontData.isAccurate) {
      console.log('Falling back to body element')
      const bodyElement = document.body
      const computedStyle = window.getComputedStyle(bodyElement)

      bodyFontData = {
        family: getActualFontFamily(bodyElement),
        style: computedStyle.fontStyle,
        weight: computedStyle.fontWeight,
        size: computedStyle.fontSize,
        lineHeight: formatLineHeight(computedStyle.lineHeight || ''),
        letterSpacing: formatLetterSpacing(
          bodyElement,
          computedStyle.letterSpacing
        ),
        isAccurate: true, // Flag indicating this used the accurate method
      }
    }

    return bodyFontData
  } catch (error) {
    console.error('Error in analyzeBodyFont:', error)
    // Return fallback data
    return {
      family: 'Error analyzing',
      style: 'normal',
      weight: '400',
      size: '16px',
      lineHeight: '24px',
      letterSpacing: '0px',
      isAccurate: false,
    }
  }
}

// Analyze colors with support for animations and delayed content
async function analyzeColors() {
  try {
    // Store initial results
    let results = await performColorAnalysis()

    // Add flag to indicate this is NOT from element selection
    results._isFromElementSelection = false

    return results
  } catch (error) {
    console.error('Error in analyzeColors:', error)
    return {
      all: [],
      background: [],
      text: [],
      border: [],
      _isFromElementSelection: false, // Indicate this is NOT from element selection
    }
  }
}

// Main color analysis function
async function performColorAnalysis() {
  const allColors = []
  const backgroundColors = []
  const textColors = []
  const borderColors = []

  // Get all elements in the DOM
  const elements = document.querySelectorAll('*')

  // Process each element
  elements.forEach((element) => {
    // Skip elements created by our extension
    if (element.getAttribute('data-extension-element') === 'true') {
      return
    }
    // Skip elements without dimensions
    const rect = element.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
      return
    }

    // Get computed style
    const computedStyle = window.getComputedStyle(element)

    // Skip invisible elements
    if (
      computedStyle.display === 'none' ||
      computedStyle.visibility === 'hidden' ||
      parseFloat(computedStyle.opacity) <= 0.05
    ) {
      return
    }

    // 1. BACKGROUND COLOR
    const bgColor = computedStyle.backgroundColor
    if (
      bgColor &&
      bgColor !== 'rgba(0, 0, 0, 0)' &&
      bgColor !== 'transparent'
    ) {
      // Only include if element has a reasonable size
      const area = rect.width * rect.height
      if (area >= 25) {
        // At least 5x5 pixels
        backgroundColors.push(bgColor)
        allColors.push(bgColor)
      }
    }

    // 2. TEXT COLOR
    const textColor = computedStyle.color
    if (
      textColor &&
      textColor !== 'rgba(0, 0, 0, 0)' &&
      textColor !== 'transparent'
    ) {
      // Check if element has visible text content
      const text = element.innerText || element.textContent
      const hasText = text && text.trim().length > 0

      // Check if text would be visible (non-zero font size)
      const fontSize = parseFloat(computedStyle.fontSize)

      if (hasText && fontSize > 0) {
        textColors.push(textColor)
        allColors.push(textColor)
      }
    }

    // 3. BORDER COLOR
    // Check each border side individually
    ;[
      {
        color: computedStyle.borderTopColor,
        width: parseFloat(computedStyle.borderTopWidth),
        style: computedStyle.borderTopStyle,
      },
      {
        color: computedStyle.borderRightColor,
        width: parseFloat(computedStyle.borderRightWidth),
        style: computedStyle.borderRightStyle,
      },
      {
        color: computedStyle.borderBottomColor,
        width: parseFloat(computedStyle.borderBottomWidth),
        style: computedStyle.borderBottomStyle,
      },
      {
        color: computedStyle.borderLeftColor,
        width: parseFloat(computedStyle.borderLeftWidth),
        style: computedStyle.borderLeftStyle,
      },
    ].forEach((border) => {
      if (
        border.color &&
        border.color !== 'rgba(0, 0, 0, 0)' &&
        border.color !== 'transparent' &&
        border.width > 0 &&
        border.style !== 'none'
      ) {
        borderColors.push(border.color)
        allColors.push(border.color)
      }
    })
  })

  // Check major container elements too
  const mainElements = [
    document.body,
    document.querySelector('main'),
    document.querySelector('header'),
    document.querySelector('footer'),
    document.querySelector('.container'),
    document.querySelector('#content'),
  ].filter((el) => el !== null)

  mainElements.forEach((element) => {
    const style = window.getComputedStyle(element)

    // Add main background colors
    const bgColor = style.backgroundColor
    if (
      bgColor &&
      bgColor !== 'rgba(0, 0, 0, 0)' &&
      bgColor !== 'transparent'
    ) {
      backgroundColors.push(bgColor)
      allColors.push(bgColor)
    }

    // Add main text colors
    const textColor = style.color
    if (
      textColor &&
      textColor !== 'rgba(0, 0, 0, 0)' &&
      textColor !== 'transparent'
    ) {
      textColors.push(textColor)
      allColors.push(textColor)
    }
  })

  return {
    all: allColors,
    background: backgroundColors,
    text: textColors,
    border: borderColors,
    _isFromElementSelection: false, // Indicate this is NOT from element selection
  }
}

// Smooth scrolling with minimal pause at bottom
async function autoScrollPageForColorAnalysis() {
  console.log('Starting smooth auto-scroll for comprehensive color analysis...')

  // Get total scrollable height
  const totalHeight = Math.max(
    document.body.scrollHeight,
    document.body.offsetHeight,
    document.documentElement.clientHeight,
    document.documentElement.scrollHeight,
    document.documentElement.offsetHeight
  )

  // Create a visual indicator that scrolling is happening
  const indicator = document.createElement('div')
  indicator.setAttribute('data-extension-element', 'true') // Add this line
  indicator.style.position = 'fixed'
  indicator.style.right = '20px'
  indicator.style.bottom = '20px'
  indicator.style.backgroundColor = '#1448FF'
  indicator.style.color = 'white'
  indicator.style.padding = '8px 12px'
  indicator.style.borderRadius = '4px'
  indicator.style.zIndex = '999999'
  indicator.style.fontFamily = 'Arial, sans-serif'
  indicator.style.fontSize = '14px'
  indicator.textContent = 'Kleuren scannen...'
  document.body.appendChild(indicator)

  try {
    // Configure animation parameters
    const scrollDuration = 2000 // Total time to scroll down in ms
    const returnDuration = 1500 // Total time to scroll back up in ms
    const bottomPause = 300 // Shorter pause at bottom (just enough to capture colors)
    const initialPosition = window.scrollY

    // Update the reportProgress function in autoScrollPageForColorAnalysis
    const reportProgress = (percent) => {
      const roundedPercent = Math.round(percent) // Round to whole number
      chrome.runtime.sendMessage({
        action: 'colorScanProgress',
        progress: Math.min(roundedPercent, 100),
      })
      indicator.textContent = `Kleuren scannen: ${Math.min(
        roundedPercent,
        100
      )}%`
    }

    // Easing function for smoother animation
    function easeInOutCubic(x) {
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
    }

    // Combined smooth scroll down, brief pause, then up - all in one animation
    const smoothScrollDownAndUp = () => {
      return new Promise((resolve) => {
        const startTime = performance.now()
        const totalDuration = scrollDuration + bottomPause + returnDuration

        // Animate scrolling
        const scrollStep = (timestamp) => {
          const elapsed = timestamp - startTime
          const totalProgress = Math.min(elapsed / totalDuration, 1)

          // Calculate which phase we're in
          if (totalProgress <= scrollDuration / totalDuration) {
            // Phase 1: Scrolling down
            const downProgress = elapsed / scrollDuration
            const easedProgress = easeInOutCubic(downProgress)

            // Calculate position
            const targetPosition =
              initialPosition + (totalHeight - initialPosition) * easedProgress

            // Scroll to position
            window.scrollTo(0, targetPosition)
            document.documentElement.scrollTop = targetPosition

            // Report progress (0-45%)
            reportProgress(downProgress * 45)
          } else if (
            totalProgress <=
            (scrollDuration + bottomPause) / totalDuration
          ) {
            // Phase 2: Brief pause at bottom - do nothing with scrolling
            // But still update progress from 45-55%
            const pauseProgress = (elapsed - scrollDuration) / bottomPause
            reportProgress(45 + pauseProgress * 10)

            // Trigger a color analysis while at the bottom (async but no waiting)
            if (pauseProgress > 0.5 && pauseProgress < 0.6) {
              performColorAnalysis().then((colors) => {
                chrome.runtime.sendMessage({
                  action: 'colorUpdateDuringScroll',
                  colors: colors,
                  progress: 50,
                })
              })
            }
          } else {
            // Phase 3: Scrolling up
            const upElapsed = elapsed - scrollDuration - bottomPause
            const upProgress = upElapsed / returnDuration
            const easedUpProgress = easeInOutCubic(upProgress)

            // Calculate position for scrolling up
            const targetPosition = totalHeight * (1 - easedUpProgress)

            // Scroll to position
            window.scrollTo(0, targetPosition)
            document.documentElement.scrollTop = targetPosition

            // Report progress (55-100%)
            reportProgress(55 + upProgress * 45)
          }

          // Continue animation if not complete
          if (totalProgress < 1) {
            window.requestAnimationFrame(scrollStep)
          } else {
            // Wait a moment for final analysis at top
            setTimeout(resolve, 300)
          }
        }

        // Start animation
        window.requestAnimationFrame(scrollStep)
      })
    }

    // First scan at current position
    let colors = await performColorAnalysis()

    // Perform the smooth scrolling
    console.log('Smoothly scrolling down and up...')
    await smoothScrollDownAndUp()

    // Final scan at top
    console.log('Performing final color scan...')
    const finalColors = await performColorAnalysis()

    // Remove the indicator
    document.body.removeChild(indicator)

    // Report complete
    chrome.runtime.sendMessage({
      action: 'colorScanComplete',
      colors: finalColors,
      progress: 100,
    })

    console.log('Smooth auto-scroll color analysis complete')
    return finalColors
  } catch (error) {
    console.error('Error during auto-scroll:', error)

    // Clean up
    if (document.body.contains(indicator)) {
      document.body.removeChild(indicator)
    }

    // Return to top
    window.scrollTo({ top: 0, behavior: 'smooth' })

    // Report error
    chrome.runtime.sendMessage({
      action: 'colorScanComplete',
      error: error.message,
      progress: 100,
    })

    // Return any colors we managed to collect
    return await performColorAnalysis()
  }
}

// Merge color results, avoiding duplicates
function mergeColorResults(originalData, newData) {
  const result = {
    all: [...originalData.all],
    background: [...originalData.background],
    text: [...originalData.text],
    border: [...originalData.border],
  }

  // Add new colors to each category
  for (const category of ['background', 'text', 'border']) {
    for (const color of newData[category]) {
      if (!result[category].includes(color)) {
        result[category].push(color)
        if (!result.all.includes(color)) {
          result.all.push(color)
        }
      }
    }
  }

  return result
}

// Helper function to check if an element is likely obscured by other elements
function isElementObscured(element) {
  // This is a simplified check that catches common cases
  // A full check would require more complex z-index and stacking context evaluation

  const rect = element.getBoundingClientRect()
  const computedStyle = window.getComputedStyle(element)

  // Check for elements that would block this element
  if (parseFloat(computedStyle.opacity) <= 0.1) {
    return true // Nearly transparent elements are effectively obscured
  }

  // If element is tiny, check if it might be hidden by other content
  if (rect.width < 3 || rect.height < 3) {
    // Very small elements are often not meaningfully visible
    return true
  }

  // For complex web apps, we could check for overlapping elements with higher z-index
  // But that would be performance intensive, so we use simple heuristics

  return false
}

// Helper function to collect dominant colors by weighting elements by size
function collectDominantColors(elements) {
  try {
    // Create a map to track colors and their visual importance
    const colorWeights = new Map()

    // Process elements to weight colors by their visual area
    for (const element of elements) {
      const rect = element.getBoundingClientRect()
      const area = rect.width * rect.height

      // Only consider elements with significant visual area
      if (area > 1000) {
        // Larger threshold for "dominant" colors
        const style = window.getComputedStyle(element)

        // Check if element is visible
        if (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          parseFloat(style.opacity) > 0.1
        ) {
          // Extract background color
          const bgColor = style.backgroundColor
          if (
            bgColor &&
            bgColor !== 'rgba(0, 0, 0, 0)' &&
            bgColor !== 'transparent'
          ) {
            // Weight color by area and update in the map
            const currentWeight = colorWeights.get(bgColor) || 0
            colorWeights.set(bgColor, currentWeight + area)
          }
        }
      }
    }

    // Convert to array and sort by weight descending
    const weightedColors = Array.from(colorWeights.entries())
      .sort((a, b) => b[1] - a[1])
      .map((entry) => entry[0])

    // Return the top dominant colors (limit to 10)
    return weightedColors.slice(0, 10)
  } catch (error) {
    console.error('Error collecting dominant colors:', error)
    return []
  }
}

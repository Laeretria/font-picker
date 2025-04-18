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
    indicatorDiv.textContent = 'Element Picker Active (ESC to cancel)'
    indicatorDiv.style.position = 'fixed'
    indicatorDiv.style.top = '10px'
    indicatorDiv.style.right = '10px'
    indicatorDiv.style.backgroundColor = 'rgba(0, 123, 255, 0.9)'
    indicatorDiv.style.color = 'white'
    indicatorDiv.style.padding = '5px 10px'
    indicatorDiv.style.borderRadius = '4px'
    indicatorDiv.style.zIndex = '9999999'
    indicatorDiv.style.fontSize = '12px'
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

// Highlight element on hover
function highlightElement(e) {
  e.preventDefault()
  e.stopPropagation()

  // Remove previous highlight
  removeHighlight()

  // Add highlight to current element
  highlightedElement = e.target

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

// Select element on click
function selectElement(e) {
  e.preventDefault()
  e.stopPropagation()

  // Get computed styles of selected element
  const element = e.target
  const computedStyle = window.getComputedStyle(element)

  // Get font data
  const fontData = {
    family: getActualFontFamily(element),
    style: computedStyle.fontStyle,
    weight: computedStyle.fontWeight,
    size: computedStyle.fontSize,
    lineHeight: computedStyle.lineHeight,
    element: element.tagName.toLowerCase(),
    text:
      element.textContent.slice(0, 20) +
      (element.textContent.length > 20 ? '...' : ''),
  }

  // Get color data
  const colorData = {
    text: computedStyle.color,
    background: computedStyle.backgroundColor,
    border: computedStyle.borderColor,
    element: element.tagName.toLowerCase(),
    text:
      element.textContent.slice(0, 20) +
      (element.textContent.length > 20 ? '...' : ''),
  }

  console.log(
    'Element selected:',
    element.tagName,
    'with font family:',
    fontData.family
  )

  // Try multiple approaches to ensure data is captured
  try {
    // 1. First try sending to background script
    chrome.runtime.sendMessage(
      {
        action: 'elementSelected',
        fontData: fontData,
        colorData: colorData,
        reopenPopup: true, // Signal to reopen the popup
      },
      function (response) {
        if (chrome.runtime.lastError) {
          console.error(
            'Error sending to background:',
            chrome.runtime.lastError
          )

          // 2. Fallback: Try alerting the user
          try {
            // Create a floating message that element was selected
            const message = document.createElement('div')
            message.textContent =
              'Element selected! Click the extension icon to see details.'
            message.style.position = 'fixed'
            message.style.top = '20px'
            message.style.left = '50%'
            message.style.transform = 'translateX(-50%)'
            message.style.backgroundColor = 'rgba(0, 123, 255, 0.9)'
            message.style.color = 'white'
            message.style.padding = '10px 20px'
            message.style.borderRadius = '4px'
            message.style.zIndex = '9999999'
            message.style.fontSize = '14px'
            message.style.fontFamily = 'Arial, sans-serif'

            document.body.appendChild(message)

            // Remove after 5 seconds
            setTimeout(() => {
              if (message.parentNode) {
                message.parentNode.removeChild(message)
              }
            }, 5000)
          } catch (err) {
            console.error('Error showing message:', err)
          }
        } else {
          console.log('Element data sent successfully')
        }
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

// Cancel picker on ESC key
function cancelPicker(e) {
  if (e.key === 'Escape') {
    toggleElementPicker()

    // Notify the popup that picker has been canceled
    chrome.runtime.sendMessage({
      action: 'pickerCanceled',
    })
  }
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
    // Find heading elements
    const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
    let headingFontFamily = ''

    if (headingElements.length > 0) {
      headingFontFamily = getActualFontFamily(headingElements[0])
    }

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
        bodyLineHeight = computedStyle.lineHeight
      }
    }

    return {
      heading: {
        family: headingFontFamily || 'Not found',
      },
      body: {
        family: bodyFontFamily || 'Not found',
        style: bodyStyle || 'normal',
        weight: bodyWeight || '400',
        size: bodySize || '16px',
        lineHeight: bodyLineHeight || '24px',
      },
    }
  } catch (error) {
    console.error('Error in analyzeFonts:', error)
    // Return fallback data
    return {
      heading: { family: 'Error analyzing' },
      body: {
        family: 'Error analyzing',
        style: 'normal',
        weight: '400',
        size: '16px',
        lineHeight: '24px',
      },
    }
  }
}

// Analyze colors on the page
async function analyzeColors() {
  try {
    const allColors = []
    const backgroundColors = []
    const textColors = []
    const borderColors = []

    // Get all elements
    const elements = document.querySelectorAll('*')

    elements.forEach((element) => {
      const computedStyle = window.getComputedStyle(element)

      // Get background color
      const bgColor = computedStyle.backgroundColor
      if (
        bgColor &&
        bgColor !== 'rgba(0, 0, 0, 0)' &&
        bgColor !== 'transparent'
      ) {
        backgroundColors.push(bgColor)
        allColors.push(bgColor)
      }

      // Get text color
      const textColor = computedStyle.color
      if (textColor) {
        textColors.push(textColor)
        allColors.push(textColor)
      }

      // Get border color
      const borderColor = computedStyle.borderColor
      if (
        borderColor &&
        borderColor !== 'rgba(0, 0, 0, 0)' &&
        borderColor !== 'transparent'
      ) {
        borderColors.push(borderColor)
        allColors.push(borderColor)
      }
    })

    // Return unique colors
    return {
      all: allColors,
      background: backgroundColors,
      text: textColors,
      border: borderColors,
    }
  } catch (error) {
    console.error('Error in analyzeColors:', error)
    // Return fallback data
    return {
      all: [],
      background: [],
      text: [],
      border: [],
    }
  }
}

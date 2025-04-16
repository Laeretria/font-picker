// Variables to store state
let pickerActive = false;
let highlightedElement = null;

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "togglePicker") {
        toggleElementPicker();
        return true;
    } else if (request.action === "analyzeFonts") {
        analyzeFonts().then(result => {
            sendResponse({fonts: result});
        });
        return true; // Keep the message channel open for async response
    } else if (request.action === "analyzeColors") {
        analyzeColors().then(result => {
            sendResponse({colors: result});
        });
        return true; // Keep the message channel open for async response
    }
});

// Toggle element picker
function toggleElementPicker() {
    pickerActive = !pickerActive;
    
    if (pickerActive) {
        // Add event listeners when picker is activated
        document.addEventListener('mouseover', highlightElement);
        document.addEventListener('click', selectElement);
        document.addEventListener('keydown', cancelPicker);
        document.body.classList.add('picker-active');
    } else {
        // Remove event listeners when picker is deactivated
        document.removeEventListener('mouseover', highlightElement);
        document.removeEventListener('click', selectElement);
        document.removeEventListener('keydown', cancelPicker);
        document.body.classList.remove('picker-active');
        removeHighlight();
    }
}

// Highlight element on hover
function highlightElement(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Remove previous highlight
    removeHighlight();
    
    // Add highlight to current element
    highlightedElement = e.target;
    highlightedElement.classList.add('inspector-highlight');
}

// Remove highlight
function removeHighlight() {
    if (highlightedElement) {
        highlightedElement.classList.remove('inspector-highlight');
        highlightedElement = null;
    }
}

// Select element on click
function selectElement(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Get computed styles of selected element
    const element = e.target;
    const computedStyle = window.getComputedStyle(element);
    
    // Get font data
    const fontData = {
        family: computedStyle.fontFamily.split(',')[0].replace(/['"]/g, ''),
        style: computedStyle.fontStyle,
        weight: computedStyle.fontWeight,
        size: computedStyle.fontSize,
        lineHeight: computedStyle.lineHeight
    };
    
    // Get color data
    const colorData = {
        text: computedStyle.color,
        background: computedStyle.backgroundColor,
        border: computedStyle.borderColor
    };
    
    // Send data to popup
    chrome.runtime.sendMessage({
        action: "elementSelected",
        fontData: fontData,
        colorData: colorData
    });
    
    // Deactivate picker
    toggleElementPicker();
}

// Cancel picker on ESC key
function cancelPicker(e) {
    if (e.key === 'Escape') {
        toggleElementPicker();
    }
}

// Analyze fonts on the page
async function analyzeFonts() {
    // Find heading elements
    const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let headingFontFamily = '';
    
    if (headingElements.length > 0) {
        const computedStyle = window.getComputedStyle(headingElements[0]);
        headingFontFamily = computedStyle.fontFamily.split(',')[0].replace(/['"]/g, '');
    }
    
    // Find body text
    const bodyElements = document.querySelectorAll('p, div, span, li');
    let bodyFontFamily = '';
    let bodyStyle = '';
    let bodyWeight = '';
    let bodySize = '';
    let bodyLineHeight = '';
    
    if (bodyElements.length > 0) {
        const computedStyle = window.getComputedStyle(bodyElements[0]);
        bodyFontFamily = computedStyle.fontFamily.split(',')[0].replace(/['"]/g, '');
        bodyStyle = computedStyle.fontStyle;
        bodyWeight = computedStyle.fontWeight;
        bodySize = computedStyle.fontSize;
        bodyLineHeight = computedStyle.lineHeight;
    }
    
    return {
        heading: {
            family: headingFontFamily || 'Not found'
        },
        body: {
            family: bodyFontFamily || 'Not found',
            style: bodyStyle || 'normal',
            weight: bodyWeight || '400',
            size: bodySize || '16px',
            lineHeight: bodyLineHeight || '24px'
        }
    };
}

// Analyze colors on the page
async function analyzeColors() {
    const allColors = [];
    const backgroundColors = [];
    const textColors = [];
    const borderColors = [];
    
    // Get all elements
    const elements = document.querySelectorAll('*');
    
    elements.forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        
        // Get background color
        const bgColor = computedStyle.backgroundColor;
        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            backgroundColors.push(bgColor);
            allColors.push(bgColor);
        }
        
        // Get text color
        const textColor = computedStyle.color;
        if (textColor) {
            textColors.push(textColor);
            allColors.push(textColor);
        }
        
        // Get border color
        const borderColor = computedStyle.borderColor;
        if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)' && borderColor !== 'transparent') {
            borderColors.push(borderColor);
            allColors.push(borderColor);
        }
    });
    
    // Return unique colors
    return {
        all: allColors,
        background: backgroundColors,
        text: textColors,
        border: borderColors
    };
}
// Font tab specific functionality

class FontTab {
    constructor() {
        // Font elements
        this.headingFontElement = document.getElementById('heading-font');
        this.bodyFontElement = document.getElementById('body-font');
        this.fontStyleElement = document.getElementById('font-style');
        this.fontWeightElement = document.getElementById('font-weight');
        this.fontSizeElement = document.getElementById('font-size');
        this.lineHeightElement = document.getElementById('line-height');
        this.fontPreviewElement = document.getElementById('font-preview');
        
        // Add copy buttons
        this.addCopyButtons();
        
        // Initialize
        this.initialize();
    }
    
    initialize() {
        // Set up event listeners
        this.setupEventListeners();
        
        // Initial analysis
        this.analyzeFonts();
    }
    
    setupEventListeners() {
        // Add event listeners for copy buttons and other interactions
        document.querySelectorAll('.copy-font-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const textToCopy = e.target.dataset.copy;
                this.copyToClipboard(textToCopy);
            });
        });
        
        // Format toggle buttons
        document.querySelectorAll('.format-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.format-option').forEach(opt => {
                    opt.classList.remove('active');
                });
                option.classList.add('active');
                // Potentially change the format display here
            });
        });
    }
    
    addCopyButtons() {
        // Add copy buttons to font inputs if they don't exist
        if (!document.querySelector('.copy-heading-font')) {
            const headingContainer = this.headingFontElement.parentElement;
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-font-btn copy-heading-font';
            copyBtn.textContent = 'Copy';
            copyBtn.dataset.copy = this.headingFontElement.value;
            headingContainer.appendChild(copyBtn);
        }
        
        if (!document.querySelector('.copy-body-font')) {
            const bodyContainer = this.bodyFontElement.parentElement;
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-font-btn copy-body-font';
            copyBtn.textContent = 'Copy';
            copyBtn.dataset.copy = this.bodyFontElement.value;
            bodyContainer.appendChild(copyBtn);
        }
    }
    
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            // Show a temporary success message
            const message = document.createElement('div');
            message.textContent = 'Copied!';
            message.style.position = 'absolute';
            message.style.color = 'white';
            message.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            message.style.padding = '5px 10px';
            message.style.borderRadius = '4px';
            message.style.fontSize = '12px';
            
            // Position near the mouse
            const x = event.clientX + 10;
            const y = event.clientY - 10;
            message.style.left = `${x}px`;
            message.style.top = `${y}px`;
            
            document.body.appendChild(message);
            
            // Remove after 1.5 seconds
            setTimeout(() => {
                document.body.removeChild(message);
            }, 1500);
        }).catch(err => {
            console.error('Could not copy text: ', err);
        });
    }
    
    analyzeFonts() {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "analyzeFonts"}, (response) => {
                if (response && response.fonts) {
                    this.updateFontUI(response.fonts);
                }
            });
        });
    }
    
    updateFontUI(fontData) {
        // Update heading font
        this.headingFontElement.value = fontData.heading.family || 'Unknown';
        document.querySelector('.copy-heading-font').dataset.copy = fontData.heading.family;
        
        // Update body font
        this.bodyFontElement.value = fontData.body.family || 'Unknown';
        document.querySelector('.copy-body-font').dataset.copy = fontData.body.family;
        
        // Update font properties
        this.fontStyleElement.textContent = fontData.body.style || 'normal';
        this.fontWeightElement.textContent = fontData.body.weight || '400';
        this.fontSizeElement.textContent = fontData.body.size || '16px';
        this.lineHeightElement.textContent = fontData.body.lineHeight || '24px';
        
        // Update font preview
        this.updateFontPreview(fontData.body);
    }
    
    updateFontPreview(fontData) {
        this.fontPreviewElement.style.fontFamily = fontData.family || 'sans-serif';
        this.fontPreviewElement.style.fontSize = fontData.size || '16px';
        this.fontPreviewElement.style.fontWeight = fontData.weight || '400';
        this.fontPreviewElement.style.fontStyle = fontData.style || 'normal';
        this.fontPreviewElement.style.lineHeight = fontData.lineHeight || '24px';
    }
    
    updateSelectedElementFontData(fontData) {
        // Update font properties for selected element
        this.fontStyleElement.textContent = fontData.style || 'normal';
        this.fontWeightElement.textContent = fontData.weight || '400';
        this.fontSizeElement.textContent = fontData.size || '16px';
        this.lineHeightElement.textContent = fontData.lineHeight || '24px';
        
        // Update font preview
        this.updateFontPreview(fontData);
    }
}

// Export the FontTab class
window.FontTab = FontTab;
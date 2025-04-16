// Main popup controller

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tab controllers
    let fontTab = null;
    let colorsTab = null;
    
    // Tab switching functionality
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all nav items and tab contents
            navItems.forEach(navItem => navItem.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked nav item and corresponding tab content
            const tabId = this.getAttribute('data-tab');
            this.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
            
            // Initialize the appropriate tab controller if not already done
            if (tabId === 'font' && !fontTab) {
                fontTab = new FontTab();
            } else if (tabId === 'colors' && !colorsTab) {
                colorsTab = new ColorsTab();
            }
        });
    });
    
    // Element picker functionality
    const elementPickerBtn = document.getElementById('element-picker-btn');
    elementPickerBtn.addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: "togglePicker"});
            window.close(); // Close popup to allow user to interact with the page
        });
    });
    
    // Initialize the default active tab
    const activeTabId = document.querySelector('.nav-item.active').getAttribute('data-tab');
    if (activeTabId === 'font') {
        fontTab = new FontTab();
    } else if (activeTabId === 'colors') {
        colorsTab = new ColorsTab();
    }
    
    // Listen for messages from content script
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === "elementSelected") {
            // Re-open the popup after element selection
            // Note: This doesn't actually work because the popup context is destroyed
            // We would need to store this data in background.js or localStorage
            
            if (request.fontData && fontTab) {
                fontTab.updateSelectedElementFontData(request.fontData);
            }
            if (request.colorData && colorsTab) {
                colorsTab.updateSelectedElementColorData(request.colorData);
            }
        }
    });
});
// Background script for Font & Color Inspector

// Listen for extension installation
chrome.runtime.onInstalled.addListener(function() {
    console.log('Font & Color Inspector extension installed');
});

// Listen for extension icon click
chrome.action.onClicked.addListener(function(tab) {
    // This won't be triggered if default_popup is set in the manifest
    // But we can use it to handle programmatic clicks
});

// Relay messages between popup and content scripts if needed
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    // Handle any message routing here if needed
});
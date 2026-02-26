// background.js

// Initialize Context Menu on Install
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: "frame-shot",
      title: "Frame this Shot",
      contexts: ["page"]
    });
  });
  
  // Function to handle the capture and redirection
  function captureAndEdit(tab) {
    // Prevent capturing the extension itself or chrome:// pages
    if (tab.url.startsWith("chrome-extension://") || tab.url.startsWith("chrome://")) {
      console.log("Cannot capture this page.");
      return; 
    }
  
    chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error("Capture failed:", chrome.runtime.lastError.message);
        return;
      }
      
      chrome.storage.local.set({ screenshot: dataUrl }, () => {
        chrome.tabs.create({ url: "editor.html" });
      });
    });
  }
  
  // Listener for the Extension Icon Click (Action)
  chrome.action.onClicked.addListener((tab) => {
    captureAndEdit(tab);
  });
  
  // Listener for the Context Menu Click
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "frame-shot") {
      captureAndEdit(tab);
    }
  });
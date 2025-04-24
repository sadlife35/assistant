// Check if we're in the extensions gallery
if (window.location.href.startsWith('chrome://extensions')) {
    console.log('Skipping execution in extensions gallery');
  } else {
    // Initialize extension
    chrome.runtime.onInstalled.addListener(() => {
      console.log('Extension installed');
    });
  
    // Safe message handling with existence checks
    function handleMessage(request, sender, sendResponse) {
      if (!chrome.runtime?.id) {
        console.warn('Extension context invalid');
        return;
      }
      
      console.log('Message received:', request);
      sendResponse({status: 'success'});
      return true; // Keep the message channel open for async response
    }
  
    // Only add listener if runtime is available
    if (chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(handleMessage);
    } else {
      console.warn('chrome.runtime.onMessage not available');
    }
  
    // Connection-based messaging with error handling
    chrome.runtime.onConnect.addListener((port) => {
      console.assert(port.name === 'content-script');
      
      port.onMessage.addListener((msg) => {
        console.log('Port message:', msg);
      });
  
      port.onDisconnect.addListener(() => {
        console.log('Port disconnected');
      });
    });
  }
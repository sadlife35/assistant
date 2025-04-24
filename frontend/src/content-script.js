// Content Script - Handles voice interaction on web pages
console.log("Content script loaded");

// Check if we're on a chrome:// URL
if (!window.location.href.startsWith('chrome://')) {
  // Initialize voice recognition
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
      
      if (event.results[0].isFinal) {
        chrome.runtime.sendMessage({
          type: "TRANSCRIPT",
          text: transcript
        });
      }
    };
    
    chrome.storage.local.get(['voiceEnabled'], (result) => {
      if (result.voiceEnabled) {
        recognition.start();
      }
    });
  }
}
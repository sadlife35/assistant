import React, { useState, useEffect } from 'react';
import './VoiceAssistant.css';

const VoiceAssistant = () => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');

  const handleListen = () => {
    setListening(!listening);
    chrome.runtime.sendMessage({
      type: "TOGGLE_VOICE",
      state: !listening
    });
  };

  useEffect(() => {
    chrome.runtime.onMessage.addListener((request) => {
      if (request.type === "TRANSCRIPT") {
        setTranscript(request.text);
        // Process with your backend API
        fetch('http://localhost:5000/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: request.text })
        })
        .then(res => res.json())
        .then(data => {
          setResponse(data.response);
          chrome.runtime.sendMessage({
            type: "SPEECH",
            text: data.response
          });
        });
      }
    });
  }, []);

  return (
    <div className="voice-assistant">
      <button 
        onClick={handleListen}
        className={listening ? 'listening' : ''}
      >
        {listening ? 'Stop Listening' : 'Start Listening'}
      </button>
      <div className="transcript">{transcript}</div>
      <div className="response">{response}</div>
    </div>
  );
};

export default VoiceAssistant;
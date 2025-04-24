import { useState, useRef, useEffect } from 'react';

// API configuration
const API_CONFIG = {
  BASE_URL: 'http://localhost:8000',
  TIMEOUT: 30000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
};

// Emotion configuration matching backend
const EMOTION_CONFIG = {
  happy: {
    color: '#FFD166',
    icon: '😊',
    description: 'Cheerful and excited',
    speechStyle: { rate: 1.1, pitch: 1.1 }
  },
  sad: {
    color: '#6C8DFA',
    icon: '😔',
    description: 'Compassionate and comforting',
    speechStyle: { rate: 0.9, pitch: 0.9 }
  },
  playful: {
    color: '#FF9F1C',
    icon: '😄',
    description: 'Fun and joking',
    speechStyle: { rate: 1.15, pitch: 1.05 }
  },
  warm: {
    color: '#FFD166',
    icon: '💖',
    description: 'Friendly and caring',
    speechStyle: { rate: 1.0, pitch: 1.0 }
  },
  excited: {
    color: '#06D6A0',
    icon: '✨',
    description: 'Energetic and eager',
    speechStyle: { rate: 1.15, pitch: 1.15 }
  },
  default: {
    color: '#FFD166',
    icon: '💭',
    description: 'Friendly and attentive',
    speechStyle: { rate: 1.0, pitch: 1.0 }
  }
};

export default function NovaUI() {
  // State management
  const [status, setStatus] = useState('Ready');
  const [emotion, setEmotion] = useState('default');
  const [conversation, setConversation] = useState([]);
  const [isListening, setIsListening] = useState(false);
  
  // Removed unused states and keeping them in the component for future use
  const [userInput, setUserInput] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [connection, setConnection] = useState({
    backend: false,
    lastChecked: null
  });

  // Refs
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  // Handle user input (text or speech)
  const handleUserInput = async (inputText) => {
    if (!inputText.trim()) return;
    
    setUserInput(inputText);
    setIsListening(false);
    setStatus('Thinking...');
    
    try {
      // Call backend API
      const response = await fetch(`${API_CONFIG.BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: inputText,
          conversation_history: conversation
        })
      });
      
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      
      const data = await response.json();
      
      // Update conversation
      const updatedConversation = [
        ...conversation,
        { role: 'user', content: inputText },
        { role: 'assistant', content: data.text, emotion: data.emotion }
      ];
      
      setConversation(updatedConversation);
      setEmotion(data.emotion || 'default');
      setAiResponse(data.text);
      
      // Speak the response
      speakResponse(data.text, data.emotion);
      
    } catch (error) {
      setStatus('Error: ' + error.message);
      setTimeout(() => setStatus('Ready'), 3000);
    }
  };

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        handleUserInput(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        setStatus('Error: ' + event.error);
        setTimeout(() => setStatus('Ready'), 2000);
      };
    }

    // Check backend connection on mount
    checkBackendConnection();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check backend connection
  const checkBackendConnection = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/system-status`);
      const connected = response.ok;
      
      setConnection({
        backend: connected,
        lastChecked: new Date().toLocaleTimeString()
      });
      
      return connected;
    } catch (error) {
      setConnection({
        backend: false,
        lastChecked: new Date().toLocaleTimeString()
      });
      return false;
    }
  };

  // Start listening to user
  const startListening = async () => {
    if (isListening) return;
    
    setIsListening(true);
    setStatus('Listening started...');
    
    try {
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch (error) {
      setStatus('Error: ' + error.message);
      setIsListening(false);
      setTimeout(() => setStatus('Ready'), 2000);
    }
  };

  // Pause listening
  const pauseListening = () => {
    if (!isListening) return;
    
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    
    setIsListening(false);
    setStatus('Ready');
  };

  // Cancel interaction
  const cancelInteraction = () => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    
    setIsListening(false);
    setStatus('Ready');
  };

  // Speak the AI response
  const speakResponse = async (text, emotion) => {
    setStatus('Speaking...');
    
    try {
      // Get TTS from backend
      const response = await fetch(`${API_CONFIG.BASE_URL}/text-to-speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: text,
          emotion: emotion 
        })
      });
      
      if (!response.ok) throw new Error('TTS failed');
      
      const data = await response.json();
      
      // Play audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      
      audioRef.current = new Audio(`${API_CONFIG.BASE_URL}${data.audio_url}`);
      
      audioRef.current.onended = () => {
        setStatus('Ready');
      };
      
      audioRef.current.onerror = () => {
        setStatus('Audio error');
        setTimeout(() => setStatus('Ready'), 2000);
      };
      
      await audioRef.current.play();
      
    } catch (error) {
      setStatus('Speech error');
      setTimeout(() => setStatus('Ready'), 2000);
    }
  };

  // Display connection status indicator
  const renderConnectionStatus = () => {
    return (
      <div className={`connection-status ${connection.backend ? 'connection-online' : 'connection-offline'}`}>
        Backend: {connection.backend ? 'Connected' : 'Disconnected'}
        {connection.lastChecked && <span> (Last checked: {connection.lastChecked})</span>}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-white text-black">
      {/* Top navigation bar */}
      <div className="bg-gray-800 text-white p-2 flex items-center">
        <span className="font-bold mr-4">Nova Mic UI</span>
        <div className="flex space-x-4 ml-4">
          <button className="hover:bg-gray-700 px-2 py-1 rounded">Toggle Theme</button>
          <button className="hover:bg-gray-700 px-2 py-1 rounded">Toggle Fullscreen</button>
          <button className="hover:bg-gray-700 px-2 py-1 rounded">Mood</button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-between py-16">
        {/* Central avatar and status */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div 
            className={`w-32 h-32 rounded-full mb-6 avatar-container`}
            style={{ backgroundColor: EMOTION_CONFIG[emotion]?.color || EMOTION_CONFIG.default.color }}
            data-emotion-icon={EMOTION_CONFIG[emotion]?.icon || EMOTION_CONFIG.default.icon}
          ></div>
          <div className="text-lg font-medium">{status}</div>
          
          {/* Conversation */}
          <div className="mt-4 text-center max-w-md">
            {conversation.length > 0 ? (
              conversation.slice(-2).map((msg, index) => (
                <div key={index} className="my-2">
                  <span className="font-bold">{msg.role === 'user' ? 'You:' : 'Nova:'}</span> {msg.content}
                </div>
              ))
            ) : (
              <>
                <div className="my-2"><span className="font-bold">You:</span> Oh, no.</div>
                <div className="my-2"><span className="font-bold">Nova:</span> Hello, I'm Nova. Ready to help! ✨</div>
              </>
            )}
          </div>
          
          {isListening && (
            <div className="mt-4 text-center">
              <div className="status-indicator status-listening">Listening...</div>
              <div className="mood-indicator">Current emotion: {EMOTION_CONFIG[emotion]?.description || EMOTION_CONFIG.default.description}</div>
              
              {/* Optional: Audio visualization */}
              <div className="audio-wave">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="audio-bar" style={{ animationDelay: `${i * 0.1}s` }}></div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom control buttons */}
        <div className="flex justify-center space-x-8 mb-8">
          <button 
            onClick={pauseListening}
            className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center button-control"
            aria-label="Pause"
          >
            <div className="w-4 h-4 bg-gray-800"></div>
          </button>
          
          <button 
            onClick={startListening}
            className="w-12 h-12 rounded-full bg-yellow-300 flex items-center justify-center button-control"
            aria-label="Start Listening"
          >
            <span role="img" aria-label="Microphone">🎤</span>
          </button>
          
          <button 
            onClick={cancelInteraction}
            className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center button-control"
            aria-label="Cancel"
          >
            <div className="text-xl font-bold">×</div>
          </button>
        </div>
      </div>
      
      {/* Display connection status */}
      {renderConnectionStatus()}
    </div>
  );
}
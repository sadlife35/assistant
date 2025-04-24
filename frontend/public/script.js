// Initialize speech recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
// Initialize speech recognition with security checks
// Remove duplicate declaration since it's already defined above
if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    alert('Speech recognition requires HTTPS. Please use a secure connection.');
}
const recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;

// Initialize UI Elements first
const statusCircle = document.getElementById('status-circle');
const userTranscript = document.getElementById('user-transcript');
const response = document.getElementById('response');
const debug = document.getElementById('debug');
const moodIndicator = document.getElementById('mood-indicator');
const themeToggle = document.getElementById('theme-toggle');
const fullscreenToggle = document.getElementById('fullscreen-toggle');
const moodToggle = document.getElementById('mood-toggle');
const startButton = document.getElementById('circle-button');
const pauseButton = document.getElementById('square-button');
const exitButton = document.getElementById('x-button');

// Create style element
const style = document.createElement('style');
document.head.appendChild(style);

// Add styles
style.textContent = `
    .wave {
        animation: wave 1s infinite;
    }
    
    @keyframes wave {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }
    
    .dark-mode {
        background-color: #1a1a1a;
        color: #ffffff;
    }
    
    .dark-mode .nav-item {
        color: #ffffff;
    }
    
    .listening {
        background-color: #22c55e;
    }

    #subtitle-container {
        position: relative;
        margin: 20px auto;
        width: 80%;
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        font-size: 18px;
        text-align: center;
        min-height: 60px;
        display: none;
    }
`;

// Create subtitle container after styles
const subtitleContainer = document.createElement('div');
subtitleContainer.id = 'subtitle-container';
document.body.appendChild(subtitleContainer);

// State management
let isListening = false;
let currentMood = 'neutral';
let isDarkMode = false;

// Speech Recognition Setup
recognition.onstart = () => {
    isListening = true;
    statusCircle.classList.add('listening');
    debug.textContent = 'Listening started...';
};

// Add NLU processing
function processUserInput(text) {
    const lowerText = text.toLowerCase();
    
    // Quick intent matching without regex for common cases
    if (lowerText.includes('time')) return { intent: 'time', entities: {}, originalText: lowerText };
    if (lowerText.includes('hi') || lowerText.includes('hello')) return { intent: 'greeting', entities: {}, originalText: lowerText };
    if (lowerText.includes('bye')) return { intent: 'farewell', entities: {}, originalText: lowerText };
    
    // Default to chat for everything else
    return {
        intent: 'chat',
        entities: {},
        originalText: lowerText
    };
}

// Keep only one version of executeAction
async function executeAction(nluResult) {
    const { intent, originalText } = nluResult;
    
    // Handle specific intents first (these are faster)
    switch(intent) {
        case 'time':
            return `It's ${new Date().toLocaleTimeString()} right now.`;
        case 'greeting':
            return "Hello! I'm here to chat and help. How can I assist you today?";
        case 'farewell':
            return "Goodbye! Have a great day!";
    }
    
    // Only call Ollama if no specific intent was matched
    try {
        const response = await queryOllama(originalText);
        return response;
    } catch (error) {
        console.error('Ollama error:', error);
        return "I apologize, but I'm having trouble processing that right now. Could you try again?";
    }
}

// Decision/Action Engine
async function executeAction(nluResult) {
    const { intent, originalText } = nluResult;
    
    // For general chat and unknown intents, use Ollama
    if (intent === 'chat' || intent === 'unknown') {
        try {
            const response = await queryOllama(originalText);
            return response;
        } catch (error) {
            console.error('Ollama error:', error);
            return "I apologize, but I'm having trouble processing that right now. Could you try again?";
        }
    }
    
    // Handle specific intents
    switch(intent) {
        case 'time':
            return `It's ${new Date().toLocaleTimeString()} right now.`;
        case 'greeting':
            return "Hello! I'm here to chat and help. How can I assist you today?";
        case 'farewell':
            return "Goodbye! Have a great day!";
        default:
            // Use Ollama for any other type of conversation
            try {
                const response = await queryOllama(originalText);
                return response;
            } catch (error) {
                console.error('Ollama error:', error);
                return "I apologize, but I'm having trouble processing that right now. Could you try again?";
            }
    }
}

async function queryOllama(prompt) {
    // Replace with a simpler response system
    return "I can help you with basic tasks like telling time and greetings. For more complex conversations, please set up the backend service.";
}

// Response Generation
function generateResponse(actionResult, mood) {
    // Simply return the action result without emojis
    return actionResult;
}

// Modify the speech synthesis settings for more natural speech
recognition.onresult = async (event) => {
    let finalTranscript = '';
    
    // Only process final results
    for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
            finalTranscript = event.results[i][0].transcript;
            break;
        }
    }
    
    // Only process if we have a final transcript
    if (finalTranscript) {
        // Start timing
        const startTime = performance.now();
        
        userTranscript.textContent = `You: ${finalTranscript}`;
        
        // Process through NLU
        const nluResult = processUserInput(finalTranscript);
        
        // Execute action
        const actionResult = await executeAction(nluResult);
        
        // Generate response with current mood
        const responseText = generateResponse(actionResult, currentMood);
        
        // Calculate processing time
        const endTime = performance.now();
        const processingTime = Math.round(endTime - startTime);
        
        // Update processing time display
        document.getElementById('processing-time').textContent = `Processing: ${processingTime}ms`;
        
        // Update UI without color
        document.getElementById('response').textContent = `Nova: ${responseText}`;
        
        // Text-to-Speech with word-by-word subtitles
        // Enhanced Text-to-Speech with more natural parameters
        const utterance = new SpeechSynthesisUtterance(responseText);
        
        // Adjust speech parameters based on mood
        switch(currentMood) {
            case 'happy':
                utterance.rate = 1.1;
                utterance.pitch = 1.2;
                break;
            case 'sad':
                utterance.rate = 0.9;
                utterance.pitch = 0.9;
                break;
            case 'excited':
                utterance.rate = 1.2;
                utterance.pitch = 1.3;
                break;
            case 'concerned':
                utterance.rate = 0.95;
                utterance.pitch = 0.95;
                break;
            default: // neutral
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
        }

        // Add natural pauses using SSML-like breaks
        const words = responseText.split(' ');
        let currentWordIndex = 0;
        
        // Add subtle variations in speech
        utterance.volume = 1.0;
        utterance.voice = speechSynthesis.getVoices().find(voice => voice.name.includes('Female')) || speechSynthesis.getVoices()[0];

        // Show subtitle container
        subtitleContainer.style.display = 'block';
        subtitleContainer.textContent = '';
        
        // Handle word-by-word display
        utterance.onboundary = (event) => {
            if (event.name === 'word' && currentWordIndex < words.length) {
                // Add the next word
                if (currentWordIndex === 0) {
                    subtitleContainer.textContent = words[currentWordIndex];
                } else {
                    subtitleContainer.textContent += ' ' + words[currentWordIndex];
                }
                currentWordIndex++;
            }
        };
        
        utterance.onstart = () => {
            subtitleContainer.style.display = 'block';
            currentWordIndex = 0;
            subtitleContainer.textContent = '';
        };
        
        utterance.onend = () => {
            subtitleContainer.style.display = 'none';
            subtitleContainer.textContent = '';
            // Clear the previous response
            document.getElementById('response').textContent = '';
            userTranscript.textContent = 'Listening...';
            
            // Restart recognition
            setTimeout(() => {
                recognition.start();
            }, 100);
        };
        
        // Stop any ongoing speech
        window.speechSynthesis.cancel();
        
        // Speak with subtitles
        window.speechSynthesis.speak(utterance);
        
        // Temporarily stop recognition while speaking
        recognition.stop();
    }
};

recognition.onend = () => {
    isListening = false;
    statusCircle.classList.remove('listening', 'wave');
    debug.textContent = 'Listening ended.';
};

// Mood Detection
function detectMood(text) {
    const moodPatterns = {
        happy: /happy|joy|great|wonderful|laugh/i,
        sad: /sad|unhappy|depressed|crying/i,
        angry: /angry|mad|frustrated|annoyed/i,
        excited: /excited|wow|amazing|awesome/i,
        neutral: /.*/ // default
    };

    for (const [mood, pattern] of Object.entries(moodPatterns)) {
        if (pattern.test(text)) {
            currentMood = mood;
            moodIndicator.textContent = `Mood: ${mood.charAt(0).toUpperCase() + mood.slice(1)}`;
            break;
        }
    }
}

// Button Controls
startButton.addEventListener('click', () => {
    if (!isListening) {
        recognition.start();
        statusCircle.textContent = 'Listening...';
    }
});

pauseButton.addEventListener('click', () => {
    if (isListening) {
        recognition.stop();
        statusCircle.textContent = 'Paused';
    }
});

exitButton.addEventListener('click', () => {
    if (isListening) recognition.stop();
    window.close();
});

// Theme Toggle
themeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode');
});

// Fullscreen Toggle
fullscreenToggle.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
});

// Mood Toggle
const moods = ['neutral', 'happy', 'sad', 'angry', 'excited'];
let currentMoodIndex = 0;

moodToggle.addEventListener('click', () => {
    currentMoodIndex = (currentMoodIndex + 1) % moods.length;
    currentMood = moods[currentMoodIndex];
    moodIndicator.textContent = `Mood: ${currentMood.charAt(0).toUpperCase() + currentMood.slice(1)}`;
});

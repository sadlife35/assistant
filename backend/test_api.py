import os
import requests
import wave
import numpy as np
import time
from urllib3.exceptions import ReadTimeoutError

# Configuration
BASE_URL = "http://localhost:8000"
TEST_OUTPUT_DIR = "test_outputs"
os.makedirs(TEST_OUTPUT_DIR, exist_ok=True)

def create_dummy_wav(filename, duration=1.0, sample_rate=16000):
    """Create a dummy WAV file for testing"""
    samples = np.sin(2 * np.pi * 440 * np.arange(duration * sample_rate) / sample_rate)
    samples = (samples * 32767).astype(np.int16)
    
    with wave.open(filename, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(samples.tobytes())

def wait_for_service(url, timeout=60, interval=2):
    """Wait for the service to become available"""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = requests.get(f"{url}/health")
            if response.status_code == 200:
                print("Service is available!")
                return True
        except requests.exceptions.ConnectionError:
            print(f"Waiting for service at {url}...")
            time.sleep(interval)
    return False

def test_speech_to_text():
    """Test the speech-to-text endpoint"""
    print("\n--- Testing Speech-to-Text Endpoint ---")
    
    # Create test WAV file
    wav_path = os.path.join(TEST_OUTPUT_DIR, "test_input.wav")
    create_dummy_wav(wav_path)
    print(f"Created test WAV file: {wav_path}")
    
    try:
        with open(wav_path, 'rb') as f:
            files = {'file': (os.path.basename(wav_path), f, 'audio/wav')}
            response = requests.post(f"{BASE_URL}/speech-to-text", files=files)
        
        print(f"STT Status Code: {response.status_code}")
        print(f"STT Response JSON: {response.json()}")
        
        assert response.status_code == 200, "Unexpected status code"
        assert 'text' in response.json(), "Response missing 'text' field"
        
        print("STT Test Passed!")
        return True
    except Exception as e:
        print(f"STT Test Failed: {str(e)}")
        return False

def test_chat():
    """Test the chat endpoint"""
    print("\n--- Testing Chat Endpoint ---")
    
    payload = {
        'text': 'What are its main advantages?',
        'conversation_history': [
            'User: Hello Nova!',
            'Assistant: Hi there! How can I help you today?',
            'User: Tell me about FastAPI.'
        ]
    }
    
    try:
        # First try with normal timeout
        response = requests.post(
            f"{BASE_URL}/chat",
            json=payload,
            timeout=10
        )
        
        print(f"Chat Status Code: {response.status_code}")
        print(f"Chat Response JSON: {response.json()}")
        
        assert response.status_code == 200, "Unexpected status code"
        assert 'response' in response.json(), "Response missing 'response' field"
        
        print("Chat Test Passed!")
        return True
        
    except ReadTimeoutError:
        print("Warning: Chat endpoint timed out (10s), retrying with longer timeout...")
        try:
            # Retry with extended timeout
            response = requests.post(
                f"{BASE_URL}/chat",
                json=payload,
                timeout=60
            )
            
            print(f"Chat Status Code: {response.status_code}")
            print(f"Chat Response JSON: {response.json()}")
            
            assert response.status_code == 200, "Unexpected status code"
            assert 'response' in response.json(), "Response missing 'response' field"
            
            print("Chat Test Passed after retry!")
            return True
            
        except Exception as e:
            print(f"Chat Test Failed after retry: {str(e)}")
            return False
            
    except Exception as e:
        print(f"Chat Test Failed: {str(e)}")
        return False

def main():
    """Main test function"""
    print("======== Testing Nova AI Assistant API ========")
    print(f"Base URL: {BASE_URL}")
    
    # Wait for service to be available
    if not wait_for_service(BASE_URL):
        print("Error: Service did not become available within timeout period")
        return
    
    # Run tests
    stt_success = test_speech_to_text()
    chat_success = test_chat()
    
    # Summary
    print("\n=== Test Summary ===")
    print(f"Speech-to-Text: {'PASSED' if stt_success else 'FAILED'}")
    print(f"Chat: {'PASSED' if chat_success else 'FAILED'}")
    
    if stt_success and chat_success:
        print("\nAll tests passed successfully!")
    else:
        print("\nSome tests failed. Check the logs for details.")

if __name__ == "__main__":
    main()
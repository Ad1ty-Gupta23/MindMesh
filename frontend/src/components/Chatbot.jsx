import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Mic, MicOff, Volume2, Bot, User, Heart, Shield, Brain } from 'lucide-react';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm MindMesh AI, your compassionate mental health support assistant. I'm here to listen and provide emotional support. How are you feeling today?",
      sender: 'bot',
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showAnalysisForm, setShowAnalysisForm] = useState(false);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Analysis form state
  const [analysisData, setAnalysisData] = useState({
    concerns: [],
    age: '',
    duration: '',
    severity: ''
  });

  const API_BASE_URL = 'http://localhost:8000';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (text, sender, audioUrl = null) => {
    const newMessage = {
      id: Date.now(),
      text,
      sender,
      timestamp: new Date().toISOString(),
      audioUrl
    };
    setMessages(prev => [...prev, newMessage]);
    
    // Auto-play audio for bot responses
    if (sender === 'bot' && audioUrl) {
      setTimeout(() => {
        playAudio(audioUrl);
      }, 500);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    addMessage(userMessage, 'user');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          user_id: 'user-' + Date.now()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from server');
      }

      const data = await response.json();
      addMessage(data.text_response, 'bot', data.audio_file_path);
      
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage('I\'m here to support you, but I\'m experiencing technical difficulties. Please consider reaching out to a mental health professional for support.', 'bot');
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleAnalysisSubmit = async () => {
    if (analysisData.concerns.length === 0) return;

    setIsLoading(true);
    setIsTyping(true);
    setShowAnalysisForm(false);

    try {
      const response = await fetch(`${API_BASE_URL}/mental-health-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          concerns: analysisData.concerns,
          age: analysisData.age ? parseInt(analysisData.age) : null,
          duration: analysisData.duration,
          severity: analysisData.severity
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get analysis from server');
      }

      const data = await response.json();
      addMessage(`📊 Mental Health Analysis for: ${analysisData.concerns.join(', ')}`, 'user');
      addMessage(data.analysis, 'bot');
      
      // Reset form
      setAnalysisData({ concerns: [], age: '', duration: '', severity: '' });
      
    } catch (error) {
      console.error('Error getting analysis:', error);
      addMessage('I\'m unable to provide analysis at this time, but I want you to know that support is available. Please consider reaching out to a mental health professional.', 'bot');
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await sendVoiceMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      addMessage('Unable to access microphone. Please check permissions and try again.', 'bot');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendVoiceMessage = async (audioBlob) => {
    setIsLoading(true);
    setIsTyping(true);
    addMessage('🎤 Voice message sent', 'user');

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice_message.wav');

      const response = await fetch(`${API_BASE_URL}/voice-input`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process voice message');
      }

      const data = await response.json();
      
      if (data.transcribed_text) {
        addMessage(`Transcribed: "${data.transcribed_text}"`, 'user');
      }
      
      addMessage(data.text_response, 'bot', data.audio_file_path);
      
    } catch (error) {
      console.error('Error processing voice message:', error);
      addMessage('I couldn\'t process your voice message, but I\'m here to listen. Please try typing your message or consider reaching out to a mental health professional.', 'bot');
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const playAudio = async (filename) => {
    try {
      const audio = new Audio(`${API_BASE_URL}/audio/${filename}`);
      audio.volume = 0.8;
      await audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const isCrisisMessage = (text) => {
    const crisisKeywords = ['suicide', 'kill myself', 'end it all', 'want to die', 'hurt myself', 'self harm', 'no hope'];
    return crisisKeywords.some(keyword => text.toLowerCase().includes(keyword));
  };

  const concernOptions = [
    'Anxiety', 'Depression', 'Stress', 'Sleep Issues', 'Panic Attacks', 
    'Mood Swings', 'Social Anxiety', 'Work Burnout', 'Relationship Issues', 
    'Grief', 'Trauma', 'Self-Esteem', 'Other'
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group"
        >
          <div className="relative">
            <Heart className="w-6 h-6 group-hover:scale-110 transition-transform" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-400 rounded-full animate-pulse"></div>
          </div>
        </button>
      )}

      {/* Chat Interface */}
      {isOpen && (
        <div className="bg-white rounded-3xl shadow-2xl border border-indigo-100 w-96 h-[600px] flex flex-col overflow-hidden backdrop-blur-sm">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 p-4 flex items-center justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/90 to-purple-600/90"></div>
            <div className="flex items-center space-x-3 relative z-10">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">MindMesh</h3>
                <p className="text-indigo-200 text-xs flex items-center">
                  <Shield className="w-3 h-3 mr-1" />
                  Mental Health Support
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 relative z-10">
              <button
                onClick={() => setShowAnalysisForm(true)}
                className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                title="Mental Health Analysis"
              >
                <Heart className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Analysis Form Modal */}
          {showAnalysisForm && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-20 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm max-h-96 overflow-y-auto">
                <h3 className="text-lg font-semibold text-indigo-800 mb-4">Mental Health Check-In</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">What's concerning you? (Select all that apply)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {concernOptions.map(concern => (
                        <label key={concern} className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            className="mr-2 text-indigo-600"
                            checked={analysisData.concerns.includes(concern)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAnalysisData(prev => ({
                                  ...prev,
                                  concerns: [...prev.concerns, concern]
                                }));
                              } else {
                                setAnalysisData(prev => ({
                                  ...prev,
                                  concerns: prev.concerns.filter(c => c !== concern)
                                }));
                              }
                            }}
                          />
                          {concern}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age (optional)</label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      value={analysisData.age}
                      onChange={(e) => setAnalysisData(prev => ({ ...prev, age: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">How long have you been experiencing this?</label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      value={analysisData.duration}
                      onChange={(e) => setAnalysisData(prev => ({ ...prev, duration: e.target.value }))}
                    >
                      <option value="">Select duration</option>
                      <option value="Less than a week">Less than a week</option>
                      <option value="1-2 weeks">1-2 weeks</option>
                      <option value="A few weeks">A few weeks</option>
                      <option value="1-3 months">1-3 months</option>
                      <option value="3-6 months">3-6 months</option>
                      <option value="6+ months">6+ months</option>
                      <option value="Over a year">Over a year</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">How would you rate the severity?</label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      value={analysisData.severity}
                      onChange={(e) => setAnalysisData(prev => ({ ...prev, severity: e.target.value }))}
                    >
                      <option value="">Select severity</option>
                      <option value="Mild">Mild - Manageable, occasional</option>
                      <option value="Moderate">Moderate - Noticeable impact on daily life</option>
                      <option value="Severe">Severe - Significant difficulty functioning</option>
                    </select>
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowAnalysisForm(false)}
                    className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAnalysisSubmit}
                    disabled={analysisData.concerns.length === 0}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Analyze
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-indigo-50/30 via-purple-50/20 to-pink-50/30">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-3 max-w-[85%] ${message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                    message.sender === 'user' 
                      ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                      : 'bg-gradient-to-r from-indigo-500 to-purple-600'
                  }`}>
                    {message.sender === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Brain className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div
                    className={`rounded-2xl p-4 shadow-sm transition-all hover:shadow-md ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-br-md'
                        : isCrisisMessage(message.text)
                        ? 'bg-gradient-to-r from-red-100 to-pink-100 border-2 border-red-200 rounded-bl-md'
                        : 'bg-white border border-indigo-100 rounded-bl-md'
                    }`}
                  >
                    {isCrisisMessage(message.text) && message.sender === 'bot' && (
                      <div className="flex items-center space-x-2 mb-3 text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                        <Shield className="w-4 h-4" />
                        <span className="text-xs font-semibold">CRISIS SUPPORT NEEDED</span>
                      </div>
                    )}
                    <p className={`text-sm leading-relaxed ${
                      message.sender === 'user' ? 'text-white' : isCrisisMessage(message.text) ? 'text-red-800' : 'text-gray-800'
                    }`}>
                      {message.text}
                    </p>
                    {message.audioUrl && (
                      <button
                        onClick={() => playAudio(message.audioUrl)}
                        className="mt-3 flex items-center space-x-2 text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg"
                      >
                        <Volume2 className="w-4 h-4" />
                        <span className="text-xs font-medium">Play Audio</span>
                      </button>
                    )}
                    <div className="mt-2 text-xs opacity-60">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white rounded-2xl rounded-bl-md p-4 shadow-sm border border-indigo-100">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-indigo-100 bg-white/80 backdrop-blur-sm">
            <div className="flex items-end space-x-3">
              <div className="flex-1 relative">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Share what's on your mind... I'm here to listen."
                  className="w-full p-3 pr-12 border border-indigo-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none bg-white/90 backdrop-blur-sm"
                  rows="2"
                  disabled={isLoading}
                />
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`absolute right-3 bottom-3 p-2 rounded-xl transition-all ${
                    isRecording 
                      ? 'bg-red-500 text-white shadow-lg animate-pulse' 
                      : 'text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50'
                  }`}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-300 text-white p-3 rounded-2xl transition-all duration-200 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            
            {/* Enhanced Disclaimer */}
            <div className="mt-3 text-xs text-gray-500 text-center bg-gradient-to-r from-indigo-50 to-purple-50 p-2 rounded-lg border border-indigo-100">
              <p className="flex items-center justify-center space-x-1">
                <Heart className="w-3 h-3 text-indigo-400" />
                <span>This AI provides emotional support. For crisis situations, please contact a mental health professional immediately.</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
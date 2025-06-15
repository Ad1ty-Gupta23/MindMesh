import React, { useState, useEffect } from "react";
import { ChevronRight, Brain, Heart, BookOpen, Users, Star, Play, Pause, Volume2, Settings } from "lucide-react";
import Navbar from "../components/Navbar"; // Assuming you have a Navbar component
import Chatbot from "../components/Chatbot";


function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState("meditation");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const audioTracks = [
    "Ocean Waves",
    "Forest Rain",
    "Mountain Wind",
    "City Ambient"
  ];

  useEffect(() => {
    const userInfo = localStorage.getItem("user");
    if (userInfo) {
      setIsLoggedIn(true);
      setUser(JSON.parse(userInfo));
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSectionChange = (section) => {
    setActiveSection(section);
  };

  const toggleAudio = () => {
    setIsPlaying(!isPlaying);
  };

  const nextTrack = () => {
    setCurrentTrack((prev) => (prev + 1) % audioTracks.length);
  };

  const colors = {
    primary: "from-indigo-600 to-purple-600",
    secondary: "from-blue-500 to-cyan-500",
    accent: "from-emerald-500 to-teal-500",
    dark: "bg-gray-900",
    light: "bg-gray-50"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 font-sans antialiased overflow-x-hidden">
      <Chatbot/>
      {/* Floating Orbs Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div 
          className="absolute w-64 h-64 bg-gradient-to-r from-indigo-400/20 to-purple-400/20 rounded-full filter blur-3xl animate-pulse"
          style={{
            left: `${mousePosition.x * 0.01}%`,
            top: `${mousePosition.y * 0.01}%`,
            transform: 'translate(-50%, -50%)'
          }}
        />
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-cyan-400/15 to-blue-400/15 rounded-full filter blur-3xl animate-pulse delay-1000" />
        <div className="absolute bottom-1/3 left-1/3 w-96 h-96 bg-gradient-to-r from-emerald-400/10 to-teal-400/10 rounded-full filter blur-3xl animate-pulse delay-2000" />
      </div>

      {/* Navbar Component */}
      <Navbar 
        isLoggedIn={isLoggedIn} 
        user={user} 
        activeSection={activeSection} 
        onSectionChange={handleSectionChange}
      />

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-8">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                <span className="block text-gray-900">Connect Your</span>
                <span className="block bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-pulse">
                  MindMesh
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
                An AI-powered meditation platform that weaves together mindfulness, mood tracking, 
                and community support for transformative mental wellness.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center gap-6 pt-8">
              {!isLoggedIn ? (
                <>
                  <button className="group px-8 py-4 text-lg font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                    <span className="flex items-center justify-center space-x-2">
                      <span>Start Your Journey</span>
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </button>
                  <button className="px-8 py-4 text-lg font-medium border-2 border-indigo-600 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-all duration-300">
                    Explore Features
                  </button>
                </>
              ) : (
                <button className="group px-8 py-4 text-lg font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                  <span className="flex items-center justify-center space-x-2">
                    <span>Go to Dashboard</span>
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
              )}
            </div>

            {/* Floating Audio Player */}
            <div className="mt-12 flex justify-center">
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-gray-200/50 max-w-md w-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                      <Volume2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Ambient Sounds</p>
                      <p className="text-sm text-gray-600">{audioTracks[currentTrack]}</p>
                    </div>
                  </div>
                  <Settings className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors" />
                </div>
                
                <div className="flex items-center justify-center space-x-4">
                  <button
                    onClick={toggleAudio}
                    className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                  </button>
                  <button
                    onClick={nextTrack}
                    className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    Next
                  </button>
                </div>
                
                <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000"
                    style={{ width: isPlaying ? '60%' : '0%' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Features Section */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              {activeSection === "meditation" && "Meditation Reimagined"}
              {activeSection === "mood" && "Emotional Intelligence"}
              {activeSection === "resources" && "Wisdom Library"}
              {activeSection === "community" && "Connected Minds"}
            </h2>
            <div className="w-32 h-2 bg-gradient-to-r from-indigo-500 to-purple-500 mx-auto mb-8 rounded-full"></div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {activeSection === "meditation" && "AI-guided sessions with real-time feedback and personalized recommendations"}
              {activeSection === "mood" && "Advanced analytics to understand and improve your emotional patterns"}
              {activeSection === "resources" && "Curated content from leading experts in mindfulness and psychology"}
              {activeSection === "community" && "Join a supportive network of individuals on similar wellness journeys"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(activeSection === "meditation" ? [
              {
                icon: <Brain className="w-8 h-8" />,
                title: "AI-Guided Sessions",
                description: "Personalized meditation experiences that adapt to your progress and preferences",
                gradient: colors.primary,
                delay: "0"
              },
              {
                icon: <Heart className="w-8 h-8" />,
                title: "Biometric Integration",
                description: "Real-time heart rate and breathing pattern analysis for optimized sessions",
                gradient: colors.secondary,
                delay: "200"
              },
              {
                icon: <Star className="w-8 h-8" />,
                title: "Progress Tracking",
                description: "Detailed insights into your meditation journey with beautiful visualizations",
                gradient: colors.accent,
                delay: "400"
              }
            ] : activeSection === "mood" ? [
              {
                icon: <Heart className="w-8 h-8" />,
                title: "Mood Analytics",
                description: "Comprehensive tracking of emotional patterns with AI-powered insights",
                gradient: colors.primary,
                delay: "0"
              },
              {
                icon: <BookOpen className="w-8 h-8" />,
                title: "Reflection Journal",
                description: "Secure, encrypted journaling with sentiment analysis and themes",
                gradient: colors.secondary,
                delay: "200"
              },
              {
                icon: <Star className="w-8 h-8" />,
                title: "Correlation Insights",
                description: "Discover connections between activities, mood, and meditation progress",
                gradient: colors.accent,
                delay: "400"
              }
            ] : activeSection === "resources" ? [
              {
                icon: <BookOpen className="w-8 h-8" />,
                title: "Expert Content",
                description: "Research-backed articles and guides from leading mindfulness experts",
                gradient: colors.primary,
                delay: "0"
              },
              {
                icon: <Brain className="w-8 h-8" />,
                title: "Learning Paths",
                description: "Structured courses from beginner to advanced meditation techniques",
                gradient: colors.secondary,
                delay: "200"
              },
              {
                icon: <Star className="w-8 h-8" />,
                title: "Interactive Tools",
                description: "Breathing exercises, visualization tools, and mindfulness reminders",
                gradient: colors.accent,
                delay: "400"
              }
            ] : [
              {
                icon: <Users className="w-8 h-8" />,
                title: "Support Groups",
                description: "Join themed communities based on your interests and goals",
                gradient: colors.primary,
                delay: "0"
              },
              {
                icon: <Heart className="w-8 h-8" />,
                title: "Peer Connection",
                description: "Connect with meditation buddies and share your journey",
                gradient: colors.secondary,
                delay: "200"
              },
              {
                icon: <Star className="w-8 h-8" />,
                title: "Expert Sessions",
                description: "Live sessions with certified meditation instructors and therapists",
                gradient: colors.accent,
                delay: "400"
              }
            ]).map((feature, index) => (
              <div 
                key={index} 
                className={`group bg-white/80 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-gray-200/50 hover:shadow-2xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2`}
                style={{ animationDelay: `${feature.delay}ms` }}
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-2xl mb-6 group-hover:rotate-12 transition-transform duration-300`}>
                  <div className="text-white">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">{feature.description}</p>
                <button className={`w-full px-6 py-3 bg-gradient-to-r ${feature.gradient} text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300 transform hover:scale-105`}>
                  {isLoggedIn ? "Explore Now" : "Sign Up to Access"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Animated Stats Section */}
      <section className="py-20 bg-white/50 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "50K+", label: "Active Users", color: "text-indigo-600" },
              { value: "1M+", label: "Sessions Completed", color: "text-purple-600" },
              { value: "98%", label: "User Satisfaction", color: "text-cyan-600" },
              { value: "4.9★", label: "App Rating", color: "text-emerald-600" }
            ].map((stat, index) => (
              <div key={index} className="group">
                <div className={`text-4xl md:text-5xl font-bold ${stat.color} mb-2 group-hover:scale-110 transition-transform duration-300`}>
                  {stat.value}
                </div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Testimonials */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Stories from Our Community
            </h2>
            <div className="w-32 h-2 bg-gradient-to-r from-indigo-500 to-purple-500 mx-auto mb-8 rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                quote: "MindMesh has completely transformed my meditation practice. The AI guidance feels incredibly personal and intuitive.",
                name: "Sarah Chen",
                role: "Software Engineer",
                avatar: "SC",
                gradient: "from-indigo-500 to-purple-500"
              },
              {
                quote: "The mood tracking features helped me identify patterns I never noticed. It's like having a personal wellness coach.",
                name: "Marcus Johnson",
                role: "Therapist",
                avatar: "MJ",
                gradient: "from-cyan-500 to-blue-500"
              },
              {
                quote: "The community aspect is amazing. I've found so much support and motivation from connecting with others.",
                name: "Emma Rodriguez",
                role: "Designer",
                avatar: "ER",
                gradient: "from-emerald-500 to-teal-500"
              }
            ].map((testimonial, index) => (
              <div key={index} className="group bg-white/80 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-gray-200/50 hover:shadow-2xl transition-all duration-500 transform hover:scale-105">
                <div className="flex items-center mb-6">
                  <div className={`w-14 h-14 bg-gradient-to-r ${testimonial.gradient} rounded-2xl flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-transform duration-300`}>
                    {testimonial.avatar}
                  </div>
                  <div className="ml-4">
                    <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                    <p className="text-gray-600 text-sm">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-gray-700 italic mb-6 leading-relaxed">"{testimonial.quote}"</p>
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600"></div>
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-6 text-center text-white">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            Ready to Transform Your Mind?
          </h2>
          <p className="text-xl mb-12 max-w-3xl mx-auto leading-relaxed">
            Join thousands who have discovered a new way to meditate, track their emotions, 
            and build lasting mindfulness habits with MindMesh.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            {!isLoggedIn ? (
              <>
                <button className="group px-8 py-4 text-lg font-medium bg-white text-indigo-700 rounded-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                  <span className="flex items-center justify-center space-x-2">
                    <span>Start Free Trial</span>
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
                <button className="px-8 py-4 text-lg font-medium border-2 border-white text-white rounded-xl hover:bg-white/10 transition-all duration-300">
                  Learn More
                </button>
              </>
            ) : (
              <button className="group px-8 py-4 text-lg font-medium bg-white text-indigo-700 rounded-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <span className="flex items-center justify-center space-x-2">
                  <span>Continue Your Journey</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  MindMesh
                </span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Connecting minds through intelligent meditation and wellness technology.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-6 text-gray-200">Features</h4>
              <ul className="space-y-3">
                <li><button onClick={() => handleSectionChange("meditation")} className="text-gray-400 hover:text-white transition-colors">Meditation</button></li>
                <li><button onClick={() => handleSectionChange("mood")} className="text-gray-400 hover:text-white transition-colors">Mood Tracking</button></li>
                <li><button onClick={() => handleSectionChange("resources")} className="text-gray-400 hover:text-white transition-colors">Resources</button></li>
                <li><button onClick={() => handleSectionChange("community")} className="text-gray-400 hover:text-white transition-colors">Community</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-6 text-gray-200">Company</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-6 text-gray-200">Support</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">API Documentation</a></li>
              </ul>
            </div>
          </div>
         
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-gray-400 text-sm mb-4 md:mb-0">
                © 2024 MindMesh. All rights reserved.
              </div>
              
              <div className="flex space-x-6">
                <div className="text-gray-400 hover:text-white cursor-pointer transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </div>
                <div className="text-gray-400 hover:text-white cursor-pointer transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                  </svg>
                </div>
                <div className="text-gray-400 hover:text-white cursor-pointer transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
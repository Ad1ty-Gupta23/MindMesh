import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import Navbar from "../components/Navbar";
import Chatbot from "../components/Chatbot";
import { useHabitBlockchain } from "../context/HabitBlockchainContext"; // Import blockchain context

function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState("meditation");
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  // Get blockchain context
  const {
    isConnected,
    account,
    therapistData,
    isLoading,
    error,
    deactivateTherapist,
    reactivateTherapist,
    loadUserData
  } = useHabitBlockchain();

  useEffect(() => {
    const userInfo = localStorage.getItem("user");
    if (userInfo) {
      setIsLoggedIn(true);
      setUser(JSON.parse(userInfo));
    }

    window.addEventListener("walletConnected", handleWalletConnected);
    window.addEventListener("walletDisconnected", handleWalletDisconnected);
    checkWalletConnection();

    return () => {
      window.removeEventListener("walletConnected", handleWalletConnected);
      window.removeEventListener("walletDisconnected", handleWalletDisconnected);
    };
  }, []);

  // Update wallet connection state based on blockchain context
  useEffect(() => {
    setIsWalletConnected(isConnected);
  }, [isConnected]);

  const checkWalletConnection = async () => {
    try {
      const { ethereum } = window;
      if (!ethereum) return;

      const accounts = await ethereum.request({ method: "eth_accounts" });
      if (accounts.length > 0) {
        setIsWalletConnected(true);
      }
    } catch (error) {
      console.error("Error checking wallet connection:", error);
    }
  };

  const handleWalletConnected = () => setIsWalletConnected(true);
  const handleWalletDisconnected = () => setIsWalletConnected(false);
  const handleSectionChange = (section) => setActiveSection(section);

  // Handle therapist account activation/deactivation
  const handleActivateAccount = async () => {
    try {
      const txHash = await reactivateTherapist();
      toast.success(`Account activated successfully! Transaction: ${txHash.slice(0, 10)}...`);
      // Reload user data to update the UI
      await loadUserData();
    } catch (err) {
      toast.error(`Failed to activate account: ${err.message}`);
    }
  };

  const handleDeactivateAccount = async () => {
    if (window.confirm("Are you sure you want to deactivate your therapist account? You won't receive new bookings while inactive.")) {
      try {
        const txHash = await deactivateTherapist();
        toast.success(`Account deactivated successfully! Transaction: ${txHash.slice(0, 10)}...`);
        // Reload user data to update the UI
        await loadUserData();
      } catch (err) {
        toast.error(`Failed to deactivate account: ${err.message}`);
      }
    }
  };

  // Professional color scheme
  const colors = {
    primary: "from-indigo-600 to-purple-600",
    secondary: "from-blue-500 to-cyan-500",
    accent: "from-emerald-500 to-teal-500",
    dark: "bg-gray-900",
    light: "bg-gray-50"
  };

  return (
    <div className="max-h-screen max-w-screen bg-gray-50 font-sans antialiased">
      {/* Modern Navbar */}
      <Navbar 
        isLoggedIn={isLoggedIn}
        user={user}
        activeSection={activeSection}
        handleSectionChange={handleSectionChange}
        colors={colors}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-300 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-purple-300 rounded-full filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="text-center space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Elevate Your Mind with
              <span className="block mt-3 bg-gradient-to-r from-indigo-300 to-purple-200 bg-clip-text text-transparent">
                Trifocus
              </span>
            </h1>
            <p className="text-lg md:text-xl text-indigo-100 max-w-3xl mx-auto leading-relaxed">
              The Web3-powered platform that combines AI-guided meditation, biometric verification, 
              and token rewards for sustainable mental wellness.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
              {!isLoggedIn ? (
                <>
                  <Link 
                    to="/register" 
                    className="px-8 py-3.5 text-lg font-medium bg-white text-indigo-700 rounded-lg hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    Get Started
                  </Link>
                  <Link 
                    to="/login" 
                    className="px-8 py-3.5 text-lg font-medium border-2 border-white text-white rounded-lg hover:bg-white hover:bg-opacity-10 transition-all duration-300"
                  >
                    Sign In
                  </Link>
                </>
              ) : (
                <Link 
                  to="/usedash" 
                  className={`px-8 py-3.5 text-lg font-medium bg-gradient-to-r ${colors.primary} text-white rounded-lg hover:shadow-xl transition-all duration-300`}
                >
                  Go to Dashboard
                </Link>
              )}
            </div>
            
            {/* Wallet Connection Status */}
            {!isWalletConnected && isLoggedIn && (
              <div className="pt-4">
                <div className="inline-flex items-center px-4 py-2 bg-indigo-800 bg-opacity-50 rounded-lg text-indigo-100 text-sm">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Connect your wallet to unlock all features
                </div>
              </div>
            )}

            {/* Therapist Account Controls - Only show if wallet is connected and user has therapist data */}
            {isWalletConnected && isLoggedIn && therapistData.name && (
              <div className="pt-4">
                <div className="bg-indigo-800 bg-opacity-50 rounded-lg p-4 max-w-md mx-auto">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-indigo-100 text-sm font-medium">
                       Account: {therapistData.name}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      therapistData.isActive 
                        ? 'bg-green-500 bg-opacity-20 text-green-200' 
                        : 'bg-red-500 bg-opacity-20 text-red-200'
                    }`}>
                      {therapistData.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    {therapistData.isActive ? (
                      <button
                        onClick={handleDeactivateAccount}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
                      >
                        {isLoading ? 'Processing...' : 'Deactivate Account'}
                      </button>
                    ) : (
                      <button
                        onClick={handleActivateAccount}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
                      >
                        {isLoading ? 'Processing...' : 'Activate Account'}
                      </button>
                    )}
                  </div>
                  
                  {therapistData.sessionCount > 0 && (
                    <div className="mt-2 text-indigo-200 text-xs">
                      Sessions completed: {therapistData.sessionCount} | 
                      Total earnings: {therapistData.totalEarningsFormatted} HTK
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="pt-4">
                <div className="inline-flex items-center px-4 py-2 bg-red-800 bg-opacity-50 rounded-lg text-red-100 text-sm">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-16">
        {/* Features Grid */}
        <div className="mb-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {activeSection === "meditation" && "Meditation Reinvented"}
              {activeSection === "mood" && "Emotional Intelligence"}
              {activeSection === "resources" && "Mindfulness Resources"}
            </h2>
            <div className="w-24 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 mx-auto mb-6"></div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {activeSection === "meditation" && "Biometrically verified sessions with tangible rewards"}
              {activeSection === "mood" && "Data-driven insights into your emotional patterns"}
              {activeSection === "resources" && "Curated knowledge to deepen your practice"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(activeSection === "meditation" ? [
              {
                icon: (
                  <svg className="w-12 h-12 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18c-3.866 0-7-1.343-7-3s3.134-3 7-3 7 1.343 7 3-3.134 3-7 3zm0-10c-3.866 0-7-1.343-7-3s3.134-3 7-3 7 1.343 7 3-3.134 3-7 3zm0 6.5c-3.866 0-7-1.343-7-3s3.134-3 7-3 7 1.343 7 3-3.134 3-7 3z" />
                  </svg>
                ),
                title: "Guided Sessions",
                description: "AI-curated meditation journeys with real-time biometric verification",
                gradient: colors.primary
              },
              
              {
                icon: (
                  <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                ),
                title: "Ambient Soundscapes",
                description: "Scientifically-designed audio environments for deep focus",
                gradient: colors.accent
              }
            ] : activeSection === "mood" ? [
              {
                icon: (
                  <svg className="w-12 h-12 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                title: "Mood Analytics",
                description: "Visualize emotional patterns with AI-powered insights",
                gradient: colors.primary
              },
              {
                icon: (
                  <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                ),
                title: "Reflection Journal",
                description: "Secure, encrypted entries with sentiment analysis",
                gradient: colors.secondary
              },
              {
                icon: (
                  <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                title: "Progress Tracking",
                description: "Correlate meditation habits with mood improvements",
                gradient: colors.accent
              }
            ] : [
              {
                icon: (
                  <svg className="w-12 h-12 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                ),
                title: "Expert Articles",
                description: "Research-backed content on mindfulness and mental wellness",
                gradient: colors.primary
              },
              {
                icon: (
                  <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                ),
                title: "Learning Paths",
                description: "Structured courses for beginners to advanced practitioners",
                gradient: colors.secondary
              },
              {
                icon: (
                  <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                ),
                title: "Community Hub",
                description: "Connect with like-minded individuals on similar journeys",
                gradient: colors.accent
              }
            ]).map((feature, index) => (
              <div key={index} className="group relative h-full">
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300 rounded-xl"></div>
                <div className="relative h-full bg-white rounded-xl p-8 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 flex flex-col">
                  <div className="mb-6 flex justify-center">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3 text-center">{feature.title}</h3>
                  <p className="text-gray-600 mb-6 text-center leading-relaxed flex-grow">{feature.description}</p>
                  
                  {isLoggedIn && isWalletConnected ? (
                    <Link 
                      to={activeSection === "meditation" ? "/meditate" : "/dashboard"} 
                      className={`mt-auto px-6 py-3 bg-gradient-to-r ${feature.gradient} text-white rounded-lg font-medium hover:shadow-md transition-all duration-300 text-center`}
                    >
                      {activeSection === "resources" ? "Explore" : "Begin"}
                    </Link>
                  ) : !isLoggedIn ? (
                    <Link 
                      to="/login" 
                      className={`mt-auto px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all duration-300 text-center`}
                    >
                      Sign In to Access
                    </Link>
                  ) : (
                    <button 
                      onClick={() => toast.warning("Connect your wallet to access this feature")}
                      className={`mt-auto px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all duration-300`}
                    >
                      Connect Wallet
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-white rounded-xl shadow-md p-8 mb-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "10K+", label: "Active Users" },
              { value: "500K+", label: "Sessions Completed" },
              { value: "95%", label: "Retention Rate" },
              { value: "4.9/5", label: "User Rating" }
            ].map((stat, index) => (
              <div key={index} className="p-4">
                <p className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{stat.value}</p>
                <p className="text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Trusted by Wellness Seekers</h2>
            <div className="w-24 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 mx-auto mb-6"></div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Hear from our community members who've transformed their mental wellness
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                quote: "Trifocus' biometric verification finally made me consistent with meditation. The token rewards are just icing on the cake.",
                name: "Dr. Sarah Chen",
                role: "Neuroscientist",
                avatar: "SC"
              },
              {
                quote: "As a crypto enthusiast, I love how Trifocus merges Web3 with mental health. The data ownership model is revolutionary.",
                name: "Mark Williams",
                role: "Blockchain Developer",
                avatar: "MW"
              },
              {
                quote: "The mood tracking correlations helped me identify stress triggers I never noticed before. Life-changing platform.",
                name: "Lisa Rodriguez",
                role: "UX Designer",
                avatar: "LR"
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white rounded-xl shadow-md p-8 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-start mb-6">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${index === 0 ? "bg-indigo-500" : index === 1 ? "bg-purple-500" : "bg-emerald-500"}`}>
                    {testimonial.avatar}
                  </div>
                  <div className="ml-4">
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-gray-700 italic mb-6">"{testimonial.quote}"</p>
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 md:p-12 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white bg-opacity-10 rounded-full filter blur-xl"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white bg-opacity-10 rounded-full filter blur-xl"></div>
          
          <div className="relative z-10 text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Mental Wellness?</h2>
            <p className="text-lg text-indigo-100 mb-8 leading-relaxed">
              Join thousands who've improved focus, reduced stress, and built sustainable habits with Trifocus.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              {!isLoggedIn ? (
                <>
                  <Link 
                    to="/register" 
                    className="px-8 py-3.5 text-lg font-medium bg-white text-indigo-700 rounded-lg hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    Start Free Trial
                  </Link>
                  <Link 
                    to="/login" 
                    className="px-8 py-3.5 text-lg font-medium border-2 border-white text-white rounded-lg hover:bg-white hover:bg-opacity-10 transition-all duration-300"
                  >
                    Learn More
                  </Link>
                </>
              ) : (
                <Link 
                  to="/dashboard" 
                  className="px-8 py-3.5 text-lg font-medium bg-white text-indigo-700 rounded-lg hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Go to Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-4">Trifocus</h3>
              <p className="text-gray-400 leading-relaxed">
                The future of accountable mental wellness, powered by Web3 and AI.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4 text-gray-200">Product</h4>
              <ul className="space-y-2">
                <li><button onClick={() => handleSectionChange("meditation")} className="text-gray-400 hover:text-white transition-colors">Meditation</button></li>
                <li><button onClick={() => handleSectionChange("mood")} className="text-gray-400 hover:text-white transition-colors">Mood Tracking</button></li>
                <li><button onClick={() => handleSectionChange("resources")} className="text-gray-400 hover:text-white transition-colors">Resources</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4 text-gray-200">Company</h4>
              <ul className="space-y-2">
                <li><Link to="/about" className="text-gray-400 hover:text-white transition-colors">About Us</Link></li>
                <li><Link to="/blog" className="text-gray-400 hover:text-white transition-colors">Blog</Link></li>
                <li><Link to="/careers" className="text-gray-400 hover:text-white transition-colors">Careers</Link></li>
                <li><Link to="/contact" className="text-gray-400 hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4 text-gray-200">Support</h4>
              <ul className="space-y-2">
                <li><Link to="/help" className="text-gray-400 hover:text-white transition-colors">Help Center</Link></li>
                <li><Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link to="/whitepaper" className="text-gray-400 hover:text-white transition-colors">Whitepaper</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-gray-400 text-sm mb-4 md:mb-0">
                © 2024 Trifocus. All rights reserved.
              </div>
              
              <div className="flex space-x-6">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.012.001z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Chatbot Component */}
      {isLoggedIn && <Chatbot />}
    </div>
  );
}

export default Home;
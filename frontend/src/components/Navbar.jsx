import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { useHabitBlockchain } from "../context/HabitBlockchainContext";

function Navbar({ isLoggedIn: propIsLoggedIn, user: propUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(propIsLoggedIn || false);
  const [user, setUser] = useState(propUser || null);
  const [role, setRole] = useState(null);
  const [crisisAlerts, setCrisisAlerts] = useState(0);
  const [pendingAppointments, setPendingAppointments] = useState(0);

  // Get blockchain context - this replaces the manual wallet connection logic
  const { 
  account, 
  connectWallet, 
  userData, 
  isLoading,
  loadUserData 
} = useHabitBlockchain();

  // Get current active section from URL
  const getActiveSection = () => {
    const path = location.pathname;
    if (path.includes('/journal')) return 'journal';
    if (path.includes('/meditate')) return 'meditation';
    if (path.includes('/rewards')) return 'rewards';
    if (path.includes('/appointments')) return 'appointments';
    if (path.includes('/crisis')) return 'crisis';
    if (path.includes('/ai-insights')) return 'ai-insights';
    if (path.includes('/patient-files')) return 'patient-files';
    if (path.includes('/earnings')) return 'earnings';
    if (path.includes('/profile')) return 'profile';
    if (path.includes('/games')) return 'games';
    return 'dashboard';
  };

  const activeSection = getActiveSection();

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    const storedUser = localStorage.getItem("user");
    
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
    
    setRole(storedRole);
    setIsLoggedIn(!!storedUser || propIsLoggedIn);
    
    if (storedRole === "Therapist") {
      loadTherapistDashboardData();
    }
  }, [propIsLoggedIn, propUser]);

  // Fetch user stats when wallet is connected
  useEffect(() => {
  if (account) {
    loadUserData();
  }
}, [account, loadUserData]);


  const loadTherapistDashboardData = () => {
    setCrisisAlerts(Math.floor(Math.random() * 3));
    setPendingAppointments(Math.floor(Math.random() * 5) + 1);
  };

  // Updated wallet connection handler using the blockchain context
  const handleConnectWallet = async () => {
    try {
      await connectWallet();
      toast.success("Wallet connected successfully!");
    } catch (error) {
      console.error("Wallet connect error:", error);
      toast.error("Failed to connect wallet.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    setIsLoggedIn(false);
    setUser(null);
    toast.success("Logged out successfully");
    navigate("/login");
  };

  // User display name logic
  const getDisplayName = () => {
    if (!user) return "";
    
    // Check different possible username fields
    if (user.username) return user.username;
    if (user.name) return user.name;
    if (user.email) return user.email.split("@")[0];
    
    return "User";
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-white/20 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              TriFocus
            </Link>
            {role === "Therapist" && (
              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full font-medium">
                Professional
              </span>
            )}
          </div>

          {/* Navigation */}
          <nav className="hidden lg:flex space-x-1">
            {/* Volunteer Navigation */}
            {role === "Volunteer" && (
              <>
                <Link
                  to="/meditation"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeSection === "meditation" 
                      ? "bg-indigo-100 text-indigo-700" 
                      : "text-gray-600 hover:text-indigo-600 hover:bg-gray-50"
                  }`}
                >
                  Meditation
                </Link>
                <Link
                  to="/journal"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeSection === "journal" 
                      ? "bg-indigo-100 text-indigo-700" 
                      : "text-gray-600 hover:text-indigo-600 hover:bg-gray-50"
                  }`}
                >
                  Journal
                </Link>
                <Link
                  to="/redeem"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeSection === "rewards" 
                      ? "bg-indigo-100 text-indigo-700" 
                      : "text-gray-600 hover:text-indigo-600 hover:bg-gray-50"
                  }`}
                >
                  Redeem
                </Link>
              </>
            )}

            {/* Therapist Navigation */}
            {role === "Therapist" && (
              <>
                <Link
                  to="/generator"
                  className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeSection === "crisis" 
                      ? "bg-red-100 text-red-700" 
                      : "text-gray-600 hover:text-red-600 hover:bg-red-50"
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span>Prescription</span>
                  </div>
                  {crisisAlerts > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {crisisAlerts}
                    </span>
                  )}
                </Link>

                <Link
                  to="/appointments"
                  className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeSection === "appointments" 
                      ? "bg-indigo-100 text-indigo-700" 
                      : "text-gray-600 hover:text-indigo-600 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Appointments</span>
                  </div>
                  {pendingAppointments > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {pendingAppointments}
                    </span>
                  )}
                </Link>

                <Link
                  to="/upload"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeSection === "patient-files" 
                      ? "bg-indigo-100 text-indigo-700" 
                      : "text-gray-600 hover:text-indigo-600 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Patient Files</span>
                  </div>
                </Link>

                <Link
                  to="/earnings"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeSection === "earnings" 
                      ? "bg-indigo-100 text-indigo-700" 
                      : "text-gray-600 hover:text-indigo-600 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    <span>Earnings</span>
                  </div>
                </Link>

                <Link
                  to="/profile"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeSection === "profile" 
                      ? "bg-indigo-100 text-indigo-700" 
                      : "text-gray-600 hover:text-indigo-600 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Profile</span>
                  </div>
                </Link>
              </>
            )}

            {/* Common navigation items for all roles */}
            {isLoggedIn && role === "Volunteer" && (
              <Link
                to="/games"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeSection === "games"
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-600 hover:text-indigo-600 hover:bg-gray-50"
                }`}
              >
                Fun Games
              </Link>
            )}
          </nav>

          {/* Token Display - Updated to use blockchain context */}
          {account && (
            <div className="flex items-center mr-4">
              <div className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg shadow-md">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 17V17.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 13.5C14.5 13.5 15 12 15 11C15 9.5 13.5 9 12 9C10.5 9 9 9.5 9 11C9 12 9.5 13.5 12 13.5Z" fill="currentColor" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="font-medium">{userData?.earnedTokensFormatted ?? 0}</span>

                <span className="text-xs">Tokens</span>
              </div>
            </div>
          )}

          {/* Wallet Section - Updated to use blockchain context */}
          <div className="flex items-center">
            {account ? (
              <div className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-medium">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </span>
              </div>
            ) : (
              <button
                onClick={handleConnectWallet}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg hover:from-orange-600 hover:to-amber-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Connect Wallet</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Auth Section */}
          <div className="flex items-center space-x-4 ml-4">
            {isLoggedIn ? (
              <>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">
                      {getDisplayName().charAt(0).toUpperCase()}
                    </div>
                    {role === "Therapist" && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-gray-600 font-medium">
                    {getDisplayName()}
                    {role === "Therapist" && (
                      <span className="ml-1 text-xs text-indigo-600 font-medium">Dr.</span>
                    )}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
                  Login
                </Link>
                <Link to="/register" className="px-6 py-2 text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
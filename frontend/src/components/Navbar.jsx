import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { auth } from "../utils/firebase"; // Import your Firebase config
import { onAuthStateChanged, signOut } from "firebase/auth";

function Navbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Firebase auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setIsLoggedIn(true);
      } else {
        setUser(null);
        setIsLoggedIn(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Firebase logout handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    }
  };

  // User display name logic
  const getDisplayName = () => {
    if (!user) return "";
    
    if (user.displayName) return user.displayName;
    if (user.email) return user.email.split("@")[0];
    
    return "Volunteer";
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-white/20 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              MindMesh
            </Link>
          </div>

          {/* Navigation Links - Only visible when logged in */}
          {isLoggedIn && (
            <nav className="hidden md:flex items-center space-x-8">
              <Link 
                to="/usedash" 
                className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Dashboard
              </Link>
              <Link 
                to="/wellness" 
                className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Journal
              </Link>
              <Link 
                to="/medihome" 
                className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Meditation
              </Link>
              <Link 
                to="/mirror" 
                className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                AI Mirror
              </Link>
              <Link 
                to="/games" 
                className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Games
              </Link>
            </nav>
          )}

          <div className="flex items-center space-x-4">
            {/* User Section */}
            {isLoggedIn ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">
                    {getDisplayName().charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-600 font-medium">
                    {getDisplayName()}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link 
                  to="/login" 
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="px-6 py-2 text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
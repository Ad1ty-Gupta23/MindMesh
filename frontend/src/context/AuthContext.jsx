import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../utils/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // If online, try to fetch from Firestore
        if (isOnline) {
          try {
            const docRef = doc(db, "users", firebaseUser.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
              const userData = docSnap.data();
              setUser({
                uid: firebaseUser.uid,
                username: userData.username,
                email: userData.email,
                blockchainEnabled: userData.blockchainEnabled || false,
                initialStake: userData.initialStake || "0",
                therapistName: userData.therapistName || "",
                isTherapist: userData.isTherapist || false,
                profileCompleted: userData.profileCompleted || false,
                preferences: userData.preferences || {
                  notifications: true,
                  darkMode: false,
                  language: "en"
                },
                stats: userData.stats || {
                  totalHabits: 0,
                  completedHabits: 0,
                  currentStreak: 0,
                  longestStreak: 0
                },
                createdAt: userData.createdAt,
                updatedAt: userData.updatedAt,
                // Keep Firebase auth properties as fallbacks
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL
              });
            } else {
              // User document doesn't exist, create basic user object
              setUser({
                uid: firebaseUser.uid,
                username: firebaseUser.displayName || "User",
                email: firebaseUser.email,
                blockchainEnabled: false,
                initialStake: "0",
                therapistName: "",
                isTherapist: false,
                profileCompleted: false,
                preferences: {
                  notifications: true,
                  darkMode: false,
                  language: "en"
                },
                stats: {
                  totalHabits: 0,
                  completedHabits: 0,
                  currentStreak: 0,
                  longestStreak: 0
                },
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL
              });
            }
          } catch (error) {
            console.error("Error fetching user document:", error);
            // Fallback to Firebase Auth data with default structure
            setUser({
              uid: firebaseUser.uid,
              username: firebaseUser.displayName || "User",
              email: firebaseUser.email,
              blockchainEnabled: false,
              initialStake: "0",
              therapistName: "",
              isTherapist: false,
              profileCompleted: false,
              preferences: {
                notifications: true,
                darkMode: false,
                language: "en"
              },
              stats: {
                totalHabits: 0,
                completedHabits: 0,
                currentStreak: 0,
                longestStreak: 0
              },
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL
            });
          }
        } else {
          // If offline, use Firebase Auth data only with default structure
          setUser({
            uid: firebaseUser.uid,
            username: firebaseUser.displayName || "User",
            email: firebaseUser.email,
            blockchainEnabled: false,
            initialStake: "0",
            therapistName: "",
            isTherapist: false,
            profileCompleted: false,
            preferences: {
              notifications: true,
              darkMode: false,
              language: "en"
            },
            stats: {
              totalHabits: 0,
              completedHabits: 0,
              currentStreak: 0,
              longestStreak: 0
            },
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOnline]);

  const value = {
    user,
    loading,
    isOnline,
    // Helper methods
    isAuthenticated: !!user,
    isTherapist: user?.isTherapist || false,
    hasBlockchainEnabled: user?.blockchainEnabled || false,
    userStats: user?.stats || {
      totalHabits: 0,
      completedHabits: 0,
      currentStreak: 0,
      longestStreak: 0
    },
    userPreferences: user?.preferences || {
      notifications: true,
      darkMode: false,
      language: "en"
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { syncEvents } from '../lib/syncEvents';

interface AuthContextType {
  user: User | null;
  googleToken: string | null;
  loading: boolean;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => Promise<void>;
  loginWithGoogle: () => Promise<User>;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
  isSyncing: boolean;
  syncError: boolean;
  setSyncing: (syncing: boolean) => void;
  setSyncError: (error: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkModeState] = useState<boolean>(false);
  const [isSyncing, setSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<boolean>(false);

  // Keep HTML class in sync with dark mode state (always false)
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  // Listen to global database sync events (e.g. task writes)
  useEffect(() => {
    const unsubscribe = syncEvents.subscribe((syncing, error) => {
      setSyncing(syncing);
      if (error !== undefined) {
        setSyncError(error);
      }
    });
    return unsubscribe;
  }, []);

  // Restore googleToken from localStorage on mount (for persistent calendar access)
  useEffect(() => {
    const cachedToken = localStorage.getItem('dg_google_token');
    if (cachedToken) {
      setGoogleToken(cachedToken);
    }

    const isGuest = localStorage.getItem('dg_is_guest') === 'true';
    if (isGuest) {
      const guestUser: any = {
        uid: 'demo-user',
        email: 'guest@deadlineguardian.com',
        displayName: 'Guest Guardian',
        photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      };
      setUser(guestUser);
      setLoading(false);
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        localStorage.removeItem('dg_is_guest');
        setLoading(false);

        // Load database settings asynchronously so we do not block waking up the app
        if (currentUser.uid !== 'demo-user') {
          getDoc(doc(db, 'users', currentUser.uid))
            .then((userSnap) => {
              if (userSnap.exists()) {
                const data = userSnap.data();
                if (data.googleAccessToken) {
                  setGoogleToken(data.googleAccessToken);
                  localStorage.setItem('dg_google_token', data.googleAccessToken);
                }
                if (data.settings && data.settings.darkMode !== undefined) {
                  setDarkModeState(data.settings.darkMode);
                  localStorage.setItem('dg_dark_mode', data.settings.darkMode ? 'true' : 'false');
                }
              }
            })
            .catch((e) => {
              const msg = e && typeof e === 'object' && 'message' in e ? String(e.message) : '';
              if (msg.includes('offline') || msg.includes('Failed to get document')) {
                console.warn("Firestore is currently offline. Utilizing cached local storage credentials.");
              } else {
                console.warn("Notice restoring Google token from firestore:", e);
              }
            });
        }
      } else {
        const currentlyGuest = localStorage.getItem('dg_is_guest') === 'true';
        if (currentlyGuest) {
          const guestUser: any = {
            uid: 'demo-user',
            email: 'guest@deadlineguardian.com',
            displayName: 'Guest Guardian',
            photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
          };
          setUser(guestUser);
        } else {
          setUser(null);
          setGoogleToken(null);
          localStorage.removeItem('dg_google_token');
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const setDarkMode = async (dark: boolean) => {
    setDarkModeState(false);
    localStorage.setItem('dg_dark_mode', 'false');
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          settings: {
            darkMode: false
          }
        }, { merge: true });
      } catch (e) {
        console.error("Error saving dark mode setting to Firestore:", e);
      }
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || null;

      if (token) {
        setGoogleToken(token);
        localStorage.setItem('dg_google_token', token);
      }

      const u = result.user;
      
      // Register token with the Autonomous AI Worker
      if (token) {
        try {
          await fetch('/api/worker/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: u.uid, token })
          });
        } catch (e) {
          console.warn("Could not register token with AI worker:", e);
        }
      }

      // Upsert user into database to preserve setup and peak hours productivity configuration
      const userRef = doc(db, 'users', u.uid);
      const userSnap = await getDoc(userRef);

      const defaultUserData = {
        uid: u.uid,
        email: u.email || '',
        displayName: u.displayName || 'Guardian User',
        photoURL: u.photoURL || '',
        googleAccessToken: token || '',
        calendarId: 'primary',
        productivityPattern: {
          peakHours: [9, 10, 11, 14, 15, 16], // Default high energy hours
          preferredWorkLocation: 'Quiet Library',
        },
        settings: {
          autoReschedule: true,
          alarmSound: 'digital_beep',
          snoozeDefaultMinutes: 10,
          darkMode: false,
          notificationsEnabled: true,
          accountabilityPartnerEmail: '',
        },
        createdAt: new Date().toISOString(),
      };

      if (!userSnap.exists()) {
        await setDoc(userRef, defaultUserData);
      } else {
        // Merge in the latest credentials
        await setDoc(userRef, { 
          googleAccessToken: token || userSnap.data().googleAccessToken || '',
          displayName: u.displayName || userSnap.data().displayName,
          photoURL: u.photoURL || userSnap.data().photoURL
        }, { merge: true });
      }

      setUser(u);
      return u;
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginAsGuest = () => {
    setLoading(true);
    const guestUser: any = {
      uid: 'demo-user',
      email: 'guest@deadlineguardian.com',
      displayName: 'Guest Guardian',
      photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    };
    localStorage.setItem('dg_is_guest', 'true');
    setUser(guestUser);
    setGoogleToken('mock-google-token');
    localStorage.setItem('dg_google_token', 'mock-google-token');
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    try {
      localStorage.removeItem('dg_is_guest');
      if (user?.uid !== 'demo-user') {
        await signOut(auth);
      }
      setUser(null);
      setGoogleToken(null);
      localStorage.removeItem('dg_google_token');
    } catch (error) {
      console.error('Logout Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      googleToken, 
      loading, 
      darkMode, 
      setDarkMode, 
      loginWithGoogle, 
      loginAsGuest, 
      logout,
      isSyncing,
      syncError,
      setSyncing,
      setSyncError
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

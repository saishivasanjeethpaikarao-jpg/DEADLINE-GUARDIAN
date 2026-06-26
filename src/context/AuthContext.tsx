import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  googleToken: string | null;
  loading: boolean;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => Promise<void>;
  loginWithGoogle: () => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkModeState] = useState<boolean>(() => {
    const cached = localStorage.getItem('dg_dark_mode');
    return cached === 'true';
  });

  // Keep HTML class in sync with dark mode state
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Restore googleToken from localStorage on mount (for persistent calendar access)
  useEffect(() => {
    const cachedToken = localStorage.getItem('dg_google_token');
    if (cachedToken) {
      setGoogleToken(cachedToken);
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
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
        } catch (e) {
          console.error("Error restoring Google token from firestore:", e);
        }
      } else {
        setGoogleToken(null);
        localStorage.removeItem('dg_google_token');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const setDarkMode = async (dark: boolean) => {
    setDarkModeState(dark);
    localStorage.setItem('dg_dark_mode', dark ? 'true' : 'false');
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          settings: {
            darkMode: dark
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
          darkMode: true,
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

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
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
    <AuthContext.Provider value={{ user, googleToken, loading, darkMode, setDarkMode, loginWithGoogle, logout }}>
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

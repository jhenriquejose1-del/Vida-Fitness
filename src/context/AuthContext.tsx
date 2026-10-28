import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider, signInWithPopup, signOut as fbSignOut, onAuthStateChanged, FirebaseUser, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isGuest: boolean;
  signInWithGoogle: () => Promise<void>;
  enterGuestMode: () => void;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isGuest: false,
  signInWithGoogle: async () => {},
  enterGuestMode: () => {},
  signOut: async () => {},
  updateProfile: async () => {},
});

const DEFAULT_GUEST_PROFILE: UserProfile = {
  userId: 'guest_user',
  name: 'Atleta FitEvolution',
  email: 'atleta@fitevolution.local',
  photoURL: '',
  height: 175,
  currentWeight: 75,
  targetWeight: 80,
  goal: 'hypertrophy',
  experienceLevel: 'intermediate',
  workoutDaysAvailable: 5,
  foodPreferences: 'Equilibrada, rica em proteínas',
  physicalRestrictions: 'Nenhuma',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    return localStorage.getItem('fe_guest') === 'true';
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsGuest(false);
        localStorage.removeItem('fe_guest');
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          } else {
            const initialProfile: UserProfile = {
              userId: currentUser.uid,
              name: currentUser.displayName || 'Atleta',
              email: currentUser.email || '',
              photoURL: currentUser.photoURL || '',
              height: 175,
              currentWeight: 75,
              targetWeight: 80,
              goal: 'hypertrophy',
              experienceLevel: 'intermediate',
              workoutDaysAvailable: 5,
              foodPreferences: 'Hipertrofia / Proteica',
              physicalRestrictions: 'Nenhuma',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, initialProfile);
            setProfile(initialProfile);
          }
        } catch (err) {
          console.warn('Erro ao carregar perfil do Firestore, usando fallback local:', err);
          setProfile({
            userId: currentUser.uid,
            name: currentUser.displayName || 'Atleta',
            email: currentUser.email || '',
            photoURL: currentUser.photoURL || '',
            goal: 'hypertrophy',
            experienceLevel: 'intermediate',
            currentWeight: 75,
            targetWeight: 80,
          });
        }
      } else {
        if (localStorage.getItem('fe_guest') === 'true') {
          setIsGuest(true);
          const savedGuestProfile = localStorage.getItem('fe_guest_profile');
          setProfile(savedGuestProfile ? JSON.parse(savedGuestProfile) : DEFAULT_GUEST_PROFILE);
        } else {
          setProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Erro no login Google:', error);
      throw error;
    }
  };

  const enterGuestMode = () => {
    setIsGuest(true);
    localStorage.setItem('fe_guest', 'true');
    const saved = localStorage.getItem('fe_guest_profile');
    setProfile(saved ? JSON.parse(saved) : DEFAULT_GUEST_PROFILE);
  };

  const signOut = async () => {
    if (isGuest) {
      setIsGuest(false);
      localStorage.removeItem('fe_guest');
      setProfile(null);
    } else {
      await fbSignOut(auth);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!profile) return;
    const updated = {
      ...profile,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    setProfile(updated);

    if (user && !isGuest) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, updated, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    } else {
      localStorage.setItem('fe_guest_profile', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isGuest,
        signInWithGoogle,
        enterGuestMode,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

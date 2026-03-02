import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { detectUserRole, getUserData } from "@/lib/authService";
import { UserRole, AuthUser } from "@/types/auth";
import { checkPremiumAccess } from "@/lib/premiumService";

interface AuthContextType {
  user: AuthUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  role: UserRole;
  isPremium: boolean;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>("user");
  const [isPremium, setIsPremium] = useState(false);

  const refreshRole = useCallback(async () => {
    if (firebaseUser) {
      const detectedRole = await detectUserRole(firebaseUser.email);
      setRole(detectedRole);
      const premium = await checkPremiumAccess(firebaseUser.uid);
      setIsPremium(premium);
      const userData = await getUserData(firebaseUser.uid);
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
        displayName: firebaseUser.displayName,
        role: detectedRole,
        userData: userData,
      });
    }
  }, [firebaseUser]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      
      if (firebaseUser) {
        setFirebaseUser(firebaseUser);
        
        // Detect role by checking if email exists in admin/employer collections
        const detectedRole = await detectUserRole(firebaseUser.email);
        setRole(detectedRole);

        // Check premium access
        const premium = await checkPremiumAccess(firebaseUser.uid);
        setIsPremium(premium);

        // Get user data from users collection
        const userData = await getUserData(firebaseUser.uid);
        
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          emailVerified: firebaseUser.emailVerified,
          displayName: firebaseUser.displayName,
          role: detectedRole,
          userData: userData,
        });
      } else {
        setFirebaseUser(null);
        setUser(null);
        setRole("user");
        setIsPremium(false);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    role,
    isPremium,
    refreshRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

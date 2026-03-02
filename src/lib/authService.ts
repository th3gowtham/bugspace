import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
  signOut as firebaseSignOut,
  User as FirebaseUser,
  ActionCodeSettings,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "./firebase";
import { UserRole, UserData, AdminData, EmployerData } from "@/types/auth";

// Email verification settings
const actionCodeSettings: ActionCodeSettings = {
  url: window.location.origin + '/login',
  handleCodeInApp: true,
};

// Role detection by checking if email exists in admin/employer collections
export async function detectUserRole(email: string | null): Promise<UserRole> {
  if (!email) return "user";

  const emailLower = email.toLowerCase();

  // Check if email exists in admins collection
  const adminsRef = collection(db, "admins");
  const adminQuery = query(adminsRef, where("email", "==", emailLower));
  const adminSnapshot = await getDocs(adminQuery);
  
  if (!adminSnapshot.empty) {
    return "admin";
  }

  // Check if email exists in employers collection
  const employersRef = collection(db, "employers");
  const employerQuery = query(employersRef, where("email", "==", emailLower));
  const employerSnapshot = await getDocs(employerQuery);
  
  if (!employerSnapshot.empty) {
    return "employer";
  }

  // Default role is user
  return "user";
}

// Get user data from users collection
export async function getUserData(uid: string): Promise<UserData | null> {
  const userDoc = await getDoc(doc(db, "users", uid));
  if (userDoc.exists()) {
    return userDoc.data() as UserData;
  }
  return null;
}

// Get admin data
export async function getAdminData(uid: string): Promise<AdminData | null> {
  const adminDoc = await getDoc(doc(db, "admins", uid));
  if (adminDoc.exists()) {
    return adminDoc.data() as AdminData;
  }
  return null;
}

// Get employer data
export async function getEmployerData(uid: string): Promise<EmployerData | null> {
  const employerDoc = await getDoc(doc(db, "employers", uid));
  if (employerDoc.exists()) {
    return employerDoc.data() as EmployerData;
  }
  return null;
}

// Create user document in users collection (called on signup)
export async function createUserDocument(
  user: FirebaseUser,
  fullName: string,
  provider: "password" | "google"
): Promise<void> {
  const userRef = doc(db, "users", user.uid);
  await setDoc(userRef, {
    uid:           user.uid,
    fullName:      fullName,
    email:         user.email,
    photoURL:      user.photoURL ?? "",
    createdAt:     serverTimestamp(),
    provider:      provider,
    emailVerified: user.emailVerified,
  });
}

// Sign up with email/password
export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create user document in users collection
    await createUserDocument(userCredential.user, fullName, "password");
    
    return { success: true };
  } catch (error: any) {
    console.error("Signup error:", error);
    return { success: false, error: error.message };
  }
}

// Sign in with email/password
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Sign in with Google
export async function signInWithGoogle(): Promise<{ success: boolean; role?: UserRole; error?: string }> {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const { user } = userCredential;

    // Detect role based on admin / employer collections
    const role = await detectUserRole(user.email);

    // If new user, create document in users collection
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      await createUserDocument(
        user,
        user.displayName || "User",
        "google"
      );
    }

    return { success: true, role };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Sign out
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

// Resend verification email
export async function resendVerificationEmail(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    if (userCredential.user.emailVerified) {
      await firebaseSignOut(auth);
      return { success: false, error: "Email is already verified." };
    }
    
    await sendEmailVerification(userCredential.user);
    await firebaseSignOut(auth);
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Get redirect path based on role
export function getRedirectPath(role: UserRole): string {
  switch (role) {
    case "admin":    return "/admin";
    case "employer": return "/employer";
    default:         return "/dashboard";
  }
}

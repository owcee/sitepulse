// Authentication Service for SitePulse
// Handles user authentication and profile management with role-based access

import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { getUserProfile } from '../utils/user';

/**
 * Sign in existing user with email and password
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<User>} User object with role and profile data
 */
export async function signIn(email, password) {
  try {
    // Sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Fetch user profile from Firestore
    const userData = await getUserProfile(firebaseUser.uid);
    
    if (!userData) {
      throw new Error('User profile not found. Please contact support.');
    }

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      name: userData.name,
      role: userData.role,
      projectId: userData.projectId || null,
      profileImage: userData.profileImage || undefined
    };
  } catch (error) {
    console.error('Sign in error:', error);
    
    // Provide user-friendly error messages
    if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email address.');
    } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      throw new Error('Wrong password');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address format.');
    } else if (error.code === 'auth/user-disabled') {
      throw new Error('This account has been disabled.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed attempts. Please try again later.');
    } else {
      throw new Error(error.message || 'Failed to sign in. Please try again.');
    }
  }
}

/**
 * Create new user account with email and password
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @param {Object} userData - Additional user data (name, role, projectId)
 * @returns {Promise<User>} Created user object
 */
export async function signUp(email, password, userData) {
  try {
    // Create Firebase Auth account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Prepare user profile data
    const profileData = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      name: userData.name,
      role: userData.role,
      projectId: userData.projectId || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Save user profile to appropriate collection based on role
    const collectionName = userData.role === 'engineer' ? 'engineer_accounts' : 'worker_accounts';
    await setDoc(doc(db, collectionName, firebaseUser.uid), profileData);

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      name: userData.name,
      role: userData.role,
      projectId: userData.projectId || null
    };
  } catch (error) {
    console.error('Sign up error:', error);
    
    // Provide user-friendly error messages
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('An account with this email already exists.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address format.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password is too weak. Use at least 6 characters.');
    } else {
      throw new Error(error.message || 'Failed to create account. Please try again.');
    }
  }
}

/**
 * Sign out current user
 * @returns {Promise<void>}
 */
export async function signOutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw new Error('Failed to sign out. Please try again.');
  }
}

/**
 * Listen for authentication state changes
 * @param {Function} callback - Callback function that receives user object or null
 * @returns {Function} Unsubscribe function
 */
export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        // User is signed in, fetch their profile
        const userData = await getUserProfile(firebaseUser.uid);
        
        if (userData) {
          callback({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: userData.name,
            role: userData.role,
            projectId: userData.projectId || null,
            profileImage: userData.profileImage || undefined
          });
        } else {
          // Profile not found, sign out
          console.error('User profile not found in Firestore');
          callback(null);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        callback(null);
      }
    } else {
      // User is signed out
      callback(null);
    }
  });
}

/**
 * Get current authenticated user
 * @returns {Promise<User|null>} Current user object or null
 */
export async function getCurrentUser() {
  const firebaseUser = auth.currentUser;
  
  if (!firebaseUser) {
    return null;
  }

  try {
    const userData = await getUserProfile(firebaseUser.uid);
    
    if (!userData) {
      return null;
    }

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      name: userData.name,
      role: userData.role,
      projectId: userData.projectId || null,
      profileImage: userData.profileImage || undefined
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Send password reset email to user
 * @param {string} email - User's email address
 * @returns {Promise<void>}
 */
export async function resetPassword(email) {
  try {
    if (!email || !email.trim()) {
      throw new Error('Please enter your email address.');
    }
    
    if (!email.includes('@gmail.com')) {
      throw new Error('Please use a Gmail address (@gmail.com)');
    }

    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Password reset error:', error);
    
    // Provide user-friendly error messages
    if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email address.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address format.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many requests. Please try again later.');
    } else {
      throw new Error(error.message || 'Failed to send password reset email. Please try again.');
    }
  }
}

// getUserProfile is now imported from utils/user.ts




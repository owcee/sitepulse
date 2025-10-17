// Firebase Configuration for SitePulse
// Using Firebase SDK v9+ modular API for React Native/Expo compatibility

import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Firebase configuration from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyBnCa0kuR39LMNlJb_toNDlRDhfCXUsMdU",
  authDomain: "sitepulse-2d882.firebaseapp.com",
  projectId: "sitepulse-2d882",
  storageBucket: "sitepulse-2d882.appspot.com",
  messagingSenderId: "675231551037",
  appId: "1:675231551037:web:2c9f125bacc84264e3e454",
  measurementId: "G-37NWZXRDBS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence for React Native
let auth;
if (Platform.OS !== 'web') {
  // Only import react-native persistence on native platforms to avoid web bundler errors
  const { getReactNativePersistence } = require('firebase/auth/react-native');
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} else {
  auth = getAuth(app);
  // Use browser local persistence for web
  setPersistence(auth, browserLocalPersistence);
}

// Initialize Firestore
const db = getFirestore(app);

// Initialize Firebase Storage
const storage = getStorage(app);

// Enable offline persistence for web
if (Platform.OS === 'web') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Persistence not available in this browser');
    }
  });
}

export { auth, db, storage };
export default app;


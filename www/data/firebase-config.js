/* Firebase settings for student accounts.
   Paste the config object from: Firebase console → Project settings → Your apps → Web app → "SDK setup and configuration" → Config.
   These values identify your project; they are not secret passwords. Data is protected by firestore.rules.
   Leave it as null to run the app without accounts (local mode, progress stays on the phone). */
window.UDL_FIREBASE_CONFIG = window.UDL_FIREBASE_CONFIG || null;
/* Example:
window.UDL_FIREBASE_CONFIG = window.UDL_FIREBASE_CONFIG || {
  apiKey: "AIza...",
  authDomain: "urban-digital-learning.firebaseapp.com",
  projectId: "urban-digital-learning",
  storageBucket: "urban-digital-learning.firebasestorage.app",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123"
};
*/

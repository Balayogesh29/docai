/**
 * Helper to map raw Firebase Authentication error codes into human-readable,
 * actionable error messages for the user interface and developer console.
 */
export const getFriendlyAuthErrorMessage = (error) => {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const code = error.code || '';
  const message = error.message || '';

  console.warn(`[Firebase Auth Error Code]: ${code}`, message);

  switch (code) {
    case 'auth/configuration-not-found':
      return 'Firebase Authentication configuration not found. Please ensure Email/Password and Google providers are enabled in your Firebase Console (Authentication > Sign-in method).';
    
    case 'auth/operation-not-allowed':
      return 'This sign-in method is disabled in your Firebase project. Enable Email/Password and Google sign-in in the Firebase Console.';

    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for Firebase Auth. Add "localhost" to your Firebase Console under Authentication > Settings > Authorized domains.';

    case 'auth/invalid-api-key':
      return 'Invalid Firebase API Key. Please verify your VITE_FIREBASE_API_KEY setting in frontend/.env.';

    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completing authentication. Please try again.';

    case 'auth/cancelled-popup-request':
      return 'Sign-in popup request was cancelled. Please try again.';

    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups for this site and try again.';

    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Invalid email or password. Please check your credentials and try again.';

    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in instead.';

    case 'auth/invalid-email':
      return 'Please enter a valid email address.';

    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';

    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection and try again.';

    default:
      if (message.includes('configuration-not-found')) {
        return 'Firebase Auth setup missing. Please enable sign-in providers in your Firebase Console.';
      }
      return message || 'Authentication failed. Please try again.';
  }
};

import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';

const GOOGLE_NATIVE_WEB_CLIENT_ID = String(
  import.meta.env.VITE_GOOGLE_NATIVE_WEB_CLIENT_ID || ''
).trim();

let googleInitialization = null;

export const isNativeAndroidGoogleSignIn = () => (
  Capacitor.isNativePlatform()
  && Capacitor.getPlatform() === 'android'
);

const isUserCancellation = (error) => {
  const code = String(error?.code || error?.name || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();

  return code.includes('CANCEL')
    || message.includes('cancelled')
    || message.includes('canceled')
    || message.includes('user closed');
};

const initializeGoogleSignIn = () => {
  if (!GOOGLE_NATIVE_WEB_CLIENT_ID) {
    throw new Error('Native Google sign-in is not configured for this app.');
  }

  if (!googleInitialization) {
    googleInitialization = SocialLogin.initialize({
      google: {
        // Android Credential Manager requires the Web application's client ID
        // as the ID-token audience; the Android client ID stays in Google Cloud.
        webClientId: GOOGLE_NATIVE_WEB_CLIENT_ID,
        mode: 'online',
      },
    }).catch((error) => {
      googleInitialization = null;
      throw error;
    });
  }

  return googleInitialization;
};

/**
 * Returns a native Google ID token on Android, or null when the user cancels.
 * This function intentionally has no web fallback: browser OAuth stays in the
 * existing auth adapter path.
 */
export const getNativeAndroidGoogleIdToken = async () => {
  if (!isNativeAndroidGoogleSignIn()) return null;

  try {
    await initializeGoogleSignIn();
    const login = await SocialLogin.login({
      provider: 'google',
      options: {
        scopes: ['email', 'profile'],
        style: 'standard',
        filterByAuthorizedAccounts: false,
      },
    });
    const idToken = login?.result && 'idToken' in login.result
      ? login.result.idToken
      : null;

    if (!idToken) {
      throw new Error('Google did not return an identity credential.');
    }

    return idToken;
  } catch (error) {
    if (isUserCancellation(error)) return null;
    throw error;
  }
};

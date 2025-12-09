// ==============================================
// PLUGSPACE.IO TITAN v1.4 - FIREBASE ADMIN
// ==============================================

import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
    console.info('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error);
  }
}

export const firebaseAdmin = admin;
export const firebaseAuth = admin.auth();

// ============ TOKEN VERIFICATION ============

export interface DecodedToken {
  uid: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  iat: number;
  exp: number;
}

export async function verifyFirebaseToken(
  idToken: string
): Promise<DecodedToken | null> {
  try {
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      email_verified: decodedToken.email_verified,
      name: decodedToken.name,
      picture: decodedToken.picture,
      iat: decodedToken.iat,
      exp: decodedToken.exp,
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// ============ USER MANAGEMENT ============

export async function createFirebaseUser(
  email: string,
  password: string,
  displayName?: string
): Promise<string> {
  const userRecord = await firebaseAuth.createUser({
    email,
    password,
    displayName,
    emailVerified: false,
  });
  return userRecord.uid;
}

export async function updateFirebaseUser(
  uid: string,
  updates: {
    email?: string;
    displayName?: string;
    photoURL?: string;
    disabled?: boolean;
  }
): Promise<void> {
  await firebaseAuth.updateUser(uid, updates);
}

export async function deleteFirebaseUser(uid: string): Promise<void> {
  await firebaseAuth.deleteUser(uid);
}

export async function getFirebaseUser(uid: string) {
  try {
    return await firebaseAuth.getUser(uid);
  } catch {
    return null;
  }
}

export async function setCustomClaims(
  uid: string,
  claims: Record<string, unknown>
): Promise<void> {
  await firebaseAuth.setCustomUserClaims(uid, claims);
}

export async function revokeRefreshTokens(uid: string): Promise<void> {
  await firebaseAuth.revokeRefreshTokens(uid);
}

// ============ EMAIL VERIFICATION ============

export async function generateEmailVerificationLink(
  email: string
): Promise<string> {
  return firebaseAuth.generateEmailVerificationLink(email);
}

export async function generatePasswordResetLink(
  email: string
): Promise<string> {
  return firebaseAuth.generatePasswordResetLink(email);
}

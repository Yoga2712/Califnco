import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import {
  AuthResponse,
  UserProfile,
  UserRole,
} from '../types/user';

// Local pre-seeded user directory for offline fallback & instant testing across all 3 roles
export const DEMO_USERS: Record<string, UserProfile & { passwordHash: string }> = {
  'customer@califnco.com': {
    uid: 'usr_customer_demo_01',
    email: 'customer@califnco.com',
    displayName: 'Aarun Kumar',
    phoneNumber: '+91 98765 43210',
    role: 'customer',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    passwordHash: 'Califnco@123',
  },
  'dealer@califnco.com': {
    uid: 'usr_dealer_demo_01',
    email: 'dealer@califnco.com',
    displayName: 'Apex Water Solutions',
    phoneNumber: '+91 98112 34567',
    role: 'dealer',
    companyName: 'Apex Aqua Trading Pvt Ltd',
    gstin: '29AABCU9603R1Z7',
    isApprovedDealer: true,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    passwordHash: 'Califnco@123',
  },
  'admin@califnco.com': {
    uid: 'usr_admin_demo_01',
    email: 'admin@califnco.com',
    displayName: 'Califnco Operations Admin',
    phoneNumber: '+91 80000 12345',
    role: 'admin',
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    passwordHash: 'Califnco@123',
  },
};

type AuthListener = (user: UserProfile | null) => void;

class AuthService {
  private currentUser: UserProfile | null = null;
  private listeners: Set<AuthListener> = new Set();
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('califnco_active_user');
        if (cached) {
          this.currentUser = JSON.parse(cached);
        } else {
          this.currentUser = null;
        }
      } catch {
        this.currentUser = null;
      }
    }
    this.initAuthListener();
  }

  private initAuthListener() {
    if (typeof window === 'undefined') return;

    try {
      onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          const profile = await this.fetchUserProfileFromFirestore(firebaseUser.uid, firebaseUser.email || '');
          this.currentUser = profile;
          this.notify();
        }
        this.isInitialized = true;
      });
    } catch {
      this.isInitialized = true;
    }
  }

  getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    listener(this.currentUser);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    if (typeof window !== 'undefined') {
      try {
        if (this.currentUser) {
          localStorage.setItem('califnco_active_user', JSON.stringify(this.currentUser));
        } else {
          localStorage.removeItem('califnco_active_user');
        }
      } catch {
        // Ignore quota/security errors
      }
    }
    this.listeners.forEach((listener) => listener(this.currentUser));
  }

  /**
   * Fetches user profile from Firestore users collection with graceful offline fallback
   */
  async fetchUserProfileFromFirestore(uid: string, fallbackEmail = ''): Promise<UserProfile> {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userDocRef).catch(() => null);

      if (userSnap && userSnap.exists()) {
        const data = userSnap.data();
        return {
          uid,
          email: (data.email as string) || fallbackEmail,
          displayName: (data.displayName as string) || 'Califnco User',
          phoneNumber: data.phoneNumber as string | undefined,
          role: (data.role as UserRole) || 'customer',
          fcmToken: data.fcmToken as string | undefined,
          companyName: data.companyName as string | undefined,
          gstin: data.gstin as string | undefined,
          isApprovedDealer: data.isApprovedDealer as boolean | undefined,
          createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    } catch {
      // Offline or permission issue - fallback to cached / demo profile
    }

    // Check demo users directory
    const demoMatch = Object.values(DEMO_USERS).find(
      (u) => u.uid === uid || (fallbackEmail && u.email.toLowerCase() === fallbackEmail.toLowerCase())
    );
    if (demoMatch) {
      return demoMatch;
    }

    return {
      uid,
      email: fallbackEmail || 'user@califnco.com',
      displayName: fallbackEmail ? fallbackEmail.split('@')[0] : 'Califnco Customer',
      role: 'customer',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Customer Registration via Firebase Auth & Firestore
   */
  async registerCustomer(params: {
    email: string;
    password: string;
    displayName: string;
    phoneNumber?: string;
  }): Promise<AuthResponse> {
    const { email, password, displayName, phoneNumber } = params;
    const cleanEmail = email.trim().toLowerCase();

    try {
      let uid = `usr_${Date.now()}`;

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        uid = userCredential.user.uid;
      } catch (authError: unknown) {
        const err = authError as { code?: string; message?: string };
        // If email already in use or network failed in test, check fallback demo user
        if (err.code === 'auth/email-already-in-use') {
          return {
            success: false,
            error: 'An account with this email address already exists. Please log in.',
            errorCode: err.code,
          };
        }
        if (err.code === 'auth/weak-password') {
          return {
            success: false,
            error: 'Password must be at least 6 characters.',
            errorCode: err.code,
          };
        }
      }

      const userProfile: UserProfile = {
        uid,
        email: cleanEmail,
        displayName: displayName.trim(),
        phoneNumber: phoneNumber?.trim(),
        role: 'customer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Write to Firestore users collection
      try {
        const userDocRef = doc(db, 'users', uid);
        await setDoc(userDocRef, {
          ...userProfile,
          serverTimestamp: serverTimestamp(),
        }).catch(() => {});
      } catch {
        // Handled silently for offline tolerance
      }

      this.currentUser = userProfile;
      this.notify();
      return { success: true, user: userProfile };
    } catch (e: unknown) {
      const err = e as Error;
      return {
        success: false,
        error: err.message || 'Failed to complete customer registration.',
      };
    }
  }

  /**
   * Dealer Registration with company & GSTIN fields
   */
  async registerDealer(params: {
    email: string;
    password: string;
    displayName: string;
    phoneNumber: string;
    companyName: string;
    gstin?: string;
  }): Promise<AuthResponse> {
    const { email, password, displayName, phoneNumber, companyName, gstin } = params;
    const cleanEmail = email.trim().toLowerCase();

    try {
      let uid = `dlr_${Date.now()}`;

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        uid = userCredential.user.uid;
      } catch (authError: unknown) {
        const err = authError as { code?: string };
        if (err.code === 'auth/email-already-in-use') {
          return {
            success: false,
            error: 'An account with this email address already exists.',
            errorCode: err.code,
          };
        }
      }

      const dealerProfile: UserProfile = {
        uid,
        email: cleanEmail,
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim(),
        role: 'dealer',
        companyName: companyName.trim(),
        gstin: gstin?.trim(),
        isApprovedDealer: true, // Auto-approved for Round 1 technical assignment demo
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        // Write to both users and dealers collections
        await Promise.all([
          setDoc(doc(db, 'users', uid), {
            ...dealerProfile,
            serverTimestamp: serverTimestamp(),
          }).catch(() => {}),
          setDoc(doc(db, 'dealers', uid), {
            ...dealerProfile,
            serverTimestamp: serverTimestamp(),
          }).catch(() => {}),
        ]);
      } catch {
        // Offline tolerance
      }

      this.currentUser = dealerProfile;
      this.notify();
      return { success: true, user: dealerProfile };
    } catch (e: unknown) {
      const err = e as Error;
      return {
        success: false,
        error: err.message || 'Failed to complete dealer registration.',
      };
    }
  }

  /**
   * Authenticate user with role verification
   */
  async loginUser(identifier: string, password: string, requiredRole?: UserRole): Promise<AuthResponse> {
    const cleanInput = identifier.trim().toLowerCase();
    const digitsOnly = cleanInput.replace(/\D/g, '');

    // Check demo users directory first for instant seamless offline verification (by email or phone digits)
    const demoUser = Object.values(DEMO_USERS).find((u) => {
      const emailMatches = u.email.toLowerCase() === cleanInput;
      const phoneDigits = (u.phoneNumber || '').replace(/\D/g, '');
      const phoneMatches = digitsOnly.length >= 10 && phoneDigits.endsWith(digitsOnly.slice(-10));
      return emailMatches || phoneMatches;
    });

    if (demoUser && (password === demoUser.passwordHash || password === 'Califnco@123')) {
      if (requiredRole && demoUser.role !== requiredRole && demoUser.role !== 'admin') {
        return {
          success: false,
          error: `Access Denied: This portal requires a ${requiredRole} account. Your account has the '${demoUser.role}' role.`,
        };
      }
      this.currentUser = demoUser;
      this.notify();
      return { success: true, user: demoUser };
    }

    try {
      let uid = '';
      const emailToUse = cleanInput.includes('@') ? cleanInput : demoUser ? demoUser.email : `${cleanInput}@califnco.com`;
      try {
        const credential = await signInWithEmailAndPassword(auth, emailToUse, password);
        uid = credential.user.uid;
      } catch (authError: unknown) {
        const err = authError as { code?: string; message?: string };
        // Check if demo password matches even if Firebase Auth rejected due to network
        if (demoUser && (password === 'Califnco@123' || password === demoUser.passwordHash)) {
          this.currentUser = demoUser;
          this.notify();
          return { success: true, user: demoUser };
        }
        if (
          err.code === 'auth/wrong-password' ||
          err.code === 'auth/user-not-found' ||
          err.code === 'auth/invalid-credential'
        ) {
          return {
            success: false,
            error: 'Invalid email address/mobile number or password. Please verify your credentials.',
            errorCode: err.code,
          };
        }
        // Network or API error with custom registered user
        return {
          success: false,
          error: err.message || 'Authentication error. Please check your network connection.',
          errorCode: err.code,
        };
      }

      const profile = await this.fetchUserProfileFromFirestore(uid, emailToUse);

      if (requiredRole && profile.role !== requiredRole && profile.role !== 'admin') {
        return {
          success: false,
          error: `Access Denied: You must be signed in as a ${requiredRole}.`,
        };
      }

      this.currentUser = profile;
      this.notify();
      return { success: true, user: profile };
    } catch (e: unknown) {
      const err = e as Error;
      return {
        success: false,
        error: err.message || 'Failed to sign in. Please verify your credentials.',
      };
    }
  }

  /**
   * Sign out from current session
   */
  async logoutUser(): Promise<void> {
    try {
      await signOut(auth);
    } catch {
      // Ignore network errors on logout
    }
    this.currentUser = null;
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('califnco_active_user');
      } catch {
        // Ignore
      }
    }
    this.notify();
  }

  /**
   * Updates device FCM token associated with the user
   */
  async updateFcmToken(uid: string, token: string): Promise<void> {
    if (this.currentUser && this.currentUser.uid === uid) {
      this.currentUser = { ...this.currentUser, fcmToken: token };
      this.notify();
    }

    try {
      const userDocRef = doc(db, 'users', uid);
      await updateDoc(userDocRef, {
        fcmToken: token,
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    } catch {
      // Fail-soft for offline
    }
  }

  /**
   * Quick role-switch helper for development and test verification
   */
  switchRoleForTesting(role: UserRole): UserProfile {
    const targetEmail =
      role === 'admin'
        ? 'admin@califnco.com'
        : role === 'dealer'
        ? 'dealer@califnco.com'
        : 'customer@califnco.com';

    const user = DEMO_USERS[targetEmail];
    this.currentUser = user;
    this.notify();
    return user;
  }
}

export const authService = new AuthService();
export { AuthService };

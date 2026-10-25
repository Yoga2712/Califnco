import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { authService } from '../services/authService';
import { UserProfile, UserRole } from '../types/user';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isCustomer: boolean;
  isDealer: boolean;
  isAdmin: boolean;
  login: (email: string, password: string, requiredRole?: UserRole) => Promise<boolean>;
  registerCustomer: (params: {
    email: string;
    password: string;
    displayName: string;
    phoneNumber?: string;
  }) => Promise<boolean>;
  registerDealer: (params: {
    email: string;
    password: string;
    displayName: string;
    phoneNumber: string;
    companyName: string;
    gstin?: string;
  }) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  switchRoleForTesting: (role: UserRole) => void;
  updateFcmToken: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => authService.getCurrentUser());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = authService.subscribe((updatedUser) => {
      setUser(updatedUser);
    });
    return unsubscribe;
  }, []);

  const login = useCallback(
    async (email: string, password: string, requiredRole?: UserRole): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await authService.loginUser(email, password, requiredRole);
        if (response.success && response.user) {
          setUser(response.user);
          return true;
        } else {
          setError(response.error || 'Invalid credentials.');
          return false;
        }
      } catch (err: unknown) {
        const e = err as Error;
        setError(e.message || 'Login failed.');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const registerCustomer = useCallback(
    async (params: {
      email: string;
      password: string;
      displayName: string;
      phoneNumber?: string;
    }): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await authService.registerCustomer(params);
        if (response.success && response.user) {
          setUser(response.user);
          return true;
        } else {
          setError(response.error || 'Registration failed.');
          return false;
        }
      } catch (err: unknown) {
        const e = err as Error;
        setError(e.message || 'Registration failed.');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const registerDealer = useCallback(
    async (params: {
      email: string;
      password: string;
      displayName: string;
      phoneNumber: string;
      companyName: string;
      gstin?: string;
    }): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await authService.registerDealer(params);
        if (response.success && response.user) {
          setUser(response.user);
          return true;
        } else {
          setError(response.error || 'Dealer registration failed.');
          return false;
        }
      } catch (err: unknown) {
        const e = err as Error;
        setError(e.message || 'Dealer registration failed.');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logoutUser();
      setUser(null);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const switchRoleForTesting = useCallback((role: UserRole) => {
    const updatedUser = authService.switchRoleForTesting(role);
    setUser(updatedUser);
    setError(null);
  }, []);

  const updateFcmToken = useCallback(
    async (token: string) => {
      if (user?.uid) {
        await authService.updateFcmToken(user.uid, token);
      }
    },
    [user?.uid]
  );

  const role = user?.role || null;
  const isAuthenticated = user !== null;
  const isCustomer = role === 'customer';
  const isDealer = role === 'dealer';
  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        isLoading,
        error,
        isCustomer,
        isDealer,
        isAdmin,
        login,
        registerCustomer,
        registerDealer,
        logout,
        clearError,
        switchRoleForTesting,
        updateFcmToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

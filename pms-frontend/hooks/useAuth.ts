import { useState, useEffect } from 'react';
import { LoginService, UsersService, OpenAPI, type Token, type UserPublic } from '../src/client';

export interface AuthUser {
  id: string;
  email: string;
  phone: string;
  name: string;
  isVerified: boolean;
  createdAt: Date;
}

interface SignupData {
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface LoginData {
  emailOrPhone: string;
  password: string;
}

export function useAuth() {
  const STORAGE_KEY = 'portfoliomax_user';
  const AUTH_EVENT = 'portfoliomax-auth-change';

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('portfoliomax_token');
        if (token) {
          OpenAPI.TOKEN = token as unknown as any;
          const me = await UsersService.readUserMe();
          const restoredUser: AuthUser = {
            id: (me as UserPublic).id,
            email: (me as UserPublic).email,
            phone: '',
            name: (me as UserPublic).full_name || (me as UserPublic).email.split('@')[0],
            isVerified: true,
            createdAt: new Date(),
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(restoredUser));
          setUser(restoredUser);
        } else {
          const savedUser = localStorage.getItem(STORAGE_KEY);
          if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            if (parsedUser.createdAt) parsedUser.createdAt = new Date(parsedUser.createdAt);
            setUser(parsedUser);
          }
        }
      } catch (error) {
        localStorage.removeItem('portfoliomax_token');
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    const timer = setTimeout(checkAuth, 50);
    return () => clearTimeout(timer);
  }, []);

  // Keep multiple hook instances in sync (e.g., App and LoginPage) using a custom event
  useEffect(() => {
    const handleAuthEvent = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.createdAt) parsed.createdAt = new Date(parsed.createdAt);
          setUser(parsed);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        handleAuthEvent();
      }
    };

    window.addEventListener(AUTH_EVENT, handleAuthEvent as EventListener);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(AUTH_EVENT, handleAuthEvent as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const broadcastAuthChange = () => {
    try {
      window.dispatchEvent(new CustomEvent(AUTH_EVENT));
    } catch {
      // no-op
    }
  };

  const signup = async (data: SignupData): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);
    try {
      if (data.password !== data.confirmPassword) throw new Error('Passwords do not match');
      if (data.password.length < 8) throw new Error('Password must be at least 8 characters long');

      await UsersService.registerUser({
        requestBody: {
          email: data.email,
          password: data.password,
          full_name: data.email.split('@')[0],
        },
      });

      // Auto-login after signup
      const token = await LoginService.loginAccessToken({
        formData: {
          username: data.email,
          password: data.password,
        },
      });

      const accessToken = (token as Token).access_token;
      OpenAPI.TOKEN = accessToken as unknown as any;

      const me = await UsersService.readUserMe();
      const newUser: AuthUser = {
        id: (me as UserPublic).id,
        email: (me as UserPublic).email,
        phone: data.phone,
        name: (me as UserPublic).full_name || data.email.split('@')[0],
        isVerified: true,
        createdAt: new Date(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      localStorage.setItem('portfoliomax_token', accessToken);
      setUser(newUser);
      setIsLoading(false);
      broadcastAuthChange();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Signup failed';
      setError(errorMessage);
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  const login = async (data: LoginData): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await LoginService.loginAccessToken({
        formData: {
          username: data.emailOrPhone,
          password: data.password,
        },
      });

      const accessToken = (token as Token).access_token;
      OpenAPI.TOKEN = accessToken as unknown as any;

      const me = await UsersService.readUserMe();
      const newUser: AuthUser = {
        id: (me as UserPublic).id,
        email: (me as UserPublic).email,
        phone: '',
        name: (me as UserPublic).full_name || (me as UserPublic).email.split('@')[0],
        isVerified: true,
        createdAt: new Date(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      localStorage.setItem('portfoliomax_token', accessToken);
      setUser(newUser);
      setIsLoading(false);
      broadcastAuthChange();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setError(errorMessage);
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('portfoliomax_token');
    OpenAPI.TOKEN = undefined as unknown as any;
    setUser(null);
    setError(null);
    setIsLoading(false);
    broadcastAuthChange();
  };

  const clearError = () => {
    setError(null);
  };

  // Simplified authentication check - just check if user exists
  const isAuthenticated = !!user;

  // Debug log current state
  console.log('🔄 useAuth state:', { 
    hasUser: !!user, 
    isLoading, 
    isAuthenticated, 
    error: !!error 
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    signup,
    login,
    logout,
    clearError
  };
}
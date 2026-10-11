import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchUserAttributes, getCurrentUser, signOut as amplifySignOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { cloudEnabled } from '../utils/amplify';

export type AuthStatus = 'disabled' | 'loading' | 'signedOut' | 'signedIn';

interface AuthValue {
  status: AuthStatus;
  email?: string;
  signOut: () => Promise<void>;
  signInOpen: boolean;
  openSignIn: () => void;
  closeSignIn: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<AuthStatus>(cloudEnabled ? 'loading' : 'disabled');
  const [email, setEmail] = useState<string | undefined>();
  const [signInOpen, setSignInOpen] = useState(false);

  useEffect(() => {
    if (!cloudEnabled) return;
    let active = true;

    const markSignedOut = () => {
      setEmail(undefined);
      setStatus('signedOut');
    };

    const refresh = async () => {
      try {
        await getCurrentUser();
      } catch {
        if (active) markSignedOut();
        return;
      }
      const attributes = await fetchUserAttributes().catch(() => undefined);
      if (!active) return;
      setEmail(attributes?.email);
      setStatus('signedIn');
    };

    refresh();

    const stopListening = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedIn') {
        setSignInOpen(false);
        refresh();
      } else if (payload.event === 'signedOut' || payload.event === 'tokenRefresh_failure') {
        markSignedOut();
      }
    });

    return () => {
      active = false;
      stopListening();
    };
  }, []);

  const signOut = useCallback(() => amplifySignOut(), []);
  const openSignIn = useCallback(() => setSignInOpen(true), []);
  const closeSignIn = useCallback(() => setSignInOpen(false), []);

  const value = useMemo<AuthValue>(
    () => ({ status, email, signOut, signInOpen, openSignIn, closeSignIn }),
    [status, email, signOut, signInOpen, openSignIn, closeSignIn]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

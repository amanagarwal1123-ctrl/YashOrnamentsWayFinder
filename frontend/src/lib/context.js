import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AppContext = createContext(null);

// Synchronous restore — runs before first render so child guards never see stale false
function restoreAuth() {
  try {
    const savedUser = localStorage.getItem('nav_user');
    const savedToken = localStorage.getItem('nav_token');
    if (savedUser && savedToken) {
      return { user: JSON.parse(savedUser), isLoggedIn: true };
    }
  } catch {
    localStorage.removeItem('nav_user');
    localStorage.removeItem('nav_token');
  }
  return { user: null, isLoggedIn: false };
}

function restoreSession() {
  try {
    const savedSession = sessionStorage.getItem('nav_session');
    const savedBusiness = sessionStorage.getItem('nav_business');
    if (savedSession && savedBusiness) {
      return { session: JSON.parse(savedSession), business: JSON.parse(savedBusiness) };
    }
  } catch {
    sessionStorage.removeItem('nav_session');
    sessionStorage.removeItem('nav_business');
  }
  return { session: null, business: null };
}

const _auth = restoreAuth();
const _sess = restoreSession();

export function AppProvider({ children }) {
  const [session, setSession] = useState(_sess.session);
  const [business, setBusiness] = useState(_sess.business);
  const [user, setUser] = useState(_auth.user);
  const [isLoggedIn, setIsLoggedIn] = useState(_auth.isLoggedIn);

  useEffect(() => {
    document.title = 'Yash Ornaments WayFinder';
  }, []);

  useEffect(() => {
    if (business?.slug) {
      document.documentElement.setAttribute('data-business', business.slug);
    }
  }, [business]);

  const loginUser = useCallback((userData) => {
    setUser(userData);
    setIsLoggedIn(true);
    localStorage.setItem('nav_user', JSON.stringify(userData));
  }, []);

  const logoutUser = useCallback(() => {
    setUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem('nav_user');
    localStorage.removeItem('nav_token');
  }, []);

  const startSession = useCallback((sessionData, businessData) => {
    setSession(sessionData);
    setBusiness(businessData);
    sessionStorage.setItem('nav_session', JSON.stringify(sessionData));
    sessionStorage.setItem('nav_business', JSON.stringify(businessData));
  }, []);

  const updateSession = useCallback((updates) => {
    setSession(prev => {
      const updated = { ...prev, ...updates };
      sessionStorage.setItem('nav_session', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AppContext.Provider value={{
      session, business, user, isLoggedIn,
      startSession, updateSession, setBusiness,
      loginUser, logoutUser
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

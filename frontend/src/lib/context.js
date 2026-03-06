import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [session, setSession] = useState(null);
  const [business, setBusiness] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Set business theme on html element
  useEffect(() => {
    if (business?.slug) {
      document.documentElement.setAttribute('data-business', business.slug);
    }
  }, [business]);

  // Restore auth from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('nav_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        setUser(u);
        setIsLoggedIn(true);
      } catch (e) {
        localStorage.removeItem('nav_user');
      }
    }
  }, []);

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
    // Store in sessionStorage for persistence
    sessionStorage.setItem('nav_session', JSON.stringify(sessionData));
    sessionStorage.setItem('nav_business', JSON.stringify(businessData));
  }, []);

  // Restore session
  useEffect(() => {
    const savedSession = sessionStorage.getItem('nav_session');
    const savedBusiness = sessionStorage.getItem('nav_business');
    if (savedSession && savedBusiness) {
      try {
        setSession(JSON.parse(savedSession));
        setBusiness(JSON.parse(savedBusiness));
      } catch (e) {
        sessionStorage.removeItem('nav_session');
        sessionStorage.removeItem('nav_business');
      }
    }
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

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const cadastrar = async (email, password, nome) => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { nome } }
    });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password'
    });
    if (error) throw error;
  };

  const user = session?.user ?? null;
  const sessaoCache = user ? {
    id: user.id,
    email: user.email,
    nome: user.user_metadata?.nome || user.email?.split('@')[0]
  } : null;

  return (
    <AuthContext.Provider value={{ session, user, sessaoCache, login, cadastrar, logout, resetPassword, loading: session === undefined }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseEnabled } from './supabase'

interface AuthState {
  enabled: boolean
  session: Session | null
  userEmail: string | null
  loading: boolean
  signInMagicLink: (email: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  enabled: false, session: null, userEmail: null, loading: true,
  signInMagicLink: async () => ({ error: 'Auth not configured' }),
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(supabaseEnabled) // already false when Supabase is absent

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const signInMagicLink = async (email: string) => {
    if (!supabase) return { error: 'Sign-in is not configured.' }
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    return { error: error ? error.message : null }
  }

  const signOut = async () => { await supabase?.auth.signOut() }

  return (
    <AuthContext.Provider value={{
      enabled: supabaseEnabled, session, loading,
      userEmail: session?.user?.email ?? null,
      signInMagicLink, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)

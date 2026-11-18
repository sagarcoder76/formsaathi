import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseEnabled } from './supabase'

export interface SignUpMetadata {
  full_name?: string
  profile_type?: string
}

interface AuthState {
  enabled: boolean
  session: Session | null
  userEmail: string | null
  userName: string | null
  userProfileType: string | null
  loading: boolean
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>
  signUpWithPassword: (
    email: string,
    password: string,
    metadata?: SignUpMetadata,
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>
  signInMagicLink: (email: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  enabled: false,
  session: null,
  userEmail: null,
  userName: null,
  userProfileType: null,
  loading: true,
  signInWithPassword: async () => ({ error: 'Auth not configured' }),
  signUpWithPassword: async () => ({ error: 'Auth not configured', needsConfirmation: false }),
  signInMagicLink: async () => ({ error: 'Auth not configured' }),
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(supabaseEnabled)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const signInWithPassword = async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase authentication is not configured.' }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    return { error: error ? error.message : null }
  }

  const signUpWithPassword = async (
    email: string,
    password: string,
    metadata?: SignUpMetadata,
  ) => {
    if (!supabase) return { error: 'Supabase authentication is not configured.', needsConfirmation: false }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: metadata ?? {},
        emailRedirectTo: window.location.origin,
      },
    })
    if (error) return { error: error.message, needsConfirmation: false }
    return { error: null, needsConfirmation: !data.session }
  }

  const signInMagicLink = async (email: string) => {
    if (!supabase) return { error: 'Sign-in is not configured.' }
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    return { error: error ? error.message : null }
  }

  const signOut = async () => {
    await supabase?.auth.signOut()
  }

  const meta = (session?.user?.user_metadata ?? {}) as Record<string, unknown>
  const userName = typeof meta.full_name === 'string' && meta.full_name.trim() ? meta.full_name.trim() : null
  const userProfileType = typeof meta.profile_type === 'string' && meta.profile_type.trim() ? meta.profile_type.trim() : null

  return (
    <AuthContext.Provider
      value={{
        enabled: supabaseEnabled,
        session,
        loading,
        userEmail: session?.user?.email ?? null,
        userName,
        userProfileType,
        signInWithPassword,
        signUpWithPassword,
        signInMagicLink,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)

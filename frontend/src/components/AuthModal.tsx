import { useState } from 'react'
import { KeyRound, Loader2, Mail, MailCheck, UserPlus } from 'lucide-react'
import { useAuth } from '../lib/auth'
import Modal from './Modal'

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const { signInWithPassword, signUpWithPassword, signInMagicLink } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup' | 'magic'>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const [error, setError] = useState('')

  const submit = async () => {
    const cleanEmail = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Enter a valid email address.')
      return
    }
    if (mode !== 'magic' && password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setBusy(true)
    setError('')
    if (mode === 'login') {
      const { error: e } = await signInWithPassword(cleanEmail, password)
      setBusy(false)
      if (e) setError(e)
      else onClose()
    } else if (mode === 'signup') {
      const { error: e, needsConfirmation } = await signUpWithPassword(cleanEmail, password, {
        full_name: fullName.trim() || undefined,
      })
      setBusy(false)
      if (e) setError(e)
      else if (needsConfirmation) setSentTo(cleanEmail)
      else onClose()
    } else {
      const { error: e } = await signInMagicLink(cleanEmail)
      setBusy(false)
      if (e) setError(e)
      else setSentTo(cleanEmail)
    }
  }

  return (
    <Modal open onClose={onClose} maxWidth="max-w-md">
      <div className="p-6 md:p-8">
        <h2 className="text-xl font-bold flex items-center gap-2 text-navy-900 dark:text-white">
          {mode === 'signup' ? <UserPlus size={20} className="text-teal-500" /> : <KeyRound size={20} className="text-teal-500" />}
          {mode === 'login' ? 'Sign in to FormSaathi' : mode === 'signup' ? 'Create FormSaathi account' : 'Magic link sign-in'}
        </h2>

        {sentTo ? (
          <div className="mt-6 text-center py-4">
            <MailCheck size={44} className="mx-auto text-teal-500" />
            <p className="font-semibold mt-3">Check your inbox</p>
            <p className="text-sm text-muted dark:text-slate-400 mt-1 leading-relaxed">
              We sent a sign-in link to <b>{sentTo}</b>. Open it on this device to finish signing in.
            </p>
            <button onClick={onClose} className="mt-5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition">
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-1.5 mt-4 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
              <button type="button" onClick={() => { setMode('login'); setError('') }} className={`py-2 rounded-lg transition ${mode === 'login' ? 'bg-white dark:bg-slate-900 shadow-sm text-navy-900 dark:text-white' : 'text-slate-500'}`}>
                Login
              </button>
              <button type="button" onClick={() => { setMode('signup'); setError('') }} className={`py-2 rounded-lg transition ${mode === 'signup' ? 'bg-white dark:bg-slate-900 shadow-sm text-navy-900 dark:text-white' : 'text-slate-500'}`}>
                Sign up
              </button>
              <button type="button" onClick={() => { setMode('magic'); setError('') }} className={`py-2 rounded-lg transition ${mode === 'magic' ? 'bg-white dark:bg-slate-900 shadow-sm text-navy-900 dark:text-white' : 'text-slate-500'}`}>
                Magic link
              </button>
            </div>

            {mode === 'signup' && (
              <>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mt-4" htmlFor="auth-fullname">
                  Full name
                </label>
                <input
                  id="auth-fullname"
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Aarav Sharma"
                  className="w-full mt-1.5 border border-line dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-900 outline-none focus:border-teal-400"
                />
              </>
            )}

            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mt-4" htmlFor="auth-email">
              Email address
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !busy && submit()}
              placeholder="you@college.ac.in"
              className="w-full mt-1.5 border border-line dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-900 outline-none focus:border-teal-400"
            />

            {mode !== 'magic' && (
              <>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mt-4" htmlFor="auth-pass">
                  Password
                </label>
                <input
                  id="auth-pass"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !busy && submit()}
                  placeholder="Minimum 6 characters"
                  className="w-full mt-1.5 border border-line dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-900 outline-none focus:border-teal-400"
                />
              </>
            )}

            {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

            <button
              onClick={submit}
              disabled={busy}
              className="mt-4 w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white font-semibold px-5 py-3 rounded-xl flex items-center justify-center gap-2 transition"
            >
              {busy ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Please wait…
                </>
              ) : mode === 'login' ? (
                'Sign in'
              ) : mode === 'signup' ? (
                'Create account & sync'
              ) : (
                <>
                  <Mail size={16} /> Email me a magic link
                </>
              )}
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}

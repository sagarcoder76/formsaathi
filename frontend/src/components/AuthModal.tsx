import { useState } from 'react'
import { Mail, MailCheck, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/auth'
import Modal from './Modal'

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const { signInMagicLink } = useAuth()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const [error, setError] = useState('')

  const submit = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter a valid email address.'); return }
    setBusy(true); setError('')
    const { error: e } = await signInMagicLink(email)
    setBusy(false)
    if (e) setError(e)
    else setSentTo(email.trim())
  }

  return (
    <Modal open onClose={onClose} maxWidth="max-w-md">
      <div className="p-6 md:p-8">
        <h2 className="text-xl font-bold flex items-center gap-2 text-navy-900 dark:text-white"><Mail size={20} className="text-teal-500" /> Sign in or create account</h2>

        {sentTo ? (
          <div className="mt-6 text-center py-4">
            <MailCheck size={44} className="mx-auto text-teal-500" />
            <p className="font-semibold mt-3">Check your inbox</p>
            <p className="text-sm text-muted dark:text-slate-400 mt-1 leading-relaxed">
              We sent a magic link to <b>{sentTo}</b>. Open it on this device to sign in — no password needed.
            </p>
            <p className="text-xs text-slate-400 mt-3">Confirmations may take a minute and can land in spam.</p>
            <button onClick={onClose} className="mt-5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition active:scale-[.98]">Done</button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted dark:text-slate-400 mt-3 leading-relaxed">
              Sign in to sync your saved listings, tracker and searches across devices. Until then, everything keeps working offline in this browser.
            </p>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mt-5" htmlFor="auth-email">Email address</label>
            <input id="auth-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !busy && submit()}
              placeholder="you@college.ac.in"
              className="w-full mt-1.5 border border-line dark:border-slate-700 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-900 outline-none focus:border-teal-400 transition-colors" />
            {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
            <button onClick={submit} disabled={busy}
              className="mt-4 w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white font-semibold px-5 py-3 rounded-xl flex items-center justify-center gap-2 transition active:scale-[.98]">
              {busy ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : 'Email me a magic link'}
            </button>
            <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
              Passwordless email sign-in. We never post on your behalf or share your email. Google sign-in may be added later.
            </p>
          </>
        )}
      </div>
    </Modal>
  )
}

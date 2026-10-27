import { useState } from 'react'
import { X, Mail, MailCheck, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/auth'

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
    <div className="fixed inset-0 bg-black/50 z-40 flex items-end md:items-center justify-center p-0 md:p-6" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 md:p-8" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2"><Mail size={20} className="text-teal-500" /> Sign in or create account</h2>
          <button onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        {sentTo ? (
          <div className="mt-6 text-center py-4">
            <MailCheck size={44} className="mx-auto text-teal-500" />
            <p className="font-semibold mt-3">Check your inbox</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              We sent a magic link to <b>{sentTo}</b>. Open it on this device to sign in — no password needed.
            </p>
            <p className="text-xs text-slate-400 mt-3">Confirmations may take a minute and can land in spam.</p>
            <button onClick={onClose} className="mt-5 bg-[#0a1f44] hover:bg-[#12306b] text-white text-sm font-semibold px-6 py-2.5 rounded-xl">Done</button>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
              Sign in to sync your saved listings, tracker and searches across devices. Until then, everything keeps working offline in this browser.
            </p>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mt-5">Email address</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !busy && submit()}
              placeholder="you@college.ac.in"
              className="w-full mt-1 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-900 outline-none focus:border-teal-400"
            />
            {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
            <button onClick={submit} disabled={busy}
              className="mt-4 w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white font-semibold px-5 py-3 rounded-xl flex items-center justify-center gap-2">
              {busy ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : 'Email me a magic link'}
            </button>
            <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
              Passwordless email sign-in. We never post on your behalf or share your email. Google sign-in may be added later.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

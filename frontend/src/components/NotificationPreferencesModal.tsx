import { useEffect, useState } from 'react'
import { Bell, Mail, Smartphone, Loader2, CheckCircle2 } from 'lucide-react'
import Modal from './Modal'
import { getNotificationPreferences, upsertNotificationPreferences } from '../lib/cloud'
import { pushSupported, pushPermission, enablePush, disablePush, isPushEnabled } from '../lib/push'
import type { NotificationChannel, NotificationKind, NotificationPreferences } from '../types'

const DEFAULTS: NotificationPreferences = {
  deadline_inapp: true, deadline_email: false, deadline_push: false,
  matches_inapp: true, matches_email: false, matches_push: false,
  followup_inapp: true, followup_email: false, followup_push: false,
  health_inapp: true, health_email: false, health_push: false,
}

const KINDS: { kind: NotificationKind; label: string; hint: string }[] = [
  { kind: 'deadline', label: 'Deadline reminders', hint: 'Saved or tracked listings closing within 48 hours.' },
  { kind: 'matches', label: 'Saved-search matches', hint: 'Daily digest of new opportunities matching your saved searches.' },
  { kind: 'followup', label: 'Application follow-ups', hint: 'Nudge when an “applied” application has not moved for 7 days.' },
  { kind: 'health', label: 'Listing health', hint: 'When a listing you saved repeatedly fails link checks and is hidden.' },
]

const CHANNELS: { channel: NotificationChannel; label: string; icon: typeof Bell }[] = [
  { channel: 'inapp', label: 'In-app', icon: Bell },
  { channel: 'email', label: 'Email', icon: Mail },
  { channel: 'push', label: 'Push', icon: Smartphone },
]

function Toggle({ on, disabled, onClick }: { on: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200
        ${on ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

export default function NotificationPreferencesModal({ uid, open, onClose }: { uid: string; open: boolean; onClose: () => void }) {
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [pushOn, setPushOn] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const supported = pushSupported()

  useEffect(() => {
    if (!open) return
    let alive = true
    Promise.all([getNotificationPreferences(uid), supported ? isPushEnabled() : Promise.resolve(false)])
      .then(([stored, enabled]) => {
        if (!alive) return
        setPrefs(stored ?? DEFAULTS)
        setPushOn(enabled)
      })
      .catch(() => { if (alive) setError('Could not load your preferences. Check your connection and try again.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [open, supported, uid])

  const handleClose = () => {
    setLoading(true); setError(''); setSaved(false)
    onClose()
  }

  const flip = (kind: NotificationKind, channel: NotificationChannel) => {
    const key = `${kind}_${channel}` as keyof NotificationPreferences
    if (channel === 'push' && !pushOn) return
    setPrefs(p => ({ ...p, [key]: !p[key] }))
    setSaved(false)
  }

  const togglePush = async () => {
    setPushBusy(true); setError('')
    try {
      if (pushOn) {
        await disablePush(uid)
        setPushOn(false)
        setPrefs(p => ({ ...p, deadline_push: false, matches_push: false, followup_push: false }))
      } else {
        await enablePush(uid)
        setPushOn(true)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update push notifications.')
    } finally {
      setPushBusy(false)
    }
  }

  const save = async () => {
    setSaving(true); setError(''); setSaved(false)
    try {
      await upsertNotificationPreferences(uid, prefs)
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save preferences.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} maxWidth="max-w-2xl">
      <div className="p-5 md:p-6">
        <h2 className="font-display text-3xl font-bold">Notification preferences</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Choose how FormSaathi reaches you for each kind of alert.</p>

        {/* Push master control */}
        <div className="mt-4 rounded-xl border border-line dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div>
            <p className="text-sm font-bold flex items-center gap-2"><Smartphone size={15} className="text-teal-600" /> Browser push</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {supported
                ? pushOn ? 'Enabled on this device. Turn off to stop browser notifications.'
                  : pushPermission() === 'denied' ? 'Blocked in your browser — allow notifications in site settings.'
                  : 'Get alerts even when this tab is closed.'
                : 'Not supported by this browser — in-app and email alerts still work.'}
            </p>
          </div>
          {supported && (
            <button
              type="button"
              onClick={togglePush}
              disabled={pushBusy || pushPermission() === 'denied'}
              className={`text-sm font-semibold px-4 py-2 rounded-xl transition active:scale-[.98] shrink-0 disabled:opacity-50 flex items-center gap-2 ${pushOn ? 'bg-slate-100 dark:bg-slate-800 text-navy-900 dark:text-white' : 'bg-teal-500 hover:bg-teal-600 text-white'}`}
            >
              {pushBusy ? <Loader2 size={14} className="animate-spin" /> : pushOn ? 'Turn off push' : 'Enable push'}
            </button>
          )}
        </div>

        {/* Channel matrix */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-2 font-semibold">Alert</th>
                {CHANNELS.map(({ channel, label, icon: Icon }) => (
                  <th key={channel} className="py-2 px-2 font-semibold text-center">
                    <span className="inline-flex items-center gap-1"><Icon size={13} /> {label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {KINDS.map(({ kind, label, hint }) => (
                <tr key={kind} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-3 pr-2">
                    <p className="font-semibold text-sm">{label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-[15rem]">{hint}</p>
                  </td>
                  {CHANNELS.map(({ channel }) => {
                    const key = `${kind}_${channel}` as keyof NotificationPreferences
                    const disabled = channel === 'push' && !pushOn
                    return (
                      <td key={channel} className="py-3 px-2 text-center">
                        <div className="flex justify-center">
                          <Toggle on={Boolean(prefs[key])} disabled={disabled || loading} onClick={() => flip(kind, channel)} />
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-400 mt-3">
          Email delivery activates once the email service is connected; your choices are saved now and apply automatically.
        </p>

        {error && <p className="text-sm text-red-600 dark:text-red-400 mt-3">{error}</p>}

        <div className="flex items-center justify-end gap-3 mt-5">
          {saved && <span className="text-xs text-teal-600 font-semibold flex items-center gap-1"><CheckCircle2 size={13} /> Saved</span>}
          <button type="button" onClick={handleClose} className="text-sm font-semibold px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-navy-900 dark:text-white transition active:scale-[.98]">Close</button>
          <button type="button" onClick={save} disabled={saving || loading} className="text-sm font-semibold px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white flex items-center gap-2 transition active:scale-[.98]">
            {saving ? <Loader2 size={14} className="animate-spin" /> : 'Save preferences'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

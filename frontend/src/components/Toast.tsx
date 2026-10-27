import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'info'
interface Toast { id: number; kind: ToastKind; message: string }
interface ToastApi { push: (message: string, kind?: ToastKind) => void }

const ToastContext = createContext<ToastApi>({ push: () => {} })
// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext)

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info }
const TONE = {
  success: 'text-teal-600 dark:text-teal-400',
  error: 'text-red-600 dark:text-red-400',
  info: 'text-navy-700 dark:text-navy-300',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(0)

  const dismiss = useCallback((id: number) => setToasts(t => t.filter(x => x.id !== id)), [])

  const push = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = ++seq.current
    setToasts(t => [...t.slice(-3), { id, kind, message }])
    window.setTimeout(() => dismiss(id), 3600)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div aria-live="polite" aria-atomic="false"
        className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-[min(92vw,360px)]">
        <AnimatePresence>
          {toasts.map(t => {
            const Icon = ICONS[t.kind]
            return (
              <motion.div key={t.id}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.96 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                role="status"
                className="surface rounded-2xl shadow-lg shadow-navy-900/10 px-4 py-3 flex items-start gap-3">
                <Icon size={18} className={`shrink-0 mt-0.5 ${TONE[t.kind]}`} />
                <p className="text-sm font-medium flex-1 leading-snug">{t.message}</p>
                <button onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0">
                  <X size={15} />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

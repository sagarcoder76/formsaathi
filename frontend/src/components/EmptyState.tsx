import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface Props {
  image?: string
  imageAlt?: string
  icon?: ReactNode
  title: string
  body: string
  action?: ReactNode
  compact?: boolean
}

export default function EmptyState({ image, imageAlt = '', icon, title, body, action, compact }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`text-center bg-white dark:bg-slate-900 border border-dashed border-line dark:border-slate-700 rounded-3xl ${compact ? 'py-12 px-6' : 'py-14 px-6'}`}>
      {image ? (
        <div className="photo-frame photo-grade max-w-sm mx-auto aspect-[3/2] mb-6 shadow-sm shadow-navy-900/10">
          <img src={image} alt={imageAlt} loading="lazy" width={720} height={480} />
        </div>
      ) : icon ? (
        <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto mb-5">{icon}</div>
      ) : null}
      <h2 className="font-display text-2xl md:text-3xl text-navy-900 dark:text-white">{title}</h2>
      <p className="text-sm text-muted dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">{body}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </motion.div>
  )
}

import { useRef, useState } from 'react'
import { FileText, UploadCloud, X, Loader2 } from 'lucide-react'
import { extractTextFromFile, parseResume, MAX_RESUME_MB, type ParsedResume } from '../lib/resume'

export default function ResumeUploader({ variant, onParsed, onClose }: {
  variant: 'card' | 'modal'
  onParsed: (parsed: ParsedResume, fileName: string) => void
  onClose?: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setError(''); setParsing(true)
    try {
      const text = await extractTextFromFile(file)
      onParsed(parseResume(text), file.name)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read this file. Please try another resume.')
    } finally {
      setParsing(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const card = (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]) }}
      className={`rounded-2xl border-2 border-dashed p-6 text-center transition cursor-pointer ${dragging ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-teal-400'}`}
      onClick={() => !parsing && inputRef.current?.click()}
      role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      aria-label="Upload resume"
    >
      <input ref={inputRef} type="file" accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      <div className="mx-auto w-12 h-12 rounded-full bg-teal-50 dark:bg-teal-950 grid place-items-center mb-3">
        {parsing ? <Loader2 className="animate-spin text-teal-600" size={22} /> : <UploadCloud className="text-teal-600" size={22} />}
      </div>
      <p className="font-semibold text-sm">{parsing ? 'Reading your resume…' : 'Upload your resume'}</p>
      <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1.5 flex-wrap">
        <FileText size={13} /> PDF, DOCX or TXT • max {MAX_RESUME_MB}MB • parsed privately in your browser
      </p>
      {error && <p className="text-xs text-red-600 mt-3 bg-red-50 dark:bg-red-950/60 rounded-lg px-3 py-2">{error}</p>}
    </div>
  )

  if (variant === 'card') return card
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-6" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl md:rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Import from resume</h2>
          <button onClick={onClose} aria-label="Close uploader"><X size={20} /></button>
        </div>
        {card}
        <p className="text-[11px] text-slate-400 mt-3">Your resume never leaves this device — only the extracted skills and preferences are saved in your browser.</p>
      </div>
    </div>
  )
}

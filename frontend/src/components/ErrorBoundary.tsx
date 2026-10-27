import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ShieldAlert, RotateCcw } from 'lucide-react'

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Unexpected rendering error' }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('FormSaathi UI error:', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="min-h-screen bg-canvas dark:bg-[#070d1f] flex items-center justify-center p-6">
        <div className="surface max-w-md w-full p-8 text-center rounded-3xl shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 flex items-center justify-center mx-auto">
            <ShieldAlert size={26} />
          </div>
          <h1 className="text-xl font-bold mt-4">Something went wrong</h1>
          <p className="text-sm text-muted dark:text-slate-400 mt-2 leading-relaxed">
            The page hit an unexpected error. Your saved listings and tracker are safe in this browser and in your account.
          </p>
          <p className="text-xs text-slate-400 mt-2 break-words font-mono">{this.state.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="mt-6 inline-flex items-center gap-2 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-6 py-3 rounded-xl transition active:scale-[.98]">
            <RotateCcw size={15} /> Try again
          </button>
        </div>
      </div>
    )
  }
}

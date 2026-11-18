import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/manrope'
import './index.css'
import App from './App.tsx'
import SchemeInfo from './SchemeInfo.tsx'
import SchemeHome from './SchemeHome.tsx'
import SchemeAssistant from './SchemeAssistant.tsx'
import { AuthProvider } from './lib/auth.tsx'
import { ToastProvider } from './components/Toast.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { registerPWA } from './lib/pwa.ts'

const view = new URLSearchParams(window.location.search).get("view")
const careers = view === "careers"
if (careers) registerPWA()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <ToastProvider>
            {careers ? <App /> : view === "assistant" ? <SchemeAssistant /> : view === "help" || view === "contact" || view === "guide" ? <SchemeInfo view={view} /> : <SchemeHome />}
          </ToastProvider>
        </AuthProvider>
      </MotionConfig>
    </ErrorBoundary>
  </StrictMode>,
)

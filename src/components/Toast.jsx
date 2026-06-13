import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import './Toast.css'

const ToastContext = createContext(null)

/**
 * Access the toast API anywhere under <ToastProvider>:
 *   const toast = useToast()
 *   toast.success('Saved!')
 *   toast.error('Something broke', { title: 'Verification failed' })
 */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
}

let idCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    if (timers.current[id]) {
      clearTimeout(timers.current[id])
      delete timers.current[id]
    }
  }, [])

  const notify = useCallback((message, opts = {}) => {
    const { type = 'info', duration = 4200, title } = opts
    const id = ++idCounter
    setToasts(prev => [...prev, { id, message, type, title }])
    if (duration > 0) {
      timers.current[id] = setTimeout(() => dismiss(id), duration)
    }
    return id
  }, [dismiss])

  const api = useRef({
    show: notify,
    success: (m, o) => notify(m, { ...o, type: 'success' }),
    error: (m, o) => notify(m, { ...o, type: 'error' }),
    info: (m, o) => notify(m, { ...o, type: 'info' }),
    warning: (m, o) => notify(m, { ...o, type: 'warning' }),
    dismiss,
  }).current

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-viewport" role="region" aria-label="Notifications">
        {toasts.map(t => {
          const Icon = ICONS[t.type] || Info
          return (
            <div key={t.id} className={`toast toast-${t.type}`} role="status" aria-live="polite">
              <span className="toast-icon"><Icon size={18} strokeWidth={2.2} /></span>
              <div className="toast-body">
                {t.title && <div className="toast-title">{t.title}</div>}
                <div className="toast-msg">{t.message}</div>
              </div>
              <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
                <X size={15} strokeWidth={2.4} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

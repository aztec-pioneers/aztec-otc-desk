import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'

export type ToastVariant = 'success' | 'error'

export type ToastPayload = {
  id: string
  message: string
  variant: ToastVariant
}

export type ToastContextValue = {
  toasts: ToastPayload[]
  pushToast: (toast: Omit<ToastPayload, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

let idCounter = 0
const createId = () => `toast-${Date.now()}-${++idCounter}`

export const ToastProvider = ({ children }: PropsWithChildren) => {
  const [toasts, setToasts] = useState<ToastPayload[]>([])
  const timeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const clearToastTimeout = useCallback((id: string) => {
    const timeoutId = timeoutsRef.current[id]
    if (timeoutId) {
      clearTimeout(timeoutId)
      delete timeoutsRef.current[id]
    }
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
    clearToastTimeout(id)
  }, [clearToastTimeout])

  const pushToast = useCallback(
    (toast: Omit<ToastPayload, 'id'>) => {
      const id = createId()
      setToasts((prev) => [...prev, { ...toast, id }])
      const timeoutId = setTimeout(() => removeToast(id), 5500)
      timeoutsRef.current[id] = timeoutId
    },
    [removeToast],
  )

  useEffect(
    () => () => {
      Object.values(timeoutsRef.current).forEach((timeoutId) => clearTimeout(timeoutId))
      timeoutsRef.current = {}
    },
    [],
  )

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, pushToast, removeToast }),
    [toasts, pushToast, removeToast],
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export default ToastContext

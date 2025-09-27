import useToast from '../../hooks/useToast'
import './ToastViewport.css'

const ToastViewport = () => {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) {
    return null
  }

  return (
    <div className="toast-viewport" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.variant}`}
          onClick={() => removeToast(toast.id)}
          role="alert"
        >
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  )
}

export default ToastViewport

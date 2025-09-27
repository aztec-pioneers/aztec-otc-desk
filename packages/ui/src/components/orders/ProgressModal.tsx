import type { ReactNode } from 'react'
import Modal from '../primitives/Modal'
import './ProgressModal.css'

type OrderSummary = {
  sellToken: string
  sellAmount?: string
  buyToken: string
  buyAmount?: string
}

type ProgressModalProps = {
  open: boolean
  onClose: () => void
  title: string
  phases: string[]
  activePhase: string
  statusMessages: Record<string, string>
  progressPercent?: number
  summary: OrderSummary
  error?: string | null
  footer?: ReactNode
}

const ProgressModal = ({
  open,
  onClose,
  title,
  phases,
  activePhase,
  statusMessages,
  progressPercent,
  summary,
  error,
  footer,
}: ProgressModalProps) => {
  const phaseIndex = phases.indexOf(activePhase)
  const segments = phases.length + 1

  let fraction = 0
  if (activePhase === 'success') {
    fraction = 1
  } else if (phaseIndex >= 0) {
    fraction = (phaseIndex + 1) / segments
  }

  if (progressPercent !== undefined) {
    fraction = Math.max(fraction, Math.min(progressPercent / 100, 1))
  }

  const percent = Math.max(0, Math.min(fraction, 1)) * 100

  const status = (() => {
    if (activePhase === 'success') {
      return 'Order successfully created.'
    }
    if (activePhase === 'error') {
      return error ?? 'Order failed. Please retry.'
    }
    return statusMessages[activePhase] ?? 'Processing order…'
  })()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      showCloseButton={false}
      dismissOnOverlayClick={false}
      dismissOnEscape={false}
      contentClassName="progress-modal__container"
    >
      <div className="progress-modal">
        <div className="progress-modal__summary">
          <div>
            <span className="progress-modal__summary-label">Sell</span>
            <span className="progress-modal__summary-value">
              {summary.sellAmount ?? '—'} {summary.sellToken}
            </span>
          </div>
          <div>
            <span className="progress-modal__summary-label">Buy</span>
            <span className="progress-modal__summary-value">
              {summary.buyAmount ?? '—'} {summary.buyToken}
            </span>
          </div>
        </div>

        <div className="progress-modal__progress" role="status" aria-live="polite">
          <div className="progress-modal__bar">
            <span className="progress-modal__fill" style={{ width: `${percent}%` }} />
          </div>
          <span className="progress-modal__status">{status}</span>
        </div>

        {footer ? <div className="progress-modal__footer">{footer}</div> : null}
      </div>
    </Modal>
  )
}

export default ProgressModal

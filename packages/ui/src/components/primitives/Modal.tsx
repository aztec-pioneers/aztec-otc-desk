import { useEffect, useId, useRef } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './Modal.css'

type ModalProps = {
  open: boolean
  title?: string
  description?: string
  onClose: () => void
  children: ReactNode
}

const Modal = ({ open, title, description, onClose, children }: ModalProps) => {
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const previouslyFocusedElement = useRef<Element | null>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      previouslyFocusedElement.current = document.activeElement
      document.body.style.overflow = 'hidden'

      const focusableSelector =
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      const focusable = dialogRef.current?.querySelector<HTMLElement>(focusableSelector)
      ;(focusable ?? dialogRef.current)?.focus()
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      if (previouslyFocusedElement.current instanceof HTMLElement) {
        previouslyFocusedElement.current.focus()
      }
      previouslyFocusedElement.current = null
    }
  }, [open, onClose])

  if (!open) {
    return null
  }

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === overlayRef.current) {
      onClose()
    }
  }

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') {
      return
    }

    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const focusableItems = dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector)
    if (!focusableItems || focusableItems.length === 0) {
      event.preventDefault()
      return
    }

    const focusableArray = Array.from(focusableItems)
    const currentIndex = focusableArray.indexOf(document.activeElement as HTMLElement)

    if (event.shiftKey) {
      if (currentIndex <= 0) {
        event.preventDefault()
        focusableArray[focusableArray.length - 1].focus()
      }
    } else {
      if (currentIndex === focusableArray.length - 1) {
        event.preventDefault()
        focusableArray[0].focus()
      }
    }
  }

  return createPortal(
    <div
      className="ui-modal__overlay"
      role="presentation"
      onClick={handleOverlayClick}
      ref={overlayRef}
    >
      <div
        className="ui-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        ref={dialogRef}
        onKeyDown={handleDialogKeyDown}
      >
        {title ? (
          <header className="ui-modal__header" id={titleId}>
            <h2>{title}</h2>
          </header>
        ) : null}
        {description ? (
          <p className="ui-modal__description" id={descriptionId}>
            {description}
          </p>
        ) : null}
        <div className="ui-modal__body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

export default Modal

import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import './Dropdown.css'

type DropdownOption = {
  label: string
  value: string
}

type DropdownProps = {
  options: DropdownOption[]
  value?: string
  onChange: (value: string) => void
  label?: string
}

const Dropdown = ({ options, value, onChange, label }: DropdownProps) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)
  const labelId = useId()
  const listId = useId()

  const selectedIndex = options.findIndex((option) => option.value === value)
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined

  useEffect(() => {
    if (open) {
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0)
    }
  }, [open, selectedIndex])

  useEffect(() => {
    if (!open) {
      return
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        listRef.current?.contains(event.target as Node) ||
        buttonRef.current?.contains(event.target as Node)
      ) {
        return
      }
      setOpen(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleKeyDown as never)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown as never)
    }
  }, [open])

  const handleButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
    }
  }

  const handleListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedIndex((prev) => Math.min(prev + 1, options.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex((prev) => Math.max(prev - 1, 0))
    } else if (event.key === 'Enter' && highlightedIndex >= 0) {
      event.preventDefault()
      const nextOption = options[highlightedIndex]
      onChange(nextOption.value)
      setOpen(false)
      buttonRef.current?.focus()
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  const handleOptionClick = (option: DropdownOption) => {
    onChange(option.value)
    setOpen(false)
    buttonRef.current?.focus()
  }

  const buttonLabel = selectedOption ? selectedOption.label : 'Select option'

  return (
    <div className="ui-dropdown">
      {label ? (
        <span id={labelId} className="ui-dropdown__label">
          {label}
        </span>
      ) : null}
      <button
        type="button"
        className="ui-dropdown__button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={label ? labelId : undefined}
        aria-controls={open ? listId : undefined}
        onKeyDown={handleButtonKeyDown}
        ref={buttonRef}
      >
        <span>{buttonLabel}</span>
        <svg aria-hidden viewBox="0 0 16 16" className="ui-dropdown__chevron">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="ui-dropdown__list"
          tabIndex={-1}
          onKeyDown={handleListKeyDown}
          ref={listRef}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              className={`ui-dropdown__option${
                option.value === value ? ' ui-dropdown__option--selected' : ''
              }${index === highlightedIndex ? ' ui-dropdown__option--highlighted' : ''}`}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => handleOptionClick(option)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export default Dropdown

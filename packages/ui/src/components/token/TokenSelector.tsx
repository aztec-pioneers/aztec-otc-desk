import { useEffect, useMemo, useRef, useState } from 'react'
import { TOKENS, DEFAULT_TOKEN_SYMBOL, type TokenMetadata } from '../../data/tokens'
import TokenIcon from './TokenIcon'
import './TokenSelector.css'

type TokenSelectorProps = {
  value?: string
  onChange?: (symbol: string) => void
  tokens?: TokenMetadata[]
  label?: string
}

const TokenSelector = ({
  value = DEFAULT_TOKEN_SYMBOL,
  onChange,
  tokens = TOKENS,
  label = 'Token',
}: TokenSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const previousSelectionRef = useRef(value)
  const listRef = useRef<HTMLUListElement | null>(null)
  const optionRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)

  const selectedToken = useMemo(
    () => tokens.find((token) => token.symbol === value) ?? tokens[0],
    [tokens, value],
  )

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
        previousSelectionRef.current = value
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setSearchTerm('')
        previousSelectionRef.current = value
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, value])

  useEffect(() => {
    if (isOpen) {
      previousSelectionRef.current = value
      setSearchTerm('')
      requestAnimationFrame(() => {
        searchInputRef.current?.focus()
      })
    } else {
      setHighlightedIndex(-1)
    }
  }, [isOpen, value])

  const filteredTokens = useMemo(() => {
    const trimmed = searchTerm.trim().toLowerCase()
    if (!trimmed) {
      return tokens
    }
    return tokens.filter((token) => token.symbol.toLowerCase().includes(trimmed))
  }, [tokens, searchTerm])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const currentIndex = filteredTokens.findIndex((token) => token.symbol === value)
    setHighlightedIndex(currentIndex >= 0 ? currentIndex : filteredTokens.length > 0 ? 0 : -1)
  }, [filteredTokens, isOpen, value])

  useEffect(() => {
    if (highlightedIndex < 0) {
      return
    }

    const highlightedToken = filteredTokens[highlightedIndex]
    if (!highlightedToken) {
      return
    }

    const optionNode = optionRefs.current[highlightedToken.symbol]
    const listNode = listRef.current
    if (optionNode && listNode) {
      const { offsetTop, offsetHeight } = optionNode
      const scrollTop = listNode.scrollTop
      const listHeight = listNode.clientHeight

      if (offsetTop < scrollTop) {
        listNode.scrollTo({ top: offsetTop, behavior: 'smooth' })
      } else if (offsetTop + offsetHeight > scrollTop + listHeight) {
        listNode.scrollTo({ top: offsetTop - listHeight + offsetHeight, behavior: 'smooth' })
      }
    }
  }, [filteredTokens, highlightedIndex])

  const handleOpen = () => {
    setIsOpen(true)
  }

  const handleSelect = (symbol: string) => {
    if (symbol !== value) {
      onChange?.(symbol)
    }
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleClosedKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleOpen()
    }
  }

  const handleOpenKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!filteredTokens.length) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setSearchTerm('')
      }
      return
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex((prev) => {
        if (filteredTokens.length === 0) {
          return -1
        }
        if (prev === -1) {
          return 0
        }
        const nextIndex = event.key === 'ArrowDown' ? prev + 1 : prev - 1
        if (nextIndex < 0) {
          return filteredTokens.length - 1
        }
        if (nextIndex >= filteredTokens.length) {
          return 0
        }
        return nextIndex
      })
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const token = filteredTokens[highlightedIndex] ?? filteredTokens[0]
      if (token) {
        handleSelect(token.symbol)
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setIsOpen(false)
      setSearchTerm('')
    }
  }

  return (
    <div className={`token-selector${isOpen ? ' token-selector--open' : ''}`} ref={containerRef}>
      <span className="token-selector__label">{label}</span>
      {!isOpen ? (
        <button
          type="button"
          className="token-selector__selected"
          onClick={handleOpen}
          onKeyDown={handleClosedKeyDown}
        >
          <TokenIcon token={selectedToken} />
          <div className="token-selector__selected-copy">
            <span className="token-selector__selected-symbol">{selectedToken.symbol}</span>
            <span className="token-selector__selected-name">{selectedToken.name}</span>
          </div>
          <svg viewBox="0 0 16 16" aria-hidden className="token-selector__chevron">
            <path d="M4.5 6l3.5 4 3.5-4" />
          </svg>
        </button>
      ) : (
        <div className="token-selector__search">
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value.replace(/\s+/g, ''))}
            maxLength={8}
            placeholder="Search symbol"
            aria-label="Search token symbol"
            className="token-selector__search-input"
            onKeyDown={handleOpenKeyDown}
            aria-activedescendant={
              highlightedIndex >= 0 && filteredTokens[highlightedIndex]
                ? `token-selector-option-${filteredTokens[highlightedIndex].symbol}`
                : undefined
            }
          />
        </div>
      )}

      {isOpen ? (
        <div className="token-selector__dropdown">
          {filteredTokens.length === 0 ? (
            <div className="token-selector__empty">No tokens found</div>
          ) : (
            <ul className="token-selector__list" role="listbox" ref={listRef}>
              {filteredTokens.map((token) => (
                <li key={token.symbol}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={token.symbol === value}
                    id={`token-selector-option-${token.symbol}`}
                    className={
                      highlightedIndex >= 0 && filteredTokens[highlightedIndex]?.symbol === token.symbol
                        ? 'token-selector__option token-selector__option--highlighted'
                        : 'token-selector__option'
                    }
                    onClick={() => handleSelect(token.symbol)}
                    ref={(node) => {
                      optionRefs.current[token.symbol] = node
                    }}
                  >
                    <TokenIcon token={token} size="sm" />
                    <div className="token-selector__option-copy">
                      <span className="token-selector__option-symbol">{token.symbol}</span>
                      <span className="token-selector__option-name">{token.name}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default TokenSelector

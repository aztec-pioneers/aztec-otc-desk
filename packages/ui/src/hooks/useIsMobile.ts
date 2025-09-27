import { useEffect, useState } from 'react'

const MOBILE_BREAKPOINT = 768

const checkIsMobile = () => {
  if (typeof window === 'undefined') {
    return false
  }

  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent || navigator.vendor : ''
  const mobileByUA = /android|iphone|ipad|ipod|mobile|blackberry|iemobile|opera mini/i.test(
    userAgent,
  )
  const mobileByViewport = window.matchMedia
    ? window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches
    : window.innerWidth <= MOBILE_BREAKPOINT

  return mobileByUA || mobileByViewport
}

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState<boolean>(() => checkIsMobile())

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(checkIsMobile())
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return isMobile
}

export default useIsMobile

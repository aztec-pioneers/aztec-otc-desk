import { useCallback, useState } from 'react'

const useModalState = (initial = false) => {
  const [open, setOpen] = useState(initial)

  const show = useCallback(() => setOpen(true), [])
  const hide = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen((prev) => !prev), [])

  return { open, show, hide, toggle }
}

export default useModalState

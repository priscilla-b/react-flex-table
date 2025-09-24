import { useEffect } from 'react'

export default function useClickOutside(ref, handler, active = true) {
  useEffect(() => {
    if (!active) return undefined

    function handleEvent(event) {
      const element = ref?.current
      if (!element || element.contains(event.target)) {
        return
      }
      handler?.(event)
    }

    document.addEventListener('mousedown', handleEvent)
    document.addEventListener('touchstart', handleEvent)
    return () => {
      document.removeEventListener('mousedown', handleEvent)
      document.removeEventListener('touchstart', handleEvent)
    }
  }, [ref, handler, active])
}

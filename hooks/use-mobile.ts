import * as React from "react"

const MOBILE_BREAKPOINT = 768
const ZAPYTANIE = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subskrybuj(onChange: () => void) {
  const mql = window.matchMedia(ZAPYTANIE)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subskrybuj,
    () => window.matchMedia(ZAPYTANIE).matches,
    () => false,
  )
}

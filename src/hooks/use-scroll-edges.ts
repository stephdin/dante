import { useEffect, useRef } from "react"

/**
 * Marks a scroll container with `data-at-top` / `data-at-bottom`, so edge
 * effects like `scroll-fade-y` can be turned off where there's nothing more
 * to scroll. Browsers with scroll-driven animations handle this natively;
 * the others would otherwise show both fades all the time.
 */
export function useScrollEdges<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const update = () => {
      const { scrollTop, clientHeight, scrollHeight } = element
      element.dataset.atTop = String(scrollTop <= 0)
      element.dataset.atBottom = String(
        scrollTop + clientHeight >= scrollHeight - 1
      )
    }

    update()
    element.addEventListener("scroll", update, { passive: true })
    // The scroll height changes when the container resizes or its content does.
    const resize = new ResizeObserver(update)
    resize.observe(element)
    const mutation = new MutationObserver(update)
    mutation.observe(element, { childList: true, subtree: true })

    return () => {
      element.removeEventListener("scroll", update)
      resize.disconnect()
      mutation.disconnect()
    }
  }, [])

  return ref
}

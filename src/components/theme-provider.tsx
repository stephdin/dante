import { createContext, useContext, useEffect, useState } from "react"

export type Theme = "light" | "dark" | "system"

const STORAGE_KEY = "theme"
const THEMES: Theme[] = ["light", "dark", "system"]
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)")

const ThemeContext = createContext<
  { theme: Theme; setTheme: (theme: Theme) => void } | undefined
>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState(() =>
    parseTheme(localStorage.getItem(STORAGE_KEY))
  )

  useEffect(() => localStorage.setItem(STORAGE_KEY, theme), [theme])

  // Apply the theme, and follow the OS while it is set to "system".
  useEffect(() => {
    applyTheme(theme)
    if (theme !== "system") return
    const onChange = () => applyTheme("system")
    prefersDark.addEventListener("change", onChange)
    return () => prefersDark.removeEventListener("change", onChange)
  }, [theme])

  // Pressing "D" outside of a text field toggles between light and dark.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key.toLowerCase() !== "d" || isEditable(event.target)) return
      setTheme((current) => (resolve(current) === "dark" ? "light" : "dark"))
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  // Pick up changes made in other tabs.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.storageArea === localStorage && event.key === STORAGE_KEY) {
        setTheme(parseTheme(event.newValue))
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used within a ThemeProvider")
  return context
}

function parseTheme(value: string | null): Theme {
  return THEMES.includes(value as Theme) ? (value as Theme) : "system"
}

function resolve(theme: Theme) {
  if (theme !== "system") return theme
  return prefersDark.matches ? "dark" : "light"
}

// Swaps the class on <html> without animating every color on the page.
function applyTheme(theme: Theme) {
  const noTransitions = document.createElement("style")
  noTransitions.textContent = "*,*::before,*::after{transition:none!important}"
  document.head.append(noTransitions)

  document.documentElement.classList.remove("light", "dark")
  document.documentElement.classList.add(resolve(theme))

  // Force a style recalculation, so the new colors are in place before
  // transitions are turned back on.
  getComputedStyle(document.body)
  requestAnimationFrame(() =>
    requestAnimationFrame(() => noTransitions.remove())
  )
}

function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || !!target.closest("input, textarea, select"))
  )
}

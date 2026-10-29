import { Link } from "react-router"
import { ChevronRightIcon, PlusIcon } from "lucide-react"

import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { settingsSections, type SettingsKind } from "@/lib/mock-data"

const themes = [
  { value: "light", label: "Hell" },
  { value: "dark", label: "Dunkel" },
  { value: "system", label: "System" },
] as const

export function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-4">
      <ThemeSection />
      {(Object.keys(settingsSections) as SettingsKind[]).map((kind) => (
        <SettingsSection key={kind} kind={kind} />
      ))}
    </div>
  )
}

function ThemeSection() {
  const { theme, setTheme } = useTheme()

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-medium">Darstellung</h2>
      <div className="flex gap-2">
        {themes.map((option) => (
          <Button
            key={option.value}
            variant={theme === option.value ? "default" : "outline"}
            onClick={() => setTheme(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </section>
  )
}

function SettingsSection({ kind }: { kind: SettingsKind }) {
  const { title, items } = settingsSections[kind]

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">{title}</h2>
        <Button
          variant="ghost"
          size="sm"
          render={<Link to={`/settings/${kind}/new`} />}
        >
          <PlusIcon /> Hinzufügen
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Einträge.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={`/settings/${kind}/${item.id}`}
                className="flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50"
              >
                {item.name}
                <ChevronRightIcon className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

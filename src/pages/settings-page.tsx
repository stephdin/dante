import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { useSetToolEnabled, useTools } from "@/lib/tools"

const themes = [
  { value: "light", label: "Hell" },
  { value: "dark", label: "Dunkel" },
  { value: "system", label: "System" },
] as const

export function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-4">
      <ThemeSection />
      <ToolsSection />
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

function ToolsSection() {
  const { data: tools, isError } = useTools()
  const setEnabled = useSetToolEnabled()

  return (
    <section className="flex flex-col gap-2">
      <div>
        <h2 className="font-medium">Tools</h2>
        <p className="text-sm text-muted-foreground">
          Eingeschaltete Tools werden dem Modell in jedem Chat angeboten.
        </p>
      </div>
      {isError ? (
        <p className="text-sm text-destructive">
          Die Tools konnten nicht geladen werden.
        </p>
      ) : !tools ? (
        <Skeleton className="h-14 rounded-lg" />
      ) : (
        <ul className="divide-y rounded-lg border">
          {tools.map((tool) => (
            <li key={tool.id}>
              <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-muted/50">
                <Checkbox
                  className="mt-0.5"
                  checked={tool.enabled}
                  onCheckedChange={(enabled) =>
                    setEnabled.mutate({ id: tool.id, enabled })
                  }
                />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{tool.label}</span>
                  <span className="text-sm text-muted-foreground">
                    {tool.description}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

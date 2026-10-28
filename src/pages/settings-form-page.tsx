import { Link, Navigate, useParams } from "react-router"
import { ArrowLeftIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { isSettingsKind, settingsSections } from "@/lib/mock-data"

// One page for all settings forms: /settings/:kind/new and /settings/:kind/:id
export function SettingsFormPage() {
  const { kind, id } = useParams()
  if (!isSettingsKind(kind)) return <Navigate to="/settings" replace />

  const section = settingsSections[kind]
  const item = section.items.find((entry) => entry.id === id)
  const title = item
    ? `${section.singular} bearbeiten`
    : `${section.singular} hinzufügen`

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        render={<Link to="/settings" />}
      >
        <ArrowLeftIcon /> Zurück
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {item && <CardDescription>{item.name}</CardDescription>}
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Das Formular folgt.
        </CardContent>
      </Card>
    </div>
  )
}

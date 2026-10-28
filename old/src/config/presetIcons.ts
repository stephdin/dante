import { IconBolt, IconBrain, IconSparkles } from "@tabler/icons-react";

type IconComponent = typeof IconSparkles;

// Maps the stable `iconId` sent by the backend to a Tabler icon component.
// Keeping this on the frontend avoids shipping React components over the API.
export const PRESET_ICONS: Record<string, IconComponent> = {
  sparkles: IconSparkles,
  bolt: IconBolt,
  brain: IconBrain,
};

export function presetIcon(iconId: string): IconComponent {
  return PRESET_ICONS[iconId] ?? IconSparkles;
}

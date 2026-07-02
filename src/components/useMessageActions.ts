import { useHover, useMediaQuery } from "@mantine/hooks";
import type { CSSProperties } from "react";

// Reveals message actions on hover, and always shows them on touch devices
// (which don't have a real hover state).
export function useMessageActions() {
  const isTouch = useMediaQuery("(hover: none)");
  const { hovered, ref } = useHover<HTMLDivElement>();
  const opacity = isTouch ? 1 : hovered ? 1 : 0;
  const actionsStyle: CSSProperties = {
    opacity,
    transition: "opacity 120ms ease",
  };
  return { ref, actionsStyle };
}

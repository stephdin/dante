import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useConfig } from "../../api/queries.ts";

/**
 * Shared hook for settings form pages. Resolves create-vs-edit mode, finds the
 * entity in the cached config (for edit), and returns loading/not-found flags
 * so every form page gets the same shell behavior.
 */
export function useSettingsFormContext<T extends { id: string }>(
  key: "providers" | "assistants" | "mcps" | "presets",
) {
  const { id } = useParams<{ id: string }>();
  const isNew = id === undefined;
  const { data: config, loading, error } = useConfig();

  const entity = useMemo(() => {
    if (isNew || !config) return undefined;
    const list = config[key] as unknown as readonly T[];
    return list.find((item) => item.id === id);
  }, [isNew, config, key, id]);

  const notFound = !isNew && !loading && config !== null && !entity;

  return { id: id ?? "", isNew, entity, config, loading, error, notFound };
}

import { useEffect, useState } from "react";

import { apiGet, apiPut } from "./client.ts";
import type {
  Config,
  Conversation,
  ConversationSummary,
} from "@shared/types.ts";

// Cached config so that navigating between /settings and a settings subpage
// (which unmounts/remounts SettingsPage) doesn't re-trigger the Loader and
// lose the scroll position that react-router's ScrollRestoration tries to
// restore. The backend exposes no config mutations yet, so the cache never
// needs invalidation; if/when POST/PUT handlers are added, expose an
// invalidateConfig() and call it from the mutation handlers.
let configCache: Config | null = null;

export function useConfig() {
  const [data, setData] = useState<Config | null>(configCache);
  const [loading, setLoading] = useState(configCache === null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (configCache !== null) return;
    let active = true;
    setLoading(true);
    apiGet<Config>("/config")
      .then((result) => {
        if (active) {
          configCache = result;
          setData(result);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { data, loading, error };
}

export function invalidateConfig() {
  configCache = null;
}

/** Save the full config and invalidate the local cache so useConfig refetches. */
export async function saveConfig(config: Config): Promise<void> {
  await apiPut("/config", config);
  invalidateConfig();
}

export function useConversations() {
  const [data, setData] = useState<ConversationSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiGet<ConversationSummary[]>("/conversations")
      .then((result) => {
        if (active) {
          setData(result);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { data, loading, error };
}

export function useConversation(id: string | undefined) {
  const [data, setData] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiGet<Conversation>(`/conversations/${id}`)
      .then((result) => {
        if (active) {
          setData(result);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  return { data, loading, error };
}

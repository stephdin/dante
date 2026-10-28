import { useEffect, useState } from "react";

import { apiGet, apiPut } from "./client.ts";
import type {
  Config,
  Conversation,
  ConversationSummary,
} from "@shared/types.ts";

// ── Config cache + subscription ──────────────────────────────────────────────
//
// useConfig subscribes to a module-level cache. invalidateConfig refetches from
// the server and pushes the result to every active subscriber, so mutations
// from anywhere (form pages, import) update all mounted SettingsPage instances
// without requiring a remount.

let configCache: Config | null = null;
const configListeners = new Set<(config: Config) => void>();

export function useConfig() {
  const [data, setData] = useState<Config | null>(configCache);
  const [loading, setLoading] = useState(configCache === null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;

    // Subscribe first so invalidateConfig refetches reach us even if the
    // initial fetch is still in flight.
    const listener = (config: Config) => {
      if (active) {
        setData(config);
        setError(null);
        setLoading(false);
      }
    };
    configListeners.add(listener);

    // Initial fetch if cache is empty
    if (configCache === null) {
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
    }

    return () => {
      active = false;
      configListeners.delete(listener);
    };
  }, []);

  return { data, loading, error };
}

/**
 * Clear the cache and refetch. Notifies all active useConfig subscribers with
 * the fresh config so they update without remounting.
 */
export function invalidateConfig() {
  configCache = null;
  apiGet<Config>("/config")
    .then((config) => {
      configCache = config;
      for (const listener of configListeners) listener(config);
    })
    .catch(() => {
      // Leave error handling to individual useConfig instances
    });
}

/** Save the full config and invalidate the local cache so useConfig refetches. */
export async function saveConfig(config: Config): Promise<void> {
  await apiPut("/config", config);
  invalidateConfig();
}

// ── Conversations ────────────────────────────────────────────────────────────

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

/** Fetch a conversation by id. Used to pull final stats after chat.done. */
export async function fetchConversation(id: string): Promise<Conversation> {
  return apiGet<Conversation>(`/conversations/${id}`);
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

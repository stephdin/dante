// API token persistence. The token is stored in localStorage and read at
// request time by the API client and the WebSocket event client.
//
// This is a personal tool with one user — localStorage is the right tradeoff
// (see the auth discussion: HttpOnly cookies don't fit the Bearer header +
// WS query-token pattern without significant complexity).

const STORAGE_KEY = "dante_api_token";

/** Read the API token from localStorage. Returns empty string if unset. */
export function getApiToken(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

/** Write the API token to localStorage. Empty string removes it. */
export function setApiToken(token: string): void {
  const trimmed = token.trim();
  if (trimmed) {
    localStorage.setItem(STORAGE_KEY, trimmed);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

import { useState } from "react";
import { PasswordInput, Stack } from "@mantine/core";

import { getApiToken, setApiToken } from "../../../api/token.ts";
import { SectionHeader } from "./SectionHeader.tsx";
import { SettingRow } from "./SettingRow.tsx";

export function ConnectionSection() {
  const [token, setToken] = useState(() => getApiToken());

  // Commit to localStorage on blur, not on every keystroke — avoids mid-typing
  // auth failures (each keystroke would change the token used by live requests).
  function commit() {
    setApiToken(token);
  }

  return (
    <Stack gap="xs">
      <SectionHeader title="Verbindung" />
      <SettingRow
        label="API-Token"
        description="Token zur Authentifizierung mit dem Dante-Server"
      >
        <PasswordInput
          value={token}
          onChange={(e) => setToken(e.currentTarget.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          placeholder="Nicht gesetzt"
          size="sm"
          w="100%"
        />
      </SettingRow>
    </Stack>
  );
}

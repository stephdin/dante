import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { BrowserRouter } from "react-router-dom";
import "@mantine/core/styles.css";

import { DisplaySettingsProvider } from "./context/DisplaySettingsContext.tsx";
import { cssVariablesResolver, theme } from "./theme.ts";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <MantineProvider
        theme={theme}
        defaultColorScheme="auto"
        cssVariablesResolver={cssVariablesResolver}
      >
        <DisplaySettingsProvider>
          <App />
        </DisplaySettingsProvider>
      </MantineProvider>
    </BrowserRouter>
  </StrictMode>,
);

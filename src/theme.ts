import {
  colorsTuple,
  createTheme,
  DEFAULT_THEME,
  mergeMantineTheme,
  virtualColor,
} from "@mantine/core";

const themeOverride = createTheme({
  colors: {
    white: colorsTuple("#eeeeee"),
    black: colorsTuple("#111111"),
    primary: virtualColor({
      name: "primary",
      dark: "white",
      light: "black",
    }),
    // Contrast color for content placed on top of `primary` surfaces.
    // Mirrors what `autoContrast` computes for filled components, but can be
    // used on non-filled surfaces like `Paper` (e.g. message bubbles).
    onPrimary: virtualColor({
      name: "onPrimary",
      dark: "black",
      light: "white",
    }),
  },
});

export const theme = mergeMantineTheme(DEFAULT_THEME, themeOverride);

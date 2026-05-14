import { useContext } from "react";
import { useColorScheme } from "react-native";

import { AppContext } from "@/context/AppContext";
import colors from "@/constants/colors";

/**
 * Returns the design tokens for the current color scheme.
 * Respects the in-app override stored in AppContext (light / dark / system).
 * Falls back to the device scheme when AppContext is unavailable.
 */
export function useColors() {
  const appCtx = useContext(AppContext);
  const systemScheme = useColorScheme();

  const resolved =
    appCtx?.colorScheme === "light" ? "light"
    : appCtx?.colorScheme === "dark" ? "dark"
    : systemScheme === "light" ? "light"
    : "dark"; // default dark

  const palette = resolved === "light" ? colors.light : colors.dark;
  return { ...palette, radius: colors.radius };
}

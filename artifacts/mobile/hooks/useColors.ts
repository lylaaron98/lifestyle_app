import { useColorScheme } from "react-native";

import colors from "@/constants/colors";

/**
 * Returns the design tokens for the current color scheme.
 * Defaults to dark palette — the app is designed dark-first.
 */
export function useColors() {
  const scheme = useColorScheme();
  // Dark-first: use dark palette unless the device is explicitly in light mode
  const palette =
    scheme === "light"
      ? colors.light
      : "dark" in colors
      ? (colors as Record<string, typeof colors.light>).dark
      : colors.light;
  return { ...palette, radius: colors.radius };
}

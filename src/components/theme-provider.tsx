'use client';

import * as React from 'react';
import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextTheme,
} from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';

type CustomThemeContextProps = {
  theme?: string;
  setTheme: (theme: string) => void;
};

export const ThemeProviderContext = React.createContext<
  CustomThemeContextProps | undefined
>(undefined);

// This is a wrapper component that will have access to the theme from next-themes
function ThemeProviderWrapper({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useNextTheme();

  const value = React.useMemo(
    () => ({
      theme,
      setTheme,
    }),
    [theme, setTheme]
  );

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

// This is the main provider that sets up next-themes
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <ThemeProviderWrapper>{children}</ThemeProviderWrapper>
    </NextThemesProvider>
  );
}

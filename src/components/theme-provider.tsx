'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';

export const ThemeProviderContext = React.createContext<
  | {
      theme: string;
      setTheme: (theme: string) => void;
    }
  | undefined
>(undefined);

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

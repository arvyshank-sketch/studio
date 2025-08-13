
import type { Metadata } from 'next';
import { Rajdhani } from 'next/font/google';
import './globals.css';
import { AppLayout } from '@/components/app-layout';
import { Toaster } from '@/components/ui/toaster';
import { AuthContextProvider } from '@/context/auth-context';

const rajdhani = Rajdhani({ 
  subsets: ['latin'], 
  weight: ['400', '500', '600', '700'],
  variable: '--font-rajdhani',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Synergy',
  description: 'Track your life. Achieve your goals.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${rajdhani.variable} h-full`} suppressHydrationWarning>
      <body className="h-full font-body antialiased bg-background">
          <AuthContextProvider>
            <AppLayout>{children}</AppLayout>
            <Toaster />
          </AuthContextProvider>
      </body>
    </html>
  );
}

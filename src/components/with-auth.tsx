
'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from './ui/skeleton';

export default function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
      if (!isLoading) {
        if (!user) {
          // Redirect to login if not authenticated
          router.push('/login');
        } else if (user && (pathname === '/login' || pathname === '/signup')) {
            // Redirect to home if authenticated and on login/signup page
            router.push('/');
        }
      }
    }, [user, isLoading, router, pathname]);

    if (isLoading || !user) {
        // Show a loading skeleton or a blank page while checking auth state
        return (
            <div className="p-8 space-y-4">
                <Skeleton className="h-12 w-1/2" />
                <Skeleton className="h-6 w-3/4" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        );
    }
    
    if (user && (pathname === '/login' || pathname === '/signup')) {
        return null; // Don't render login/signup page if user is logged in
    }


    return <Component {...props} />;
  };
}

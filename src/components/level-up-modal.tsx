
'use client';

import { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface LevelUpModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function LevelUpModal({ isOpen, onOpenChange }: LevelUpModalProps) {

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onOpenChange(false);
      }, 2500); // Auto-close after 2.5 seconds

      return () => clearTimeout(timer);
    }
  }, [isOpen, onOpenChange]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="bg-transparent border-none shadow-none max-w-md w-full p-0 flex items-center justify-center"
        hideCloseButton={true}
      >
        <DialogTitle className="sr-only">Level Up</DialogTitle>
        <div className="relative text-center pointer-events-none">
          <h1 
            className={cn(
              "text-6xl md:text-8xl font-black uppercase text-white",
              "animate-in fade-in zoom-in-50 duration-500", // Entrance animation
              "tracking-wider"
            )}
            style={{
                textShadow: `
                    0 0 10px hsl(var(--primary)), 
                    0 0 20px hsl(var(--primary)), 
                    0 0 40px hsl(var(--primary) / 0.8),
                    0 0 80px hsl(var(--primary) / 0.6),
                    0 0 120px hsl(var(--primary) / 0.4)
                `
            }}
          >
            Level Up!
          </h1>
        </div>
      </DialogContent>
    </Dialog>
  );
}

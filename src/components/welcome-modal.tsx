
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasBeenShown = sessionStorage.getItem('welcomeModalShown');
    
    if (!hasBeenShown) {
        const timer = setTimeout(() => {
          setIsOpen(true);
          sessionStorage.setItem('welcomeModalShown', 'true');
        }, 500); // Slight delay to let the page load
        return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
         <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent 
                className="max-w-md w-[90vw]"
                hideCloseButton={false}
                onClick={(e) => e.stopPropagation()}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertCircle className="size-5" />
                        System Alert
                    </DialogTitle>
                </DialogHeader>
                <div className="p-6 text-center text-xl tracking-widest whitespace-nowrap">
                    [ Welcome, player. ]
                </div>
            </DialogContent>
         </Dialog>
      )}
    </AnimatePresence>
  );
}

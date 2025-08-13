
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // This will run once per session
    const hasBeenShown = sessionStorage.getItem('welcomeModalShown');
    
    if (!hasBeenShown) {
        setIsOpen(true);
        sessionStorage.setItem('welcomeModalShown', 'true');
    }
    
    // Auto-close after a delay
    const timer = setTimeout(() => {
      handleClose();
    }, 2500); // Reduced from 3.5s to 2.5s

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80"
          style={{ backdropFilter: 'blur(2px)' }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, transition: { delay: 0.2, duration: 0.3 } }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "relative w-[90vw] max-w-4xl bg-[#0a0f1e] text-cyan-200 rounded-lg border-2 border-cyan-400/50 shadow-2xl shadow-cyan-500/20",
              "font-mono" // Use a monospaced font for the system look
            )}
            style={{
              background: 'radial-gradient(circle, rgba(10,15,30,1) 0%, rgba(5,8,15,1) 100%)',
              boxShadow: '0 0 15px rgba(0, 255, 255, 0.2), 0 0 30px rgba(0, 255, 255, 0.1), inset 0 0 10px rgba(0, 255, 255, 0.1)'
            }}
          >
            {/* Ornate corners */}
            <div className="absolute top-1 left-1 w-4 h-4 border-l-2 border-t-2 border-cyan-400/50 rounded-tl-md"></div>
            <div className="absolute top-1 right-1 w-4 h-4 border-r-2 border-t-2 border-cyan-400/50 rounded-tr-md"></div>
            <div className="absolute bottom-1 left-1 w-4 h-4 border-l-2 border-b-2 border-cyan-400/50 rounded-bl-md"></div>
            <div className="absolute bottom-1 right-1 w-4 h-4 border-r-2 border-b-2 border-cyan-400/50 rounded-br-md"></div>

            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-cyan-400/30">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-5 text-cyan-300" />
                <h2 className="text-lg font-bold tracking-wider text-cyan-300">Alert</h2>
              </div>
              <button onClick={handleClose} className="p-1 rounded-md hover:bg-cyan-400/20 transition-colors">
                <X className="size-5 text-cyan-300" />
                <span className="sr-only">Close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-10 text-center">
              <p className="text-xl tracking-widest whitespace-nowrap">[ Welcome, player. ]</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

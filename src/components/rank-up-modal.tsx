
'use client';

import { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { Rank } from '@/lib/types';
import { ChevronDown } from 'lucide-react';

interface RankUpModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  rankChangeInfo: { oldRank: Rank; newRank: Rank } | null;
}

export function RankUpModal({ isOpen, onOpenChange, rankChangeInfo }: RankUpModalProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (!audioRef.current) {
        audioRef.current = new Audio('/level-up.mp3'); // Re-using level up sound
      }
      audioRef.current?.play().catch(e => console.error("Audio play failed:", e));

      const timer = setTimeout(() => {
        onOpenChange(false);
      }, 4000); // Auto-close after 4 seconds

      return () => clearTimeout(timer);
    }
  }, [isOpen, onOpenChange]);

  if (!rankChangeInfo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="bg-transparent border-none shadow-none max-w-lg w-full p-0 flex items-center justify-center font-mono"
        hideCloseButton={true}
      >
        <div 
          className="relative w-full max-w-md p-6 rounded-lg text-cyan-200 border-2 border-cyan-400/50 shadow-2xl shadow-cyan-500/20 bg-black/80 backdrop-blur-sm"
          style={{ textShadow: '0 0 8px hsl(198 90% 55% / 0.5)'}}
        >
            {/* Ornate corners */}
            <div className="absolute top-1 left-1 w-4 h-4 border-l-2 border-t-2 border-cyan-400/50 rounded-tl-md"></div>
            <div className="absolute top-1 right-1 w-4 h-4 border-r-2 border-t-2 border-cyan-400/50 rounded-tr-md"></div>
            <div className="absolute bottom-1 left-1 w-4 h-4 border-l-2 border-b-2 border-cyan-400/50 rounded-bl-md"></div>
            <div className="absolute bottom-1 right-1 w-4 h-4 border-r-2 border-b-2 border-cyan-400/50 rounded-br-md"></div>

            <div className='flex items-center gap-4 px-4 py-2 border border-cyan-400/50 rounded-md mb-6'>
                <div className='flex items-center justify-center size-8 rounded-full border-2 border-cyan-300'>
                    <span className='font-bold text-xl'>!</span>
                </div>
                <h3 className="text-xl font-bold tracking-widest text-cyan-300">NOTIFICATION</h3>
            </div>
            
            <div className="text-center space-y-4">
                <p className="text-lg">Your rank has changed</p>
                <div className="p-2 border border-cyan-400/30 rounded-md bg-black/30">
                    <p className={cn("text-lg font-bold", rankChangeInfo.oldRank.color)}>[{rankChangeInfo.oldRank.name}]</p>
                </div>
                
                <div className="flex justify-center my-2">
                    <ChevronDown className="size-6 animate-bounce" />
                    <ChevronDown className="size-6 animate-bounce delay-150" />
                    <ChevronDown className="size-6 animate-bounce delay-300" />
                </div>
                
                <div className="p-2 border-2 border-green-400/80 rounded-md bg-green-900/40 shadow-lg shadow-green-500/30">
                     <p className={cn("text-lg font-bold", rankChangeInfo.newRank.color)}>[{rankChangeInfo.newRank.name}]</p>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

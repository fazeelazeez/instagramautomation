import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-white p-6 rounded-2xl shadow-premium border border-slate-50", className)}>
    {children}
  </div>
);

export const Button = ({ children, className, onClick }: { children: React.ReactNode; className?: string, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className={cn("insta-button text-sm", className)}
  >
    {children}
  </button>
);

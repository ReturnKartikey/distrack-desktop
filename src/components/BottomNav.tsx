import React from 'react';
import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function BottomNav() {
  const navItems = [
    { path: '/', icon: 'dashboard', label: 'Home' },
    { path: '/classification', icon: 'grid_view', label: 'Apps' },
    { path: '/insights', icon: 'insights', label: 'Insights' },
    { path: '/focus', icon: 'schedule', label: 'Focus' },
  ];

  return (
    <nav className="fixed bottom-0 w-full lg:hidden border-t border-outline-variant bg-background z-50 flex justify-around items-center px-4 pb-6 pt-3">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => cn(
            "flex flex-col items-center justify-center px-4 py-2 transition-all font-sans",
            isActive 
              ? "text-white opacity-100"
              : "text-on-surface opacity-60 hover:opacity-100"
          )}
        >
          {({ isActive }) => (
            <>
              <span className={cn("material-symbols-outlined text-[24px] mb-1", isActive && "fill")}>{item.icon}</span>
              <span className="text-[9px] uppercase tracking-widest font-bold">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

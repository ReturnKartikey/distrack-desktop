import React from 'react';
import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import brandIcon from '../assets/icon.png';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { path: '/', icon: 'dashboard', label: 'Dash' },
  { path: '/classification', icon: 'category', label: 'Apps' },
  { path: '/focus', icon: 'timer', label: 'Flow' },
  { path: '/insights', icon: 'lightbulb', label: 'Insight' },
];

export default function Sidebar() {
  return (
    <nav className="hidden lg:flex flex-col relative lg:static h-full py-8 bg-surface-dim border-r border-outline-variant z-40 w-24 flex-shrink-0 items-center justify-start gap-10">
      <div className="flex flex-col items-center justify-center">
        <div className="w-12 h-12 flex items-center justify-center rounded-sm overflow-hidden">
          <img src={brandIcon} className="w-full h-full object-contain" alt="Distrack Logo" />
        </div>
      </div>
      <div className="flex flex-col w-full px-2 gap-5 items-center">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center w-16 h-16 rounded-md transition-all cursor-pointer font-sans gap-1 relative group border border-transparent",
              isActive 
                ? "text-primary font-bold bg-surface-bright border-outline-variant shadow-inner"
                : "text-on-surface opacity-60 hover:opacity-100 hover:text-primary hover:bg-surface-bright/40"
            )}
          >
            {({ isActive }) => (
                <>
                    <span className={cn("material-symbols-outlined text-[22px]", isActive ? "fill text-primary" : "text-on-surface group-hover:text-primary")}>{item.icon}</span>
                    <span className="text-[8px] uppercase tracking-widest font-bold scale-90">{item.label}</span>
                </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

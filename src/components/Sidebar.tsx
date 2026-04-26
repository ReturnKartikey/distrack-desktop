import React from 'react';
import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
      <div className="flex flex-col items-center justify-center gap-2">
        <div className="w-10 h-10 bg-white flex items-center justify-center rounded-sm">
          <div className="w-4 h-4 border-2 border-black rotate-[45deg]"></div>
        </div>
      </div>
      <div className="flex flex-col w-full px-2 gap-8 items-center">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex flex-col items-center gap-2 transition-all cursor-pointer font-sans",
              isActive 
                ? "opacity-100 text-white font-bold"
                : "opacity-60 hover:opacity-100 text-on-surface hover:text-white"
            )}
          >
            {({ isActive }) => (
                <>
                    <span className={cn("material-symbols-outlined text-[24px]", isActive ? "fill text-white" : "")}>{item.icon}</span>
                    <span className="text-[9px] uppercase tracking-widest font-semibold">{item.label}</span>
                </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

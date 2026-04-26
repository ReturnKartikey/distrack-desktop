import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomNav from './BottomNav';

export default function Layout() {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-background text-on-background select-none lg:h-screen lg:overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

"use client";

import * as React from "react";
import { GlobalSearch } from "@/components/GlobalSearch";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Header() {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const toggleMenu = () => setMenuOpen((v) => !v);

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("#userMenuButton") && !target.closest("#userMenuPanel")) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="ribbon-icon mr-3" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">HIV Care Portal</h1>
          </div>

          <GlobalSearch />

          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <div className="relative">
              <button
                id="userMenuButton"
                onClick={toggleMenu}
                className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white tap-target"
              >
                <div className="w-8 h-8 bg-lucky-1 rounded-full flex items-center justify-center text-white font-bold">JD</div>
                <span className="hidden md:block">Dr. Jane Doe</span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
              {menuOpen && (
                <div
                  id="userMenuPanel"
                  className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50"
                >
                  <div className="py-1">
                    <a className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" href="#">Profile Settings</a>
                    <a className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" href="#">Notifications</a>
                    <div className="border-t border-gray-200 dark:border-gray-600" />
                    <form action="/login" method="get">
                      <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Sign Out</button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

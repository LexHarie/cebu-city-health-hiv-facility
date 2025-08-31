"use client";

import * as React from "react";

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<string>("light");

  React.useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    const initial = saved || document.body.getAttribute("data-theme") || "light";
    setTheme(initial);
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    if (typeof window !== "undefined") {
      document.body.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
    }
  };

  return (
    <button
      onClick={toggle}
      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 tap-target"
      title="Toggle theme"
      aria-label="Toggle theme"
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
      </svg>
    </button>
  );
}


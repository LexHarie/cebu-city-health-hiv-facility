"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type ClientResult = {
  id: string;
  clientCode?: string;
  client_code?: string;
  uic: string;
  legalSurname?: string;
  legal_surname?: string;
  legalFirst?: string;
  legal_first_name?: string;
  preferredName?: string | null;
  preferred_name?: string | null;
  dateOfBirth?: string | Date | null;
  date_of_birth?: string | Date | null;
};

export function GlobalSearch() {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<ClientResult[]>([]);
  const router = useRouter();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const debounceRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", onDocClick);
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const input = containerRef.current?.querySelector('input');
        (input as HTMLInputElement | null)?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const runSearch = React.useCallback(async (q: string) => {
    if (!q) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/clients?search=${encodeURIComponent(q)}&limit=10`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.clients || []);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onChange = (v: string) => {
    setQuery(v);
    setOpen(true);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    // @ts-ignore - window.setTimeout returns number in browser
    debounceRef.current = window.setTimeout(() => runSearch(v), 200);
  };

  const highlight = (text: string, q: string) => {
    if (!q) return text;
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return text.replace(re, '<span class="search-highlight">$1</span>');
  };

  const pick = (c: ClientResult) => {
    const id = c.id;
    setOpen(false);
    setQuery("");
    if (id) router.push(`/clients/${id}`);
  };

  return (
    <div className="flex-1 max-w-lg mx-4" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search clients (Name, UIC, Client Code, DoB)..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-lucky-1 focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>

        {open && (
          <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg mt-1 max-h-96 overflow-y-auto z-50">
            {loading ? (
              <div className="p-3 text-sm text-gray-500 dark:text-gray-400">Searching...</div>
            ) : results.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 dark:text-gray-400">Start typing to search clients...</div>
            ) : (
              results.map((c) => {
                const legalSurname = (c.legalSurname ?? c.legal_surname ?? "").toString();
                const legalFirst = (c.legalFirst ?? c.legal_first_name ?? "").toString();
                const pref = (c.preferredName ?? c.preferred_name ?? null);
                const code = (c.clientCode ?? c.client_code ?? "").toString();
                const uic = c.uic.toString();
                return (
                  <div
                    key={c.id}
                    className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-600"
                    onClick={() => pick(c)}
                  >
                    <div
                      className="font-medium text-gray-900 dark:text-white"
                      dangerouslySetInnerHTML={{
                        __html: `${highlight(`${legalSurname}, ${legalFirst}`, query)}${pref ? ` <span class=\"text-gray-500\">\"${highlight(pref, query)}\"</span>` : ""}`,
                      }}
                    />
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <span dangerouslySetInnerHTML={{ __html: `UIC: ${highlight(uic, query)}` }} />
                      <span className="mx-1">|</span>
                      <span dangerouslySetInnerHTML={{ __html: `Code: ${highlight(code, query)}` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

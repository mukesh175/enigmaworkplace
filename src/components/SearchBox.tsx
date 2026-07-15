"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { quickSearch } from "@/lib/actions/search";

type Result = { id: string; label: string; href: string };

export default function SearchBox() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<{ clients: Result[]; projects: Result[]; tasks: Result[] }>({
    clients: [],
    projects: [],
    tasks: [],
  });
  const [isPending, startTransition] = useTransition();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (query.trim().length < 2) {
        setResults({ clients: [], projects: [], tasks: [] });
        return;
      }
      startTransition(async () => {
        const r = await quickSearch(query);
        setResults(r);
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const hasResults = results.clients.length + results.projects.length + results.tasks.length > 0;

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search anything…"
        className="input text-sm py-1.5"
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 mt-2 card p-2 max-h-80 overflow-y-auto scroll-thin z-30 shadow-xl">
          {isPending && <p className="text-xs text-base-500 px-2 py-1">Searching…</p>}
          {!isPending && !hasResults && (
            <p className="text-xs text-base-500 px-2 py-1">No results for "{query}"</p>
          )}
          {results.clients.length > 0 && (
            <div className="mb-1">
              <div className="text-[10px] uppercase tracking-wider text-base-500 px-2 py-1">Clients</div>
              {results.clients.map((r) => (
                <button key={r.id} onClick={() => go(r.href)} className="w-full text-left text-sm px-2 py-1.5 rounded-sm hover:bg-base-800 hover:text-signal">
                  {r.label}
                </button>
              ))}
            </div>
          )}
          {results.projects.length > 0 && (
            <div className="mb-1">
              <div className="text-[10px] uppercase tracking-wider text-base-500 px-2 py-1">Projects</div>
              {results.projects.map((r) => (
                <button key={r.id} onClick={() => go(r.href)} className="w-full text-left text-sm px-2 py-1.5 rounded-sm hover:bg-base-800 hover:text-signal">
                  {r.label}
                </button>
              ))}
            </div>
          )}
          {results.tasks.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-base-500 px-2 py-1">Tasks</div>
              {results.tasks.map((r) => (
                <button key={r.id} onClick={() => go(r.href)} className="w-full text-left text-sm px-2 py-1.5 rounded-sm hover:bg-base-800 hover:text-signal">
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

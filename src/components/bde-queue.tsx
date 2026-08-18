"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type QueueItem = {
  id: string;
  client_name: string;
  business_name: string | null;
  project_name: string;
  service_type: string | null;
  client_email: string | null;
  client_phone: string | null;
  status: string;
  created_at: string;
};

function maskName(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "Client";
  }

  if (parts.length === 1) {
    return parts[0];
  }

  const firstName = parts[0];
  const lastName = parts[parts.length - 1];

  return `${firstName} ${lastName.charAt(0).toUpperCase()}.`;
}

export default function BdeQueue({
  items,
}: {
  items: QueueItem[];
}) {
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return items;
    }

    return items.filter((item) => {
      const searchableText = [
        item.client_name,
        item.business_name,
        item.project_name,
        item.client_email,
        item.client_phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [items, search]);

  return (
    <section className="flex min-h-0 flex-col rounded-r-2xl border-y border-r border-white/10 bg-white/[0.025]">
      {/* FIXED HEADER */}
      <div className="h-[115px] shrink-0 border-b border-white/10 px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-white">
              ON QUEUE
            </h2>

            <p className="mt-2 text-sm leading-5 text-slate-500">
              Search registered clients
            </p>
          </div>

          <Link
            href="/bde/queue"
            className="shrink-0 rounded-lg border border-white/10 px-4 py-2 text-xs text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            View All
          </Link>
        </div>
      </div>

      {/* FIXED SEARCH */}
      <div className="shrink-0 border-b border-white/10 p-5">
        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search name, business, email, phone..."
          className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
        />
      </div>

      {/* ONLY RESULTS SCROLL */}
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {filteredItems.length === 0 ? (
          <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-white/10">
            <p className="px-5 text-center text-sm text-slate-600">
              {search
                ? "No matching client found."
                : "No clients waiting in queue."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.slice(0, 6).map((item) => {
              const safeName = maskName(item.client_name);

              const business =
                item.business_name ||
                item.project_name;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#08111f] px-4 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {safeName}
                    </p>

                    <p className="mt-1 truncate text-xs text-slate-400">
                      {business}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium uppercase text-amber-400">
                    Waiting
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
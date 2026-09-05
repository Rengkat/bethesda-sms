"use client";

import { Search } from "lucide-react";
import { useStaffFiltersStore } from "@/store/staff-filters-store";

export function StaffFilters() {
  const { search, status, category, setSearch, setStatus, setCategory } = useStaffFiltersStore();

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search
          aria-hidden="true"
          className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
        />
        <label htmlFor="staff-search" className="sr-only">
          Search staff by name or staff code
        </label>
        <input
          id="staff-search"
          type="search"
          placeholder="Search by name or staff code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-white pl-10 pr-3.5 py-2.5 text-sm focus-visible:outline-none"
        />
      </div>

      <div>
        <label htmlFor="staff-category" className="sr-only">
          Filter by category
        </label>
        <select
          id="staff-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as "TEACHING" | "NON_TEACHING" | "all")}
          className="rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm focus-visible:outline-none">
          <option value="all">All categories</option>
          <option value="TEACHING">Teaching</option>
          <option value="NON_TEACHING">Non-teaching</option>
        </select>
      </div>

      <div>
        <label htmlFor="staff-status" className="sr-only">
          Filter by status
        </label>
        <select
          id="staff-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as "active" | "inactive" | "all")}
          className="rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm focus-visible:outline-none">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All statuses</option>
        </select>
      </div>
    </div>
  );
}

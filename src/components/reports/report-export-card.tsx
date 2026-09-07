"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function ReportExportCard({
  title,
  description,
  report,
}: {
  title: string;
  description: string;
  report: "attendance-summary" | "lateness-trend";
}) {
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const [from, setFrom] = useState(isoDate(startOfYear));
  const [to, setTo] = useState(isoDate(today));

  const query = new URLSearchParams({ report, from, to }).toString();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted">{description}</p>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1" htmlFor={`${report}-from`}>
              From
            </label>
            <input
              id={`${report}-from`}
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus-visible:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1" htmlFor={`${report}-to`}>
              To
            </label>
            <input
              id={`${report}-to`}
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus-visible:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="secondary" size="sm">
            <a href={`/api/reports/export?${query}&format=csv`}>
              <Download className="h-4 w-4" aria-hidden="true" />
              CSV
            </a>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <a href={`/api/reports/export?${query}&format=pdf`}>
              <FileText className="h-4 w-4" aria-hidden="true" />
              PDF
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

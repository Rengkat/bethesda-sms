import { PageHeader } from "@/components/shared/page-header";
import { ReportExportCard } from "@/components/reports/report-export-card";

export const metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Attendance summaries and lateness trends, ready for donor and board reporting."
      />

      <div className="grid md:grid-cols-2 gap-4">
        <ReportExportCard
          title="Attendance summary"
          description="Every check-in/check-out in the range you pick, across all staff."
          report="attendance-summary"
        />
        <ReportExportCard
          title="Lateness pattern"
          description="Only late arrivals and early departures in the range you pick — useful for spotting a pattern before it becomes a query."
          report="lateness-trend"
        />
      </div>
    </div>
  );
}

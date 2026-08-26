import { Download, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Attendance summaries and lateness trends, ready for donor and board reporting."
      />

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Attendance summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted">
              Daily, weekly, or monthly attendance totals by staff or department.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="secondary" size="sm">
                <a href="/api/reports/export?report=attendance-summary&format=csv">
                  <Download className="h-4 w-4" aria-hidden="true" />
                  CSV
                </a>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <a href="/api/reports/export?report=attendance-summary&format=pdf">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  PDF
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lateness trend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted">
              Lateness patterns per staff member or department over time.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="secondary" size="sm">
                <a href="/api/reports/export?report=lateness-trend&format=csv">
                  <Download className="h-4 w-4" aria-hidden="true" />
                  CSV
                </a>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <a href="/api/reports/export?report=lateness-trend&format=pdf">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  PDF
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

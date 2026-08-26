import Link from "next/link";
import type { Department, Staff } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

type StaffRow = Staff & { department: Department };

export function StaffTable({ staff }: { staff: StaffRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">List of staff members</caption>
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="px-5 py-3 font-medium">Name</th>
            <th scope="col" className="px-5 py-3 font-medium">Staff code</th>
            <th scope="col" className="px-5 py-3 font-medium">Department</th>
            <th scope="col" className="px-5 py-3 font-medium">Role</th>
            <th scope="col" className="px-5 py-3 font-medium">Status</th>
            <th scope="col" className="px-5 py-3 font-medium">Hired</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {staff.map((person) => (
            <tr key={person.id} className="hover:bg-brand-blue-light/40">
              <td className="px-5 py-3 font-medium text-foreground">
                <Link
                  href={`/staff/${person.id}`}
                  className="hover:text-brand-blue-dark hover:underline"
                >
                  {person.fullName}
                </Link>
              </td>
              <td className="px-5 py-3 text-muted">{person.staffCode}</td>
              <td className="px-5 py-3 text-muted">{person.department.name}</td>
              <td className="px-5 py-3 text-muted">{formatRole(person.role)}</td>
              <td className="px-5 py-3">
                <Badge tone={person.active ? "success" : "neutral"}>
                  {person.active ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td className="px-5 py-3 text-muted">{formatDate(person.dateHired)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatRole(role: string) {
  return role
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

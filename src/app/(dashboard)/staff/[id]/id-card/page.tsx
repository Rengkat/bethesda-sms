import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { IdCardFront, IdCardBack } from "@/components/staff/id-card";
import { PrintIdCardButton } from "@/components/staff/print-id-card-button";

export const metadata = { title: "Staff ID card" };

export default async function StaffIdCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const staff = await prisma.staff
    .findUnique({ where: { id }, include: { department: true } })
    .catch(() => null);

  if (!staff) notFound();

  return (
    <div className="space-y-6">
      {/*
        Card is CR80 portrait — 2.125in × 3.375in, the standard size for a
        lanyard-worn staff/student ID. `@page` below sets the physical
        printed page to exactly that size (no margin), and front/back each
        force a page break so they print as two separate cards, one per
        side, ready to laminate back-to-back.
      */}
      <style>{`
        .id-card {
          width: 2.125in;
          height: 3.375in;
          border-radius: 0.14in;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.12);
        }
        @media print {
          @page { size: 2.125in 3.375in; margin: 0; }
          .id-card {
            box-shadow: none;
            border-radius: 0;
            width: 2.125in;
            height: 3.375in;
            page-break-after: always;
          }
          .id-card-preview-frame { padding: 0 !important; background: none !important; }
          /* The actual fix for "paper doesn't match the screen": browsers
             strip background-color/background-image by default when
             printing, to save ink — the blue/navy bands, the gradient
             avatar, and the pill background would otherwise all print as
             plain white regardless of what the CSS above says. This forces
             them to print exactly as shown on screen. */
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="print:hidden flex items-center justify-between">
        <Link
          href={`/staff/${staff.id}`}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to profile
        </Link>
        <PrintIdCardButton />
      </div>

      <p className="print:hidden text-sm text-muted max-w-lg">
        Front and back are set up to print as two separate CR80-size cards (2.125&quot; ×
        3.375&quot;) — laminate them back-to-back for a standard lanyard ID.
      </p>

      <div className="id-card-preview-frame flex flex-wrap items-start gap-8 bg-gray-100 rounded-2xl p-8">
        <IdCardFront staff={staff} />
        <IdCardBack staff={staff} />
      </div>
    </div>
  );
}

import Image from "next/image";
import { formatDate, initials } from "@/lib/utils";

type IdCardStaff = {
  fullName: string;
  staffCode: string;
  role: string;
  category: string | null;
  employmentType: string;
  passportPhotoUrl: string | null;
  dateOfBirth: Date | null;
  nextOfKinName: string | null;
  nextOfKinPhone: string | null;
  department: { name: string };
};

/**
 * A repeating row of dots, echoing a braille cell's dot pattern — used as
 * the card's one recurring signature motif (per a school for the blind,
 * not decoration for its own sake) instead of a plain rule between
 * sections. Pure SVG so it prints crisply at any DPI.
 */
function DotDivider({ tone = "light" }: { tone?: "light" | "dark" }) {
  const dots = Array.from({ length: 14 });
  const fill = tone === "light" ? "#ffffff" : "#c7cbf5";
  return (
    <svg viewBox="0 0 168 6" className="w-full h-[6px]" aria-hidden="true">
      {dots.map((_, i) => (
        <circle key={i} cx={6 + i * 12} cy={3} r={1.6} fill={fill} opacity={tone === "light" ? 0.55 : 0.9} />
      ))}
    </svg>
  );
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function IdCardFront({ staff }: { staff: IdCardStaff }) {
  return (
    <div className="id-card relative overflow-hidden bg-white flex flex-col">
      {/* Header */}
      <div className="bg-[#2f3fe0] px-3 pt-3 pb-6 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-[#2f3fe0] font-bold text-[9px]">
            BHB
          </span>
          <div className="text-center leading-tight">
            <p className="text-white font-semibold text-[9.5px] leading-tight">Bethesda Home &amp; School</p>
            <p className="text-white/85 text-[8px] leading-tight">for the Blind</p>
          </div>
        </div>
        <div className="w-full mt-1">
          <DotDivider tone="light" />
        </div>
      </div>

      {/* Photo, overlapping the header/body seam */}
      <div className="flex justify-center -mt-9">
        {staff.passportPhotoUrl ? (
          <Image
            src={staff.passportPhotoUrl}
            alt={`${staff.fullName} passport photo`}
            width={300}
            height={300}
            className="h-[72px] w-[72px] rounded-full object-cover border-[3px] border-white shadow-md"
          />
        ) : (
          <div className="h-[72px] w-[72px] rounded-full border-[3px] border-white shadow-md bg-gradient-to-br from-[#2f3fe0] to-[#212ea8] flex items-center justify-center text-white font-bold text-xl">
            {initials(staff.fullName)}
          </div>
        )}
      </div>

      {/* Identity */}
      <div className="text-center px-3 mt-1.5">
        <p className="font-bold text-[13px] text-[#16161d] leading-tight">{staff.fullName}</p>
        <p className="text-[9px] text-gray-500 mt-0.5">{formatLabel(staff.role)}</p>
        {staff.category && (
          <span className="inline-block mt-1.5 rounded-full bg-[#eef0fd] text-[#212ea8] text-[8px] font-medium px-2.5 py-[3px]">
            {formatLabel(staff.category)}
          </span>
        )}
      </div>

      <div className="px-4 mt-3">
        <DotDivider tone="dark" />
      </div>

      {/* Details */}
      <div className="px-4 mt-2.5 space-y-1.5 text-[9px]">
        <div className="flex justify-between gap-2">
          <span className="text-gray-500">Staff ID</span>
          <span className="text-[#16161d] font-semibold">{staff.staffCode}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-gray-500">Department</span>
          <span className="text-[#16161d] font-medium">{staff.department.name}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-gray-500">Employment</span>
          <span className="text-[#16161d] font-medium">{formatLabel(staff.employmentType)}</span>
        </div>
      </div>

      <div className="flex-1" />

      {/* Footer */}
      <div className="bg-[#16161d] text-center py-1.5">
        <p className="text-white/70 text-[6.5px] tracking-wide">Property of Bethesda Home &amp; School for the Blind</p>
      </div>
    </div>
  );
}

export function IdCardBack({ staff }: { staff: IdCardStaff }) {
  return (
    <div className="id-card relative overflow-hidden bg-white flex flex-col">
      <div className="bg-[#16161d] px-4 py-2.5">
        <p className="text-white text-[9px] font-semibold">If this card is found</p>
        <p className="text-white/70 text-[8px] mt-0.5 leading-snug">
          Please return to Bethesda Home &amp; School for the Blind, 20 Odejayi Crescent, Idi
          Oro, Lagos State.
        </p>
      </div>

      <div className="px-4 mt-3">
        <DotDivider tone="dark" />
      </div>

      <div className="px-4 mt-2.5 space-y-1.5 text-[9px]">
        <p className="text-gray-500">Emergency contact</p>
        <div className="flex justify-between gap-2">
          <span className="text-[#16161d] font-medium">{staff.nextOfKinName ?? "—"}</span>
          <span className="text-[#16161d]">{staff.nextOfKinPhone ?? "—"}</span>
        </div>
      </div>

      <div className="px-4 mt-3">
        <DotDivider tone="dark" />
      </div>

      <div className="px-4 mt-2.5 space-y-1.5 text-[9px]">
        <div className="flex justify-between gap-2">
          <span className="text-gray-500">Date of birth</span>
          <span className="text-[#16161d] font-medium">
            {staff.dateOfBirth ? formatDate(staff.dateOfBirth) : "—"}
          </span>
        </div>
      </div>

      <div className="flex-1" />

      <div className="px-4 pb-3">
        <div className="border-t border-gray-300 pt-1.5">
          <p className="text-[7.5px] text-gray-400">Staff signature</p>
        </div>
      </div>

      <div className="bg-[#16161d] text-center py-1.5">
        <p className="text-white/70 text-[6.5px] tracking-wide">This card remains the property of the school</p>
      </div>
    </div>
  );
}

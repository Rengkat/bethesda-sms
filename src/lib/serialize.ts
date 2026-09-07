import type { Staff, Donation } from "@/generated/prisma/client";

/**
 * Prisma's Decimal fields (Staff.currentSalary, Donation.amount, etc.) are
 * class instances, not plain objects — Next.js can't send them from a
 * Server Component to a "use client" component as a prop (it'll throw
 * "Only plain objects can be passed..." at runtime, not compile time,
 * which is why this is easy to miss until you actually click through).
 *
 * Components that only need to *display* a Decimal value can just call
 * `.toString()` inline in the server component's JSX — no issue there,
 * since that produces a plain string before it ever reaches a client
 * component. This helper is specifically for the cases where a full
 * record crosses the boundary (e.g. an edit form's `staff`/`donation`
 * prop, used to prefill every field) and stringifying one field inline
 * would be easy to forget the next time a Decimal field is added.
 */
export function serializeStaffForClient(staff: Staff): Omit<Staff, "currentSalary"> & { currentSalary: string | null } {
  return { ...staff, currentSalary: staff.currentSalary?.toString() ?? null };
}

export function serializeDonationForClient<T extends Donation>(
  donation: T,
): Omit<T, "amount"> & { amount: string | null } {
  return { ...donation, amount: donation.amount?.toString() ?? null };
}

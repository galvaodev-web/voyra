import { Suspense } from "react";
import { NewTrip } from "@/components/trips/new-trip";
import { LoadingSkeleton } from "@/components/ui";
export default function Page() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <NewTrip />
    </Suspense>
  );
}

import {
  SkeletonButton,
  SkeletonChips,
  SkeletonField,
  SkeletonHeader,
  SkeletonList,
  SkeletonPage,
  SkeletonSectionTitle,
} from "@/components/skeleton";

/**
 * Shared loading placeholder for the Start / Finish / Edit game forms: header,
 * player chip grid, (for Finish/Edit) the outcome rows, the detail fields and
 * the submit button.
 */
export function GameFormSkeleton({
  back = false,
  outcomes = false,
  times = false,
}: {
  back?: boolean;
  /** Show the per-player outcome rows (Finish / Edit). */
  outcomes?: boolean;
  /** Show the start/end time fields (Edit). */
  times?: boolean;
}) {
  return (
    <SkeletonPage>
      <SkeletonHeader back={back} />
      {times && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SkeletonField />
          <SkeletonField />
        </div>
      )}
      <div className="flex flex-col gap-3">
        <SkeletonSectionTitle />
        <SkeletonChips />
        {outcomes && <SkeletonList rows={3} />}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SkeletonField />
        <SkeletonField />
      </div>
      <SkeletonButton />
    </SkeletonPage>
  );
}

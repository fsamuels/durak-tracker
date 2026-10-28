import {
  Skeleton,
  SkeletonField,
  SkeletonHeader,
  SkeletonList,
  SkeletonPage,
} from "@/components/skeleton";

export default function PlayersLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <div className="flex gap-2">
        <div className="flex-1">
          <SkeletonField label={false} />
        </div>
        <Skeleton className="h-11 w-20 rounded-full" />
      </div>
      <SkeletonList rows={6} />
    </SkeletonPage>
  );
}

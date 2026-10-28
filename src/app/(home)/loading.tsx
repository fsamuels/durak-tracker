import {
  Skeleton,
  SkeletonButton,
  SkeletonCard,
  SkeletonList,
  SkeletonPage,
  SkeletonSectionTitle,
  SkeletonStatGrid,
} from "@/components/skeleton";

export default function HomeLoading() {
  return (
    <SkeletonPage>
      <Skeleton className="h-9 w-40" />
      <SkeletonCard className="h-16" />
      <SkeletonButton />
      <div className="flex flex-col gap-3">
        <SkeletonSectionTitle />
        <SkeletonStatGrid tiles={2} />
      </div>
      <div className="flex flex-col gap-3">
        <SkeletonSectionTitle />
        <SkeletonList rows={3} avatar={false} trailing tall />
      </div>
    </SkeletonPage>
  );
}

import {
  SkeletonCard,
  SkeletonHeader,
  SkeletonList,
  SkeletonPage,
  SkeletonSectionTitle,
  SkeletonSegmented,
  SkeletonStatGrid,
} from "@/components/skeleton";

export default function StatsLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonSegmented />
      <SkeletonStatGrid tiles={4} />
      <SkeletonCard className="h-16" />
      <div className="flex flex-col gap-3">
        <SkeletonSectionTitle />
        <SkeletonCard className="h-40" />
      </div>
      <div className="flex flex-col gap-3">
        <SkeletonSectionTitle />
        <SkeletonList rows={3} trailing />
      </div>
    </SkeletonPage>
  );
}

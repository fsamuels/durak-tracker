import {
  SkeletonCard,
  SkeletonHeader,
  SkeletonPage,
  SkeletonSectionTitle,
  SkeletonSegmented,
  SkeletonStatGrid,
} from "@/components/skeleton";

export default function PlayerStatsLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeader back avatar />
      <SkeletonSegmented />
      <SkeletonStatGrid tiles={4} />
      <div className="flex flex-col gap-3">
        <SkeletonSectionTitle />
        <SkeletonCard className="h-24" />
      </div>
      <div className="flex flex-col gap-3">
        <SkeletonSectionTitle />
        <SkeletonStatGrid tiles={4} />
      </div>
    </SkeletonPage>
  );
}

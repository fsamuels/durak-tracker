import {
  SkeletonButton,
  SkeletonCard,
  SkeletonHeader,
  SkeletonList,
  SkeletonPage,
  SkeletonSectionTitle,
} from "@/components/skeleton";

export default function GroupLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonCard className="h-44" />
      <div className="flex flex-col gap-3">
        <SkeletonSectionTitle />
        <SkeletonList rows={2} avatar={false} />
      </div>
      <div className="flex flex-col gap-3">
        <SkeletonSectionTitle />
        <SkeletonButton size="md" />
      </div>
    </SkeletonPage>
  );
}

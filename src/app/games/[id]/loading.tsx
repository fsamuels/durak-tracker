import {
  SkeletonButton,
  SkeletonCard,
  SkeletonHeader,
  SkeletonList,
  SkeletonPage,
  SkeletonSectionTitle,
} from "@/components/skeleton";

export default function GameDetailLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeader back />
      <SkeletonButton />
      <SkeletonCard className="h-40" />
      <div className="flex flex-col gap-3">
        <SkeletonSectionTitle />
        <SkeletonList rows={3} trailing />
      </div>
      <SkeletonButton size="md" />
    </SkeletonPage>
  );
}

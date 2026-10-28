import {
  SkeletonHeader,
  SkeletonList,
  SkeletonPage,
  SkeletonSegmented,
} from "@/components/skeleton";

export default function GamesLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonSegmented />
      <SkeletonList rows={4} avatar={false} trailing tall />
    </SkeletonPage>
  );
}

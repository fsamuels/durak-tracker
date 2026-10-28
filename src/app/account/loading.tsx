import {
  SkeletonCard,
  SkeletonField,
  SkeletonHeader,
  SkeletonList,
  SkeletonPage,
  SkeletonSectionTitle,
} from "@/components/skeleton";

export default function AccountLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <div className="flex flex-col gap-3">
        <SkeletonSectionTitle />
        <SkeletonCard className="h-10" />
      </div>
      <div className="flex flex-col gap-3">
        <SkeletonSectionTitle />
        <SkeletonField label={false} />
      </div>
      <div className="flex flex-col gap-3">
        <SkeletonSectionTitle />
        <SkeletonList rows={3} avatar={false} />
      </div>
    </SkeletonPage>
  );
}

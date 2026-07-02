import type { ReactNode } from "react";

/** Error card shared by the admin sections when a service-role load fails. */
export function ErrorCard({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="card-surface rounded-2xl px-4 py-4">
      <p className="text-sm font-medium text-red-600 dark:text-red-400">
        {title}
      </p>
      <p className="mt-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">
        {detail}
      </p>
    </div>
  );
}

/** Empty-state card shared by the admin sections. */
export function EmptyCard({ children }: { children: ReactNode }) {
  return (
    <p className="card-surface rounded-2xl px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
      {children}
    </p>
  );
}

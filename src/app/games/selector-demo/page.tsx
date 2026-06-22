import { SelectorDemo } from "./selector-demo";

/**
 * Throwaway playground for comparing player-selection patterns on a real
 * phone-width screen. Not linked from anywhere — visit /games/selector-demo
 * directly. Safe to delete once a direction is chosen.
 */
export default function SelectorDemoPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Player selection — mockups
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Three ways to pick who&apos;s playing, on placeholder data (12
          regulars + a long tail). Toggle <strong>Pick players</strong> vs{" "}
          <strong>Record result</strong> to preview both the Start/Edit and
          Finish flows, add a guest, and try assigning durak / first / last out.
        </p>
      </div>

      <SelectorDemo />
    </main>
  );
}

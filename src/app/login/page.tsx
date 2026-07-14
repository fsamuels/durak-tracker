import { Logo } from "@/components/logo";
import { OAuthButtons } from "@/components/oauth-buttons";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo size={56} />
        <h1 className="text-brand-gradient text-4xl font-bold tracking-tight">
          Durak Tracker
        </h1>
        <p className="max-w-xs text-zinc-600 dark:text-zinc-400">
          Sign in to track who got stuck as the durak.
        </p>
      </div>

      <OAuthButtons />
    </main>
  );
}

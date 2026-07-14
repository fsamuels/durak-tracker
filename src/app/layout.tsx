import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { NavMenu } from "@/components/nav-menu";
import { ServiceWorkerRegistration } from "@/components/service-worker";
import { ThemeProvider } from "@/components/theme-provider";
import { isAdmin } from "@/lib/admin";
import { getCurrentPlayerId } from "@/lib/data/groups";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Durak Tracker",
  description: "Track results of Durak card games among groups of friends.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Durak",
  },
};

// viewport-fit: cover lets content extend under the notch/status bar so
// env(safe-area-inset-*) becomes non-zero (the header/footer pad for it below).
// themeColor matches the page background per color scheme.
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3fbff" },
    { media: "(prefers-color-scheme: dark)", color: "#060c14" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const myPlayerId = user ? await getCurrentPlayerId() : null;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="app-bg min-h-full flex flex-col">
        {/* Capture beforeinstallprompt before React hydrates so the component never misses it. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__installPrompt=e;});`,
          }}
        />
        <ThemeProvider>
          {user && (
            <header className="sticky top-0 z-30 border-b border-black/10 bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-md dark:border-white/10">
              <div className="mx-auto flex w-full max-w-md items-center justify-between px-6 py-3">
                <Link
                  href="/"
                  className="flex items-center gap-2 text-base font-bold tracking-tight text-black dark:text-zinc-50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icon.svg"
                    alt=""
                    width={24}
                    height={24}
                    className="size-6 rounded-md"
                  />
                  Durak Tracker
                </Link>
                <NavMenu isAdmin={isAdmin(user)} myPlayerId={myPlayerId} />
              </div>
            </header>
          )}
          {children}
          <footer
            className={`px-6 pt-6 text-center text-xs text-zinc-400 dark:text-zinc-600 ${
              user
                ? // Clear the fixed bottom tab bar (3.5rem) + its safe-area inset.
                  "pb-[calc(env(safe-area-inset-bottom)+5rem)]"
                : "pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
            }`}
          >
            <p>
              <a
                href="https://github.com/fsamuels/durak-tracker"
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-4 hover:text-zinc-600 hover:underline dark:hover:text-zinc-400"
              >
                Durak Tracker
              </a>{" "}
              v1.0 · created by Forrest Samuels and AI
            </p>
            <p className="mt-1">
              <Link
                href="/privacy"
                className="underline-offset-4 hover:text-zinc-600 hover:underline dark:hover:text-zinc-400"
              >
                Privacy
              </Link>{" "}
              ·{" "}
              <Link
                href="/data-deletion"
                className="underline-offset-4 hover:text-zinc-600 hover:underline dark:hover:text-zinc-400"
              >
                Data deletion
              </Link>
            </p>
            {user && <p className="mt-1">Logged in as {user.email}</p>}
          </footer>
          {user && <BottomNav />}
          <InstallPrompt hasBottomNav={!!user} />
          <ServiceWorkerRegistration />
        </ThemeProvider>
      </body>
    </html>
  );
}

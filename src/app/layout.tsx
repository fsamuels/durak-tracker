import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { InstallPrompt } from "@/components/install-prompt";
import { NavMenu } from "@/components/nav-menu";
import { ServiceWorkerRegistration } from "@/components/service-worker";
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
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Durak",
  },
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

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {user && (
          <header className="border-b border-black/10 dark:border-white/10">
            <div className="mx-auto flex w-full max-w-md items-center justify-between px-6 py-3">
              <Link
                href="/"
                className="text-base font-bold tracking-tight text-black dark:text-zinc-50"
              >
                ♠️ Durak Tracker
              </Link>
              <NavMenu />
            </div>
          </header>
        )}
        {children}
        <footer className="px-6 py-6 text-center text-xs text-zinc-400 dark:text-zinc-600">
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
          {user && <p className="mt-1">Logged in as {user.email}</p>}
        </footer>
        <InstallPrompt />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}

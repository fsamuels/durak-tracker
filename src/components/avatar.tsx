/**
 * A circular profile picture for an authenticated player. When `src` is present
 * it renders the picture; otherwise it falls back to the player's initials on a
 * subtle brand-tinted disc, so guests and members without a picture still get a
 * consistent, name-anchored marker.
 *
 * The avatar is decorative — the player's name is always shown next to it — so
 * the image carries an empty `alt` and the fallback is `aria-hidden`, keeping
 * screen readers from announcing the name twice. Remote provider URLs (Google
 * et al.) are loaded with `referrerPolicy="no-referrer"`, which Google's
 * `lh3.googleusercontent.com` requires to avoid a 403, and lazily.
 */

const SIZE_CLASSES = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
} as const;

export type AvatarSize = keyof typeof SIZE_CLASSES;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  src,
  name,
  size = "md",
  className = "",
}: {
  src?: string | null;
  name: string;
  size?: AvatarSize;
  className?: string;
}) {
  const sizeClass = SIZE_CLASSES[size];

  if (src) {
    // A plain <img> (not next/image): remote OAuth provider avatars can't be
    // statically optimized, and <img> avoids per-domain remotePatterns config
    // for the arbitrary picture hosts each provider uses.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        className={`${sizeClass} shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-black/[0.06] font-medium text-zinc-500 dark:bg-white/10 dark:text-zinc-400 ${className}`}
    >
      {initials(name)}
    </span>
  );
}

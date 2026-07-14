/**
 * The "Fool & Fan" brand mark (public/icon.svg) rendered inline — used by the
 * app header and the login/onboarding/claim page heroes. Decorative: the
 * adjacent wordmark/title carries the accessible name, so this is aria-hidden.
 */
export function Logo({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    // A plain <img> (not next/image): a small static SVG served from public/
    // has nothing to gain from the image optimizer.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icon.svg"
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={className ? `rounded-[22%] ${className}` : "rounded-[22%]"}
    />
  );
}

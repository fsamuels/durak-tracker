import { ImageResponse } from "next/og";

export const dynamic = "force-static";

// 1024 is the App-Store/Facebook listing size; the rest back the PWA manifest.
const VALID_SIZES = new Set(["192", "512", "1024", "maskable-512"]);

function Icon({ size, maskable }: { size: number; maskable: boolean }) {
  const padding = maskable ? size * 0.15 : size * 0.08;
  const inner = size - padding * 2;

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: maskable
          ? "linear-gradient(135deg, #18181b 0%, #27272a 100%)"
          : "#09090b",
        borderRadius: maskable ? 0 : size * 0.18,
      }}
    >
      <div
        style={{
          width: inner,
          height: inner,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: inner * 0.72,
          lineHeight: 1,
        }}
      >
        🃏
      </div>
    </div>
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size: sizeParam } = await params;

  if (!VALID_SIZES.has(sizeParam)) {
    return new Response("Not found", { status: 404 });
  }

  const maskable = sizeParam.startsWith("maskable-");
  const px = parseInt(sizeParam.replace("maskable-", ""));

  return new ImageResponse(<Icon size={px} maskable={maskable} />, {
    width: px,
    height: px,
    emoji: "twemoji",
  });
}

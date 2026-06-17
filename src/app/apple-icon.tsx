import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: 180,
        height: 180,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #18181b 0%, #27272a 100%)",
        borderRadius: 40,
        fontSize: 120,
        lineHeight: 1,
      }}
    >
      🃏
    </div>,
    { ...size, emoji: "twemoji" },
  );
}

import { ImageResponse } from "next/og";

// ✅ FIX 1: Export nhiều size cho mọi device
export async function generateImageMetadata() {
  return [
    {
      contentType: "image/png",
      size: { width: 48, height: 48 },
      id: "small",
    },
    {
      contentType: "image/png", 
      size: { width: 72, height: 72 },
      id: "medium",
    },
    {
      contentType: "image/png",
      size: { width: 96, height: 96 },
      id: "large",
    },
    {
      contentType: "image/png",
      size: { width: 144, height: 144 },
      id: "xlarge",
    },
    {
      contentType: "image/png",
      size: { width: 180, height: 180 }, // ✅ FIX 5: iOS
      id: "apple",
    },
    {
      contentType: "image/png",
      size: { width: 192, height: 192 }, // ✅ FIX 1: Android
      id: "android",
    },
    {
      contentType: "image/png",
      size: { width: 512, height: 512 },
      id: "large",
    },
  ];
}

export const runtime = "edge"; // ✅ FIX 8: Nhanh hơn

export default function Icon({ id }: { id: string }) {
  // ✅ FIX 2: Maskable cần padding 10% safe zone
  const isMaskable = id === "android" || id === "large";
  const padding = isMaskable ? "10%" : "0";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
          borderRadius: "22%",
          padding: padding, // ✅ FIX 2
        }}
      >
        <svg
          width="60%"
          height="60%"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          shapeRendering="geometricPrecision" // ✅ FIX 6
        >
          <circle cx="50" cy="50" r="46" fill="white" opacity="0.95" />
          
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          
          <path
            d="M50 20L30 70H40L44 58H56L60 70H70L50 20ZM46 50L50 38L54 50H46Z"
            fill="url(#grad)"
          />
        </svg>
      </div>
    ),
    {
      width: 512,
      height: 512,
    }
  );
}

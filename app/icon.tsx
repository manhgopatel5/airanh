import { ImageResponse } from "next/og";

// ✅ Export nhiều size cho mọi device
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
      size: { width: 180, height: 180 }, // iOS
      id: "apple",
    },
    {
      contentType: "image/png",
      size: { width: 192, height: 192 }, // Android
      id: "android",
    },
    {
      contentType: "image/png",
      size: { width: 512, height: 512 },
      id: "512",
    },
  ];
}

export const runtime = "edge";

export default function Icon({ id }: { id: string }) {
  // Maskable cần padding 10% safe zone
  const isMaskable = id === "android" || id === "512";
  const padding = isMaskable ? "10%" : "0";

  // HUHA brand color
  const size = id === "small" ? 48 : id === "medium" ? 72 : id === "large" ? 96 : id === "xlarge" ? 144 : id === "apple" ? 180 : id === "android" ? 192 : 512;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0042B2 0%, #1A5FFF 100%)",
          borderRadius: "22%",
          padding: padding,
        }}
      >
        <svg
          width="60%"
          height="60%"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          shapeRendering="geometricPrecision"
        >
          <circle cx="50" cy="50" r="46" fill="white" opacity="0.98" />
          
          <defs>
            <linearGradient id="huhaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0042B2" />
              <stop offset="100%" stopColor="#1A5FFF" />
            </linearGradient>
          </defs>
          
          {/* H letter - HUHA style */}
          <path
            d="M30 25V75H38V55H62V75H70V25H62V47H38V25H30Z"
            fill="url(#huhaGrad)"
          />
        </svg>
      </div>
    ),
    {
      width: size,
      height: size,
    }
  );
}
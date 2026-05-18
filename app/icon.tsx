import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";

// Cache 1 năm vì icon ít khi đổi
export const revalidate = 31536000;

export const size = {
  width: 512,
  height: 512,
};

export async function generateImageMetadata() {
  return [
    { id: "32", size: { width: 32, height: 32 } },
    { id: "48", size: { width: 48, height: 48 } },
    { id: "72", size: { width: 72, height: 72 } },
    { id: "96", size: { width: 96, height: 96 } },
    { id: "144", size: { width: 144, height: 144 } },
    { id: "180", size: { width: 180, height: 180 } }, // apple-touch-icon
    { id: "192", size: { width: 192, height: 192 } }, // android
    { id: "512", size: { width: 512, height: 512 } }, // maskable
  ];
}

export default function Icon({ id }: { id: string }) {
  const size = Number(id);
  const isMaskable = size === 192 || size === 512;
  const padding = isMaskable ? "10%" : "0%";

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
          borderRadius: isMaskable ? "0%" : "22%", // maskable phải vuông
          padding,
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
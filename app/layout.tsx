import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import { AuthProvider } from "@/lib/AuthContext";
import EmailGuard from "@/components/EmailGuard";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-inter",
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://airanh.vercel.app"),
  title: {
    default: "AIR",
    template: "%s | AIR",
  },
  description: "Kết nối người cần việc và người tìm việc nhanh chóng, an toàn",
  keywords: ["social", "task", "freelance", "vietnam", "kết nối", "airanh", "việc làm tự do"],
  authors: [{ name: "Airanh Team", url: "https://airanh.vercel.app" }],
  creator: "Airanh",
  publisher: "Airanh",
  applicationName: "AIR",
  referrer: "origin-when-cross-origin",
  formatDetection: { telephone: false, email: false, address: false },

  alternates: {
    canonical: "/",
  },

  icons: {
    icon: [
      { url: "/favicon-16.PNG", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.PNG", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon-180.PNG", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico",
  },

  manifest: "/manifest.json",

  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "https://airanh.vercel.app",
    siteName: "AIR",
    title: "AIR - Nền tảng việc làm tự do",
    description: "Kết nối người cần việc và người tìm việc nhanh chóng, an toàn",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AIR",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "AIR - Nền tảng việc làm tự do",
    description: "Kết nối người cần việc và người tìm việc nhanh chóng, an toàn",
    images: ["/og-image.png"],
    creator: "@airanh",
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: "default", // ← SỬA: từ "black-translucent" thành "default"
    title: "AIR",
    startupImage: [
      { url: "/splash-1290x2796.PNG", media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/splash-1179x2556.PNG", media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/splash-1170x2532.PNG", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/splash-1125x2436.PNG", media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/splash-1242x2688.PNG", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/splash-828x1792.PNG", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)" },
      { url: "/splash-750x1334.PNG", media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" },
      { url: "/splash-2048x2732.PNG", media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" },
      { url: "/splash-1668x2388.PNG", media: "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)" },
      { url: "/splash-1536x2048.PNG", media: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)" },
    ],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "contain", // ← SỬA: từ "cover" thành "contain"
  themeColor: "#ffffff", // ← SỬA: để đơn giản, bỏ mảng đi
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-sans bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 antialiased overscroll-none tracking-tight">
        <AuthProvider>
          <EmailGuard>
            <ClientLayout>{children}</ClientLayout>
          </EmailGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
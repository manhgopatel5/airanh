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

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL("https://airanh.com"),
  title: {
    default: "Airanh",
    template: "%s | Airanh",
  },
  description: "Kết nối, chia sẻ nhiệm vụ và kiếm tiền cùng bạn bè",
  keywords: ["social", "task", "freelance", "vietnam", "kết nối", "airanh"],
  authors: [{ name: "Airanh Team", url: "https://airanh.com" }],
  creator: "Airanh",
  publisher: "Airanh",
  applicationName: "Airanh",
  referrer: "origin-when-cross-origin",
  formatDetection: { telephone: false, email: false, address: false },

  alternates: {
    canonical: "/",
  },

  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico",
    other: [
      { rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#3b82f6" },
    ],
  },

  manifest: "/manifest.json",

  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "https://airanh.com",
    siteName: "Airanh",
    title: "Airanh - Social Task App",
    description: "Kết nối, chia sẻ nhiệm vụ và kiếm tiền cùng bạn bè",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Airanh",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Airanh - Social Task App",
    description: "Kết nối, chia sẻ nhiệm vụ và kiếm tiền cùng bạn bè",
    images: ["/og-image.png"],
    creator: "@airanh",
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: "default", // ✅ Quan trọng: default mới đẩy content xuống
    title: "Airanh",
    startupImage: [
      {
        url: "/splash-1170x2532.png",
        media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash-1284x2778.png",
        media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)",
      },
      // ✅ THÊM: iPhone 15 Pro Max
      {
        url: "/splash-1290x2796.png",
        media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)",
      },
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

  other: {
    "msapplication-TileColor": "#3b82f6",
    "msapplication-config": "/browserconfig.xml",
    // ✅ THÊM: Force iOS PWA full screen
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // ✅ Bắt buộc cho env(safe-area-inset-*)
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* ✅ THÊM: Meta tag backup cho iOS cũ */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
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
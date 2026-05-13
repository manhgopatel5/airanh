import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import { AuthProvider } from "@/lib/AuthContext";
import EmailGuard from "@/components/EmailGuard";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import { LazyMotion, domAnimation } from "framer-motion";

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://airanh.vercel.app"),
  title: {
    default: "HUHA - Việc vặt gần bạn",
    template: "%s | HUHA",
  },
  description: "Kết nối việc vặt 800K, gần bạn, xong ngay. Thuê người hoặc nhận việc trong 5 phút.",
  keywords: ["huha", "việc vặt", "freelance", "giúp việc", "ship", "task", "vietnam"],
  authors: [{ name: "HUHA Team", url: "https://airanh.vercel.app" }],
  creator: "HUHA",
  publisher: "HUHA",
  applicationName: "HUHA",
  referrer: "origin-when-cross-origin",
  formatDetection: { telephone: false, email: false, address: false },
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "https://airanh.vercel.app",
    siteName: "HUHA",
    title: "HUHA - Việc vặt gần bạn",
    description: "Thuê người hoặc nhận việc 800K, gần bạn, xong ngay.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "HUHA" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HUHA - Việc vặt gần bạn",
    description: "Thuê người hoặc nhận việc 800K, gần bạn, xong ngay.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0042B2" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0A" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={cn(inter.variable)} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://airanh.vercel.app" />
        <link rel="preload" href="/lotties/huha-loading-pull-full.lottie" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/lotties/huha-idle-full.lottie" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/lotties/huha-empty-full.lottie" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/lotties/huha-success-check-full.lottie" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/lotties/huha-error-shake-full.lottie" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/lotties/huha-celebrate-full.lottie" as="fetch" crossOrigin="anonymous" />
      </head>
      <body className="font-sans bg-[#FAFAFB] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 antialiased overscroll-none tracking-tight">
        <LazyMotion features={domAnimation} strict>
          <AuthProvider>
            <EmailGuard>
              <ClientLayout>{children}</ClientLayout>
            </EmailGuard>
            <Toaster 
              position="top-center" 
              richColors 
              closeButton
              toastOptions={{
                classNames: {
                  toast: "rounded-2xl border-zinc-200 dark:border-zinc-800 font-sans backdrop-blur-xl",
                  title: "font-semibold",
                }
              }}
            />
          </AuthProvider>
        </LazyMotion>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "HUHA",
              url: "https://airanh.vercel.app",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web, iOS, Android",
            }),
          }}
        />
      </body>
    </html>
  );
}
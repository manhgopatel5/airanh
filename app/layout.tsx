import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

export default function RootLayout({ children }: any) {
  return (
    <html lang="vi">
      <body className="max-w-md mx-auto">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}

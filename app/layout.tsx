import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import { AuthProvider } from "@/lib/AuthContext";

export default function RootLayout({ children }: any) {
  return (
    <html lang="vi">
      <body className="max-w-md mx-auto">
        <AuthProvider>
          <ClientLayout>{children}</ClientLayout>
        </AuthProvider>
      </body>
    </html>
  );
}

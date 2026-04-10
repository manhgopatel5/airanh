
import "./globals.css";
import BottomNav from "@/components/BottomNav";

export default function RootLayout({ children }: any) {
  return (
    <html lang="vi">
      <body className="max-w-md mx-auto">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}

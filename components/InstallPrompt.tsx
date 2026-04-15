"use client";

import { useEffect, useState } from "react";

export default function InstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isInStandalone = (window.navigator as any).standalone;

    if (isIos && !isInStandalone) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-black text-white p-4 rounded-xl">
      👉 Nhấn Share → Add to Home Screen để dùng như app
    </div>
  );
}

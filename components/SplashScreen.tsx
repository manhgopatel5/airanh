'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function SplashScreen() {
  const [show, setShow] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    // Check nếu đang chạy PWA thì bỏ qua React splash
    const isPWA = window.matchMedia('(display-mode: standalone)').matches 
                  || (window.navigator as any).standalone 
                  || document.referrer.includes('android-app://')
    
    if (isPWA) {
      setShow(false)
      return
    }

    // Chỉ hiện trên web thường
    if (sessionStorage.getItem('airanh-splash')) {
      setShow(false)
      return
    }
    
    setShow(true)
    
    const hideTimer = setTimeout(() => {
      setFadeOut(true)
      setTimeout(() => {
        setShow(false)
        sessionStorage.setItem('airanh-splash', '1')
      }, 300)
    }, 2000)

    return () => clearTimeout(hideTimer)
  }, [])

  if (!show) return null

  return (
    <div 
      className={`fixed inset-0 z- bg-white dark:bg-zinc-950 flex items-center justify-center transition-opacity duration-300 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <Image 
        src="/icon-512.PNG" 
        alt="AIR" 
        width={120} 
        height={120}
        priority
        className="animate-pulse"
      />
    </div>
  )
}
'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function SplashScreen() {
  const [show, setShow] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    // Chỉ hiện lần đầu vào web
    if (sessionStorage.getItem('airanh-splash')) return
    
    // Delay 0.5s mới hiện
    const showTimer = setTimeout(() => setShow(true), 500)
    
    // Hiện 2s rồi bắt đầu fade out
    const hideTimer = setTimeout(() => {
      setFadeOut(true)
      // Đợi fade xong 300ms thì ẩn hẳn
      setTimeout(() => {
        setShow(false)
        sessionStorage.setItem('airanh-splash', '1')
      }, 300)
    }, 2500) // 0.5s delay + 2s hiện

    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  if (!show) return null

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-white dark:bg-zinc-950 flex items-center justify-center transition-opacity duration-300 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <Image 
        src="/icon-512.PNG" 
        alt="Airanh" 
        width={120} 
        height={120}
        priority
        className="animate-pulse"
      />
    </div>
  )
}
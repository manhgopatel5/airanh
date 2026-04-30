'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function SplashScreen() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000) // 2s
    return () => clearTimeout(timer)
  }, [])

  if (!loading) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-white dark:bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Image 
          src="/icon-512.PNG" 
          alt="Airanh" 
          width={120} 
          height={120}
          priority
          className="animate-pulse"
        />
        <p className="text-sm text-gray-500">AIRẢNH - AI CŨNG CÓ VIỆC</p>
      </div>
    </div>
  )
}
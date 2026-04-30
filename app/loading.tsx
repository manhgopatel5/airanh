import Image from 'next/image'

export default function Loading() {
  return (
    <div className="h-screen w-screen bg-white flex items-center justify-center">
      <Image src="/icon-512.PNG" alt="Loading" width={100} height={100} className="animate-spin" />
    </div>
  )
}
import { create } from 'zustand'

type AppMode = 'task' | 'plan'

interface AppStore {
  mode: AppMode
  setMode: (mode: AppMode) => void
  unreadCount: number
  setUnreadCount: (count: number) => void
  hideTabBar: boolean
  setHideTabBar: (hide: boolean) => void
}

export const useAppStore = create<AppStore>((set) => ({
  mode: 'task',
  setMode: (mode) => set({ mode }),
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  hideTabBar: false,
  setHideTabBar: (hide) => set({ hideTabBar: hide }),
}))
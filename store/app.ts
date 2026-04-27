import { create } from 'zustand'

type AppMode = 'task' | 'plan'

interface AppStore {
  mode: AppMode
  setMode: (mode: AppMode) => void
}

export const useAppStore = create<AppStore>((set) => ({
  mode: 'task',
  setMode: (mode) => set({ mode }),
}))
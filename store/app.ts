import { create } from 'zustand'

type MainTab = "home" | "messages" | "tasks" | "profile"

interface AppStore {
  mode: "task" | "plan"
  setMode: (mode: "task" | "plan") => void
  currentMainTab: MainTab  // Thêm dòng này
  setCurrentMainTab: (tab: MainTab) => void // Thêm dòng này
}

export const useAppStore = create<AppStore>((set) => ({
  mode: "task",
  setMode: (mode) => set({ mode }),
  currentMainTab: "home", // Thêm dòng này
  setCurrentMainTab: (tab) => set({ currentMainTab: tab }), // Thêm dòng này
}))
'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ViewType =
  | 'dashboard'
  | 'news'
  | 'locations'
  | 'categories'
  | 'ads'
  | 'reporters'
  | 'notifications'
  | 'settings'
  | 'media'
  | 'audit-logs'

interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  avatar?: string | null
}

interface AppState {
  activeView: ViewType
  isAuthenticated: boolean
  currentUser: AdminUser | null
  sidebarOpen: boolean
  setActiveView: (view: ViewType) => void
  setAuthenticated: (auth: boolean) => void
  setCurrentUser: (user: AdminUser | null) => void
  setSidebarOpen: (open: boolean) => void
  logout: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeView: 'dashboard',
      isAuthenticated: false,
      currentUser: null,
      sidebarOpen: true,
      setActiveView: (view) => set({ activeView: view }),
      setAuthenticated: (auth) => set({ isAuthenticated: auth }),
      setCurrentUser: (user) => set({ currentUser: user }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      logout: () =>
        set({
          isAuthenticated: false,
          currentUser: null,
          activeView: 'dashboard',
        }),
    }),
    {
      name: 'tjsn-admin-store',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        currentUser: state.currentUser,
      }),
    }
  )
)

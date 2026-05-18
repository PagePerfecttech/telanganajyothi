'use client'

import { useAppStore, type ViewType } from '@/lib/store'
import LoginPage from '@/components/admin/login-page'
import AdminLayout from '@/components/admin/admin-layout'
import DashboardPage from '@/components/admin/dashboard-page'
import NewsPage from '@/components/admin/news-page'
import LocationsPage from '@/components/admin/locations-page'
import CategoriesPage from '@/components/admin/categories-page'
import AdsPage from '@/components/admin/ads-page'
import ReportersPage from '@/components/admin/reporters-page'
import NotificationsPage from '@/components/admin/notifications-page'
import SettingsPage from '@/components/admin/settings-page'
import MediaPage from '@/components/admin/media-page'
import AuditLogsPage from '@/components/admin/audit-logs-page'

const moduleComponents: Record<ViewType, React.ComponentType> = {
  dashboard: DashboardPage,
  news: NewsPage,
  locations: LocationsPage,
  categories: CategoriesPage,
  ads: AdsPage,
  reporters: ReportersPage,
  notifications: NotificationsPage,
  settings: SettingsPage,
  media: MediaPage,
  'audit-logs': AuditLogsPage,
}

export default function Home() {
  const { isAuthenticated, activeView } = useAppStore()

  if (!isAuthenticated) {
    return <LoginPage />
  }

  const ActiveModule = moduleComponents[activeView] || DashboardPage

  return (
    <AdminLayout>
      <ActiveModule />
    </AdminLayout>
  )
}

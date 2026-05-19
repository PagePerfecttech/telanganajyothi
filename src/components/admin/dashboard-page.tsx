'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { authFetch } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Newspaper, Users, Eye, Clock, UserCheck, Send, Plus, Bell } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface DashboardData {
  kpis: {
    totalNews: number
    activeUsers: number
    pendingReviews: number
    activeReporters: number
    publishedToday: number
    totalViews: number
  }
  newsByCategory: { categoryId: string; categoryName: string; count: number }[]
  weeklyData: { date: string; count: number }[]
  recentActivity: { id: string; action: string; entity: string; createdAt: string; admin: { name: string } }[]
}

const COLORS = ['#DC2626', '#7C3AED', '#059669', '#D97706', '#2563EB', '#0891B2', '#4F46E5', '#16A34A', '#65A30D', '#9333EA']

export default function DashboardPage() {
  const { setActiveView } = useAppStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      const res = await authFetch('/api/admin/dashboard')
      const d = await res.json()
      setData(d)
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!data) return <div className="text-center text-muted-foreground">Failed to load dashboard</div>

  const kpiCards = [
    { title: 'Total News', value: data.kpis.totalNews, icon: Newspaper, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30' },
    { title: 'Active Users', value: data.kpis.activeUsers, icon: Users, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30' },
    { title: "Today's Views", value: data.kpis.totalViews?.toLocaleString() || '0', icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
    { title: 'Pending Reviews', value: data.kpis.pendingReviews, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    { title: 'Active Reporters', value: data.kpis.activeReporters, icon: UserCheck, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
    { title: 'Published Today', value: data.kpis.publishedToday, icon: Send, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-950/30' },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.title} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${kpi.bg}`}>
                    <Icon className={`h-5 w-5 ${kpi.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                    <p className="text-xs text-muted-foreground">{kpi.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button className="bg-red-600 hover:bg-red-700" onClick={() => setActiveView('news')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Breaking News
        </Button>
        <Button variant="outline" onClick={() => setActiveView('notifications')}>
          <Bell className="h-4 w-4 mr-2" />
          Send Push Notification
        </Button>
        <Button variant="outline" onClick={() => setActiveView('videos')}>
          <Newspaper className="h-4 w-4 mr-2" />
          Manage Videos
        </Button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* News by Category - Pie Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">News by Category</CardTitle>
            <CardDescription>Distribution of news across categories</CardDescription>
          </CardHeader>
          <CardContent>
            {data.newsByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data.newsByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="categoryName"
                  >
                    {data.newsByCategory.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">No data</div>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {data.newsByCategory.map((cat, i) => (
                <span key={cat.categoryId} className="flex items-center gap-1 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  {cat.categoryName} ({cat.count})
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly News - Bar Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">News This Week</CardTitle>
            <CardDescription>Published articles per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.weeklyData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => new Date(d).toLocaleDateString('en', { weekday: 'short' })}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip
                  labelFormatter={(d) => new Date(d).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}
                />
                <Bar dataKey="count" fill="#DC2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentActivity.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {data.recentActivity.map((log) => (
                <div key={log.id} className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  <span className="font-medium">{log.admin?.name || 'System'}</span>
                  <span className="text-muted-foreground">{log.action}</span>
                  <span className="text-muted-foreground">{log.entity}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

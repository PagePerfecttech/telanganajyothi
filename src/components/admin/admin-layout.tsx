'use client'

import { useAppStore, type ViewType } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard,
  Newspaper,
  Video,
  MapPin,
  FolderOpen,
  Tag,
  Megaphone,
  Users,
  UserCog,
  Contact,
  Bell,
  Settings,
  Image,
  FileText,
  Menu,
  LogOut,
  ChevronLeft,
  Banknote,
  Award,
} from 'lucide-react'
import { useState } from 'react'

const navItems: { id: ViewType; label: string; icon: React.ElementType; section?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Overview' },
  { id: 'news', label: 'News Management', icon: Newspaper, section: 'Content' },
  { id: 'videos', label: 'Videos', icon: Video },
  { id: 'categories', label: 'Categories', icon: FolderOpen },
  { id: 'tags', label: 'Tags', icon: Tag },
  { id: 'locations', label: 'Locations', icon: MapPin, section: 'Management' },
  { id: 'ads', label: 'Ads Management', icon: Megaphone },
  { id: 'reporters', label: 'Reporters List', icon: Users },
  { id: 'reporter-performance', label: 'Reporter Performance', icon: Award },
  { id: 'withdrawals', label: 'Withdrawals', icon: Banknote },
  { id: 'users', label: 'App Users', icon: Contact },
  { id: 'admins', label: 'Admin Users', icon: UserCog, section: 'System' },
  { id: 'notifications', label: 'Push Notifications', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'media', label: 'Media Library', icon: Image },
  { id: 'audit-logs', label: 'Audit Logs', icon: FileText },
]

function SidebarNav({
  activeView,
  onViewChange,
  collapsed,
}: {
  activeView: ViewType
  onViewChange: (view: ViewType) => void
  collapsed: boolean
}) {
  return (
    <div className="flex flex-col h-full">
      <div className={cn('flex items-center gap-3 px-4 h-16 border-b border-white/10', collapsed && 'justify-center px-2')}>
        <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 bg-white p-0.5">
          <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="flex flex-col">
              <h1 className="text-sm font-bold text-white leading-tight">Spot News</h1>
              <span className="text-[10px] text-white/80 leading-tight">by Telangana Jyothi</span>
            </div>
            <p className="text-[10px] text-gray-400 leading-tight">Spot News Admin</p>
          </div>
        )}
      </div>
      <ScrollArea className="flex-1 py-2">
        <nav className="space-y-0.5 px-2">
          {navItems.map((item, idx) => {
            const Icon = item.icon
            const isActive = activeView === item.id
            return (
              <div key={item.id}>
                {item.section && !collapsed && (
                  <div className={cn(
                    'px-3 pt-4 pb-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider',
                    idx === 0 && 'pt-1'
                  )}>
                    {item.section}
                  </div>
                )}
                <button
                  onClick={() => onViewChange(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-red-600 text-white shadow-md'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white',
                    collapsed && 'justify-center px-2'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              </div>
            )
          })}
        </nav>
      </ScrollArea>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { activeView, setActiveView, currentUser, logout, sidebarOpen, setSidebarOpen } = useAppStore()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    logout()
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col bg-gray-900 text-white transition-all duration-300 border-r border-gray-800',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        <SidebarNav activeView={activeView} onViewChange={setActiveView} collapsed={collapsed} />
        <div className="p-2 border-t border-white/10">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-gray-400 hover:text-white hover:bg-white/10"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
            {!collapsed && <span className="ml-2">Collapse</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64 bg-gray-900 border-gray-800">
          <div className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
            <SheetDescription>Main navigation menu for the admin dashboard</SheetDescription>
          </div>
          <SidebarNav activeView={activeView} onViewChange={(v) => { setActiveView(v); setSidebarOpen(false) }} collapsed={false} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-semibold capitalize">{activeView.replace(/-/g, ' ')}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-red-600 text-white text-xs">
                  {currentUser?.name?.split(' ').map(n => n[0]).join('') || 'A'}
                </AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <p className="font-medium leading-tight">{currentUser?.name || 'Admin'}</p>
                <p className="text-xs text-muted-foreground">{currentUser?.role || 'admin'}</p>
              </div>
            </div>
            <Separator orientation="vertical" className="h-8 hidden sm:block" />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <LogOut className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

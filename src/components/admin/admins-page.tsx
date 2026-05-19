'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  UserPlus,
  Pencil,
  Trash2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Search,
  MoreHorizontal,
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { authFetch, authFetchJSON, authFetchJson } from '@/lib/utils'

interface AdminItem {
  id: string
  email: string
  name: string
  avatar: string | null
  role: string
  isActive: boolean
  createdAt: string
  _count?: { news: number; auditLogs: number }
}

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  super_admin: {
    label: 'Super Admin',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: <ShieldAlert className="h-3 w-3" />,
  },
  admin: {
    label: 'Admin',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: <Shield className="h-3 w-3" />,
  },
  editor: {
    label: 'Editor',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: <ShieldCheck className="h-3 w-3" />,
  },
  moderator: {
    label: 'Moderator',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: <Shield className="h-3 w-3" />,
  },
}

const ROLE_OPTIONS = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'moderator', label: 'Moderator' },
]

export default function AdminsPage() {
  const { currentUser } = useAppStore()
  const [admins, setAdmins] = useState<AdminItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState<AdminItem | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState('editor')
  const [formIsActive, setFormIsActive] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  const isSuperAdmin = currentUser?.role === 'super_admin'

  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true)
      const data = await authFetchJson<AdminItem[] | { admins: AdminItem[] }>('/api/admin/admins')
      setAdmins(Array.isArray(data) ? data : data.admins ?? [])
    } catch {
      toast.error('Failed to load administrators')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAdmins()
  }, [fetchAdmins])

  const resetForm = () => {
    setFormName('')
    setFormEmail('')
    setFormPassword('')
    setFormRole('editor')
    setFormIsActive(true)
    setShowPassword(false)
  }

  const openCreateDialog = () => {
    resetForm()
    setCreateOpen(true)
  }

  const openEditDialog = (admin: AdminItem) => {
    setSelectedAdmin(admin)
    setFormName(admin.name)
    setFormEmail(admin.email)
    setFormPassword('')
    setFormRole(admin.role)
    setFormIsActive(admin.isActive)
    setShowPassword(false)
    setEditOpen(true)
  }

  const openDeleteDialog = (admin: AdminItem) => {
    setSelectedAdmin(admin)
    setDeleteOpen(true)
  }

  const handleCreate = async () => {
    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
      toast.error('Name, email, and password are required')
      return
    }
    if (formPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setSubmitting(true)
    try {
      const res = await authFetchJSON('/api/admin/admins', {
        method: 'POST',
        body: JSON.stringify({
          name: formName.trim(),
          email: formEmail.trim(),
          password: formPassword,
          role: formRole,
          isActive: formIsActive,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Failed to create admin')
      }
      toast.success('Administrator created successfully')
      setCreateOpen(false)
      resetForm()
      fetchAdmins()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create admin')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedAdmin) return
    if (!formName.trim() || !formEmail.trim()) {
      toast.error('Name and email are required')
      return
    }
    if (formPassword && formPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        name: formName.trim(),
        email: formEmail.trim(),
        role: formRole,
        isActive: formIsActive,
      }
      if (formPassword) {
        body.password = formPassword
      }

      const res = await authFetchJSON(`/api/admin/admins/${selectedAdmin.id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Failed to update admin')
      }
      toast.success('Administrator updated successfully')
      setEditOpen(false)
      setSelectedAdmin(null)
      resetForm()
      fetchAdmins()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update admin')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedAdmin) return

    setSubmitting(true)
    try {
      const res = await authFetch(`/api/admin/admins/${selectedAdmin.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Failed to delete admin')
      }
      toast.success('Administrator deleted successfully')
      setDeleteOpen(false)
      setSelectedAdmin(null)
      fetchAdmins()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete admin')
    } finally {
      setSubmitting(false)
    }
  }

  const isSelf = (admin: AdminItem) => currentUser?.id === admin.id

  const filteredAdmins = admins.filter((admin) => {
    const matchesSearch =
      admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'all' || admin.role === roleFilter
    return matchesSearch && matchesRole
  })

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  // ─── Not Super Admin Warning ─────────────────────────────────
  if (!isSuperAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Management</h1>
          <p className="text-muted-foreground">Manage administrator accounts and roles</p>
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-amber-100 p-4 mb-4">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Only Super Administrators can manage admin accounts. Please contact a Super Admin if you need changes made.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Main Content ────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Management</h1>
          <p className="text-muted-foreground">Manage administrator accounts and roles</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-red-600 hover:bg-red-700 text-white">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Admin
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Admins',
            value: admins.length,
            icon: <Users className="h-4 w-4 text-red-600" />,
          },
          {
            label: 'Active',
            value: admins.filter((a) => a.isActive).length,
            icon: <ShieldCheck className="h-4 w-4 text-green-600" />,
          },
          {
            label: 'Super Admins',
            value: admins.filter((a) => a.role === 'super_admin').length,
            icon: <ShieldAlert className="h-4 w-4 text-red-600" />,
          },
          {
            label: 'Inactive',
            value: admins.filter((a) => !a.isActive).length,
            icon: <Shield className="h-4 w-4 text-muted-foreground" />,
          },
        ].map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                {stat.icon}
              </div>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Administrators</CardTitle>
          <CardDescription>
            {filteredAdmins.length} of {admins.length} admin accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No administrators found</p>
              {(searchQuery || roleFilter !== 'all') && (
                <Button
                  variant="ghost"
                  className="mt-2 text-red-600"
                  onClick={() => {
                    setSearchQuery('')
                    setRoleFilter('all')
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Name</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Email</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Role</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground text-center">Articles</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Activity</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdmins.map((admin) => {
                    const roleCfg = ROLE_CONFIG[admin.role] ?? ROLE_CONFIG.admin
                    return (
                      <tr
                        key={admin.id}
                        className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        {/* Name */}
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                              {admin.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{admin.name}</p>
                              {isSelf(admin) && (
                                <span className="text-xs text-red-600 font-medium">(You)</span>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* Email */}
                        <td className="py-3 pr-4">
                          <span className="text-sm text-muted-foreground truncate block max-w-[200px]">
                            {admin.email}
                          </span>
                        </td>
                        {/* Role */}
                        <td className="py-3 pr-4">
                          <Badge variant="outline" className={`${roleCfg.color} gap-1 font-medium`}>
                            {roleCfg.icon}
                            {roleCfg.label}
                          </Badge>
                        </td>
                        {/* Articles */}
                        <td className="py-3 pr-4 text-center">
                          <span className="text-sm font-medium">
                            {admin._count?.news ?? 0}
                          </span>
                        </td>
                        {/* Activity */}
                        <td className="py-3 pr-4">
                          <div className="text-sm text-muted-foreground">
                            {admin._count?.auditLogs ? (
                              <span>{admin._count.auditLogs} log entries</span>
                            ) : (
                              <span className="text-xs">No activity</span>
                            )}
                          </div>
                        </td>
                        {/* Status */}
                        <td className="py-3 pr-4">
                          {admin.isActive ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200 font-medium">
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-600 border-gray-200 font-medium">
                              Inactive
                            </Badge>
                          )}
                        </td>
                        {/* Actions */}
                        <td className="py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(admin)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openDeleteDialog(admin)}
                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                disabled={isSelf(admin)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                                {isSelf(admin) && (
                                  <span className="ml-auto text-xs text-muted-foreground">
                                    Own account
                                  </span>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Create Dialog ──────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) resetForm(); setCreateOpen(open) }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Administrator</DialogTitle>
            <DialogDescription>
              Create a new admin account with specific role and permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="create-name">
                Full Name <span className="text-red-600">*</span>
              </Label>
              <Input
                id="create-name"
                placeholder="Enter full name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">
                Email Address <span className="text-red-600">*</span>
              </Label>
              <Input
                id="create-email"
                type="email"
                placeholder="admin@example.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">
                Password <span className="text-red-600">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="create-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 6 characters"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-role">Role</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger id="create-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="create-active" className="cursor-pointer">Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  Inactive admins cannot log in
                </p>
              </div>
              <Switch
                id="create-active"
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm() }}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Dialog ────────────────────────────────────────── */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAdmin(null)
            resetForm()
          }
          setEditOpen(open)
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Administrator</DialogTitle>
            <DialogDescription>
              Update account details and permissions for {selectedAdmin?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">
                Full Name <span className="text-red-600">*</span>
              </Label>
              <Input
                id="edit-name"
                placeholder="Enter full name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">
                Email Address <span className="text-red-600">*</span>
              </Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="admin@example.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">Password</Label>
              <div className="relative">
                <Input
                  id="edit-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Leave empty to keep current password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty to keep the current password
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger id="edit-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="edit-active" className="cursor-pointer">Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedAdmin && isSelf(selectedAdmin)
                    ? 'You cannot deactivate your own account'
                    : 'Inactive admins cannot log in'}
                </p>
              </div>
              <Switch
                id="edit-active"
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
                disabled={selectedAdmin ? isSelf(selectedAdmin) : false}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditOpen(false)
                setSelectedAdmin(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ────────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={(open) => { if (!open) setSelectedAdmin(null); setDeleteOpen(open) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Administrator</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedAdmin?.name}</strong>? This action
              will soft-delete the account. The admin will no longer be able to access the system,
              but their data will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import {
  Search,
  Star,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  Phone,
  MapPin,
  Globe,
  Calendar,
  ShieldCheck,
  ShieldX,
} from 'lucide-react'
import { authFetch, authFetchJSON, authFetchJson } from '@/lib/utils'

interface UserItem {
  id: string
  phone: string
  name: string | null
  email: string | null
  avatar: string | null
  stateId: string | null
  districtId: string | null
  preferredLanguage: string
  isActive: boolean
  isPremium: boolean
  createdAt: string
  state: { name: string } | null
  district: { name: string } | null
  mandal: { name: string } | null
}

interface District {
  id: string
  name: string
}

interface Mandal {
  id: string
  name: string
  districtId: string
}

interface UsersResponse {
  users: UserItem[]
  total: number
  page: number
  limit: number
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [mandals, setMandals] = useState<Mandal[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [districtId, setDistrictId] = useState('')
  const [mandalId, setMandalId] = useState('')
  const limit = 20

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserItem | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    isActive: true,
    isPremium: false,
    districtId: '',
    mandalId: '',
    stateId: '',
  })
  const [saving, setSaving] = useState(false)

  // View dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewUser, setViewUser] = useState<UserItem | null>(null)

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (search) params.set('search', search)
      if (districtId) params.set('districtId', districtId)
      if (mandalId) params.set('mandalId', mandalId)

      const data = await authFetchJson<UsersResponse>(`/api/admin/users?${params.toString()}`)
      setUsers(data.users)
      setTotal(data.total)
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [page, search, districtId, mandalId])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    authFetchJson<District[]>('/api/admin/districts')
      .then(setDistricts)
      .catch(() => toast.error('Failed to load districts'))
    authFetchJson<Mandal[]>('/api/admin/mandals')
      .then(setMandals)
      .catch(() => toast.error('Failed to load mandals'))
  }, [])

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleDistrictChange = (value: string) => {
    setDistrictId(value)
    setMandalId('') // Reset mandal when district changes
    setPage(1)
  }

  const handleMandalChange = (value: string) => {
    setMandalId(value)
    setPage(1)
  }

  const openEdit = (user: UserItem) => {
    setEditUser(user)
    setEditForm({
      name: user.name || '',
      isActive: user.isActive,
      isPremium: user.isPremium,
      districtId: user.districtId || '',
      mandalId: user.mandalId || '',
      stateId: user.stateId || '',
    })
    setEditDialogOpen(true)
  }

  const openView = (user: UserItem) => {
    setViewUser(user)
    setViewDialogOpen(true)
  }

  const handleSave = async () => {
    if (!editUser) return
    try {
      setSaving(true)
      const res = await authFetchJSON(`/api/admin/users/${editUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      })
      if (!res.ok) throw new Error('Failed to update')
      toast.success('User updated successfully')
      setEditDialogOpen(false)
      setEditUser(null)
      fetchUsers()
    } catch {
      toast.error('Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  const handlePremiumToggle = async (user: UserItem) => {
    const newPremium = !user.isPremium
    // Optimistic update
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, isPremium: newPremium } : u))
    )
    try {
      const res = await authFetchJSON(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isPremium: newPremium }),
      })
      if (!res.ok) throw new Error('Failed to toggle premium')
      toast.success(newPremium ? 'Premium activated' : 'Premium deactivated')
    } catch {
      // Revert on error
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isPremium: user.isPremium } : u))
      )
      toast.error('Failed to update premium status')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await authFetch(`/api/admin/users/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('User deleted successfully')
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
      fetchUsers()
    } catch {
      toast.error('Failed to delete user')
    }
  }

  const totalPages = Math.ceil(total / limit)
  const startIndex = (page - 1) * limit + 1
  const endIndex = Math.min(page * limit, total)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const getInitials = (name: string | null, phone: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return phone.slice(-2)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-red-600" />
            App Users
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total.toLocaleString('en-IN')} total users
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="w-full sm:w-auto flex gap-2">
              <select
                className="w-full sm:w-[200px] border rounded-md px-3 py-2 text-sm bg-background h-10"
                value={districtId}
                onChange={(e) => handleDistrictChange(e.target.value)}
              >
                <option value="">All Districts</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              <select
                className="w-full sm:w-[200px] border rounded-md px-3 py-2 text-sm bg-background h-10"
                value={mandalId}
                onChange={(e) => handleMandalChange(e.target.value)}
                disabled={!districtId}
              >
                <option value="">All Mandals</option>
                {mandals
                  .filter((m) => m.districtId === districtId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>

              {/* Clear filters */}
              {(search || districtId || mandalId) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearch('')
                    setDistrictId('')
                    setMandalId('')
                    setPage(1)
                  }}
                  className="h-10 px-3"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-sm font-medium">No users found</p>
              <p className="text-xs mt-1">
                {search || districtId
                  ? 'Try adjusting your search or filter'
                  : 'Users will appear here when they sign up'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="hidden md:table-cell">Location</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Premium</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      {/* Name with Avatar */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-red-100 text-red-700 text-xs">
                              {getInitials(user.name, user.phone)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate max-w-[140px]">
                              {user.name || '—'}
                            </p>
                            {user.email && (
                              <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                                {user.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Phone */}
                      <TableCell className="text-sm font-mono">
                        {user.phone}
                      </TableCell>

                      {/* Location */}
                      <TableCell className="hidden md:table-cell">
                          <div className="flex flex-col text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {user.district?.name || '—'}
                            </span>
                            {user.mandal?.name && (
                              <span className="flex items-center gap-1 text-xs ml-4 mt-0.5">
                                • {user.mandal.name}
                              </span>
                            )}
                          </div>
                      </TableCell>

                      {/* Language Badge */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            user.preferredLanguage === 'te'
                              ? 'border-orange-200 bg-orange-50 text-orange-700'
                              : 'border-blue-200 bg-blue-50 text-blue-700'
                          }
                        >
                          <Globe className="h-3 w-3 mr-1" />
                          {user.preferredLanguage === 'te' ? 'TE' : 'EN'}
                        </Badge>
                      </TableCell>

                      {/* Premium Toggle */}
                      <TableCell>
                        <button
                          onClick={() => handlePremiumToggle(user)}
                          className="inline-flex items-center gap-1.5 cursor-pointer group"
                          title={user.isPremium ? 'Remove premium' : 'Grant premium'}
                        >
                          <Star
                            className={`h-4 w-4 transition-colors ${
                              user.isPremium
                                ? 'fill-amber-400 text-amber-500'
                                : 'text-gray-300 group-hover:text-amber-300'
                            }`}
                          />
                          <span
                            className={`text-xs font-medium ${
                              user.isPremium ? 'text-amber-600' : 'text-muted-foreground'
                            }`}
                          >
                            {user.isPremium ? 'Premium' : 'Free'}
                          </span>
                        </button>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          className={
                            user.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }
                        >
                          {user.isActive ? (
                            <ShieldCheck className="h-3 w-3 mr-1" />
                          ) : (
                            <ShieldX className="h-3 w-3 mr-1" />
                          )}
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>

                      {/* Joined */}
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          {formatDate(user.createdAt)}
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openView(user)}
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEdit(user)}
                            title="Edit user"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setDeleteTarget(user)
                              setDeleteDialogOpen(true)
                            }}
                            title="Delete user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex}–{endIndex} of {total.toLocaleString('en-IN')} users
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = page - 2 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? 'default' : 'outline'}
                    size="sm"
                    className={
                      page === pageNum
                        ? 'bg-red-600 hover:bg-red-700 h-8 w-8 p-0'
                        : 'h-8 w-8 p-0'
                    }
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* View User Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>Detailed information about this app user.</DialogDescription>
          </DialogHeader>
          {viewUser && (
            <div className="space-y-4">
              {/* User Header */}
              <div className="flex items-center gap-4 pb-4 border-b">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-red-100 text-red-700 text-lg">
                    {getInitials(viewUser.name, viewUser.phone)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">
                    {viewUser.name || 'Unnamed User'}
                  </h3>
                  <p className="text-sm text-muted-foreground">{viewUser.email || 'No email'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className={
                        viewUser.preferredLanguage === 'te'
                          ? 'border-orange-200 bg-orange-50 text-orange-700'
                          : 'border-blue-200 bg-blue-50 text-blue-700'
                      }
                    >
                      {viewUser.preferredLanguage === 'te' ? 'Telugu' : 'English'}
                    </Badge>
                    <Badge
                      className={
                        viewUser.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }
                    >
                      {viewUser.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {viewUser.isPremium && (
                      <Badge className="bg-amber-100 text-amber-700">
                        <Star className="h-3 w-3 mr-1 fill-amber-500" />
                        Premium
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Phone
                  </p>
                  <p className="text-sm font-mono">{viewUser.phone}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    District
                  </h4>
                  <p className="text-sm">{viewUser.district?.name || '—'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Mandal
                  </h4>
                  <p className="text-sm">{viewUser.mandal?.name || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> State
                  </p>
                  <p className="text-sm">{viewUser.state?.name || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Joined
                  </p>
                  <p className="text-sm">{formatDate(viewUser.createdAt)}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewDialogOpen(false)}
            >
              Close
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                setViewDialogOpen(false)
                if (viewUser) openEdit(viewUser)
              }}
            >
              <Pencil className="h-4 w-4 mr-1" /> Edit User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information. Most fields are read-only.
            </DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              {/* Read-only Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Phone</Label>
                  <Input value={editUser.phone} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Email</Label>
                  <Input
                    value={editUser.email || '—'}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              {/* Editable: Name */}
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Enter user name"
                />
              </div>

              {/* Editable: District */}
              <div className="space-y-2">
                <Label>District</Label>
                <select
                  className="w-full border rounded-md p-2 text-sm bg-background"
                  value={editForm.districtId}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, districtId: e.target.value, mandalId: '' }))
                  }
                >
                  <option value="">Select district</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Editable: Mandal */}
              <div className="space-y-2">
                <Label>Mandal</Label>
                <select
                  className="w-full border rounded-md p-2 text-sm bg-background"
                  value={editForm.mandalId}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, mandalId: e.target.value }))
                  }
                >
                  <option value="">Select mandal</option>
                  {mandals
                    .filter((m) => m.districtId === editForm.districtId)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Read-only Language */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Preferred Language</Label>
                <Input
                  value={editUser.preferredLanguage === 'te' ? 'Telugu' : 'English'}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* Editable Toggles */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Premium</Label>
                    <p className="text-xs text-muted-foreground">
                      Grant premium access
                    </p>
                  </div>
                  <Switch
                    checked={editForm.isPremium}
                    onCheckedChange={(v) =>
                      setEditForm((p) => ({ ...p, isPremium: v }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable user account
                    </p>
                  </div>
                  <Switch
                    checked={editForm.isActive}
                    onCheckedChange={(v) =>
                      setEditForm((p) => ({ ...p, isActive: v }))
                    }
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold">
                {deleteTarget?.name || deleteTarget?.phone}
              </span>
              ? This action will soft-delete the user account. They will no longer be
              able to access the app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

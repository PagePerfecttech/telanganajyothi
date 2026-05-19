'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  Trash2,
  Tag,
  Search,
  Loader2,
  TrendingUp,
  Hash,
} from 'lucide-react'
import { authFetch, authFetchJSON } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface TagItem {
  id: string
  name: string
  slug: string
  type: string
  isTrending: boolean
  isActive: boolean
  createdAt: string
  _count?: { news: number }
}

interface TagFormData {
  name: string
  slug: string
  type: string
  isTrending: boolean
  isActive: boolean
}

const emptyForm: TagFormData = {
  name: '',
  slug: '',
  type: 'topic',
  isTrending: false,
  isActive: true,
}

const TYPE_COLORS: Record<string, string> = {
  topic: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  person: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  event: 'bg-green-100 text-green-800 hover:bg-green-100',
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function TagsPage() {
  const [tags, setTags] = useState<TagItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<TagItem | null>(null)
  const [formData, setFormData] = useState<TagFormData>(emptyForm)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingTag, setDeletingTag] = useState<TagItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Trending toggle loading
  const [togglingTrendingId, setTogglingTrendingId] = useState<string | null>(null)

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true)
      const res = await authFetch('/api/admin/tags')
      if (!res.ok) throw new Error('Failed to fetch tags')
      const data = await res.json()
      setTags(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load tags')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  // Filter tags
  const filteredTags = tags.filter((tag) => {
    const matchesSearch =
      tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tag.slug.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === 'all' || tag.type === filterType
    return matchesSearch && matchesType
  })

  // Open create dialog
  const handleCreate = () => {
    setEditingTag(null)
    setFormData(emptyForm)
    setSlugManuallyEdited(false)
    setDialogOpen(true)
  }

  // Open edit dialog
  const handleEdit = (tag: TagItem) => {
    setEditingTag(tag)
    setFormData({
      name: tag.name,
      slug: tag.slug,
      type: tag.type,
      isTrending: tag.isTrending,
      isActive: tag.isActive,
    })
    setSlugManuallyEdited(true)
    setDialogOpen(true)
  }

  // Handle name change - auto-generate slug
  const handleNameChange = (name: string) => {
    setFormData((prev) => {
      const newSlug = slugManuallyEdited ? prev.slug : generateSlug(name)
      return { ...prev, name, slug: newSlug }
    })
  }

  // Handle slug change
  const handleSlugChange = (slug: string) => {
    setSlugManuallyEdited(true)
    setFormData((prev) => ({ ...prev, slug }))
  }

  // Submit create/edit
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Tag name is required')
      return
    }
    if (!formData.slug.trim()) {
      toast.error('Slug is required')
      return
    }

    try {
      setSubmitting(true)
      const url = editingTag
        ? `/api/admin/tags/${editingTag.id}`
        : '/api/admin/tags'
      const method = editingTag ? 'PUT' : 'POST'

      const res = await authFetchJSON(url, {
        method,
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to ${editingTag ? 'update' : 'create'} tag`)
      }

      toast.success(`Tag ${editingTag ? 'updated' : 'created'} successfully`)
      setDialogOpen(false)
      fetchTags()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  // Toggle trending
  const handleTrendingToggle = async (tag: TagItem) => {
    try {
      setTogglingTrendingId(tag.id)
      const res = await authFetchJSON(`/api/admin/tags/${tag.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isTrending: !tag.isTrending }),
      })

      if (!res.ok) throw new Error('Failed to update trending status')

      setTags((prev) =>
        prev.map((t) =>
          t.id === tag.id ? { ...t, isTrending: !t.isTrending } : t
        )
      )
      toast.success(
        tag.isTrending ? 'Removed from trending' : 'Marked as trending'
      )
    } catch {
      toast.error('Failed to update trending status')
    } finally {
      setTogglingTrendingId(null)
    }
  }

  // Delete
  const handleDelete = async () => {
    if (!deletingTag) return

    try {
      setDeleting(true)
      const res = await authFetch(`/api/admin/tags/${deletingTag.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete tag')

      toast.success('Tag deleted successfully')
      setDeleteDialogOpen(false)
      setDeletingTag(null)
      fetchTags()
    } catch {
      toast.error('Failed to delete tag')
    } finally {
      setDeleting(false)
    }
  }

  const openDeleteDialog = (tag: TagItem) => {
    setDeletingTag(tag)
    setDeleteDialogOpen(true)
  }

  const stats = {
    total: tags.length,
    active: tags.filter((t) => t.isActive).length,
    trending: tags.filter((t) => t.isTrending).length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="h-6 w-6 text-red-600" />
            Tags Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage news tags, topics, and trending labels
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-red-600 hover:bg-red-700 text-white shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Tag
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Tags</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center">
                <Hash className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Tags</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
                <Tag className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Trending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.trending}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">All Tags</CardTitle>
          <CardDescription>Search and manage your tags</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tags by name or slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="topic">Topic</SelectItem>
                <SelectItem value="person">Person</SelectItem>
                <SelectItem value="event">Event</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            </div>
          ) : filteredTags.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No tags found</p>
              <p className="text-gray-400 text-xs mt-1">
                {searchQuery || filterType !== 'all'
                  ? 'Try adjusting your search or filter'
                  : 'Create your first tag to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Trending</TableHead>
                    <TableHead className="text-center">News Count</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTags.map((tag) => (
                    <TableRow key={tag.id}>
                      <TableCell className="font-medium text-gray-900">
                        {tag.name}
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm font-mono">
                        {tag.slug}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${TYPE_COLORS[tag.type] || 'bg-gray-100 text-gray-800'} capitalize`}
                          variant="secondary"
                        >
                          {tag.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={tag.isTrending}
                            onCheckedChange={() => handleTrendingToggle(tag)}
                            disabled={togglingTrendingId === tag.id}
                            className="data-[state=checked]:bg-orange-500"
                          />
                          {togglingTrendingId === tag.id && (
                            <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center h-6 min-w-[28px] px-2 rounded-full bg-gray-100 text-xs font-medium text-gray-700">
                          {tag._count?.news ?? 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            tag.isActive
                              ? 'bg-green-100 text-green-800 hover:bg-green-100'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-100'
                          }
                        >
                          {tag.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(tag)}
                            className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(tag)}
                            className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
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

          {/* Footer count */}
          {!loading && filteredTags.length > 0 && (
            <div className="mt-4 text-xs text-gray-400">
              Showing {filteredTags.length} of {tags.length} tags
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editingTag ? 'Edit Tag' : 'Create New Tag'}
            </DialogTitle>
            <DialogDescription>
              {editingTag
                ? 'Update the tag details below.'
                : 'Add a new tag to organize your news content.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="tag-name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="tag-name"
                placeholder="Enter tag name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>

            {/* Slug */}
            <div className="grid gap-2">
              <Label htmlFor="tag-slug">
                Slug <span className="text-red-500">*</span>
              </Label>
              <Input
                id="tag-slug"
                placeholder="tag-slug"
                value={formData.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-400">
                Auto-generated from name. Edit manually if needed.
              </p>
            </div>

            {/* Type */}
            <div className="grid gap-2">
              <Label htmlFor="tag-type">
                Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger id="tag-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="topic">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      Topic
                    </span>
                  </SelectItem>
                  <SelectItem value="person">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-purple-500" />
                      Person
                    </span>
                  </SelectItem>
                  <SelectItem value="event">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      Event
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm">Trending</Label>
                  <p className="text-xs text-gray-400">Show in trending</p>
                </div>
                <Switch
                  checked={formData.isTrending}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isTrending: checked }))
                  }
                  className="data-[state=checked]:bg-orange-500"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm">Active</Label>
                  <p className="text-xs text-gray-400">Tag visibility</p>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isActive: checked }))
                  }
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {editingTag ? 'Updating...' : 'Creating...'}
                </>
              ) : editingTag ? (
                'Update Tag'
              ) : (
                'Create Tag'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-900">
                &quot;{deletingTag?.name}&quot;
              </span>
              ? This action will soft-delete the tag and it will no longer be
              visible in the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Tag'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

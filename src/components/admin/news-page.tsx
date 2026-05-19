'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { authFetch, authFetchJSON, authFetchJson } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Search, CheckCircle, XCircle, Upload, X, ImageIcon, ArrowLeft, Save, Loader2 } from 'lucide-react'

interface NewsItem {
  id: string
  title: string
  shortDesc: string | null
  status: string
  priority: string
  createdAt: string
  publishedAt: string | null
  viewsCount: number
  thumbnailUrl: string
  imagesUrls: string[]
  videoUrl: string | null
  category: { name: string; color: string }
  district: { name: string } | null
  reporter: { name: string } | null
  tags: { tag: { name: string; slug: string } }[]
}

interface Category { id: string; name: string }
interface State { id: string; name: string; code: string }
interface District { id: string; name: string; stateId: string }
interface Reporter { id: string; name: string }
interface Tag { id: string; name: string; slug: string; type: string }

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  pending_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  archived: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

const priorityColors: Record<string, string> = {
  normal: 'bg-gray-100 text-gray-600',
  high: 'bg-orange-100 text-orange-700',
  breaking: 'bg-red-600 text-white',
}

export default function NewsPage() {
  const { currentUser, pendingAction, setPendingAction } = useAppStore()
  const [news, setNews] = useState<NewsItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [states, setStates] = useState<State[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [reporters, setReporters] = useState<Reporter[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectId, setRejectId] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  // Page-based form state
  const [formMode, setFormMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editItemId, setEditItemId] = useState<string | null>(null)

  const limit = 15

  const fetchNews = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus)
      if (filterCategory && filterCategory !== 'all') params.set('categoryId', filterCategory)
      if (filterPriority && filterPriority !== 'all') params.set('priority', filterPriority)
      if (activeTab === 'pending') params.set('status', 'pending_review')

      const data = await authFetchJson<{ news: NewsItem[]; total: number }>(`/api/admin/news?${params}`)
      setNews(data.news || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error('Fetch news error:', err)
      toast.error('Failed to load news')
    } finally {
      setLoading(false)
    }
  }, [page, search, filterStatus, filterCategory, filterPriority, activeTab])

  useEffect(() => {
    const loadDeps = async () => {
      try {
        const [cats, stateList, dists, reps, tagList] = await Promise.all([
          authFetchJson<Category[]>('/api/admin/categories'),
          authFetchJson<State[]>('/api/admin/states'),
          authFetchJson<District[]>('/api/admin/districts'),
          authFetchJson<Reporter[]>('/api/admin/reporters'),
          authFetchJson<Tag[]>('/api/admin/tags'),
        ])
        setCategories(cats)
        setStates(stateList)
        setDistricts(dists)
        setReporters(reps)
        setTags(tagList)
      } catch (err) {
        console.error('Failed to load dependencies:', err)
      }
    }
    loadDeps()
  }, [])

  useEffect(() => {
    if (formMode === 'list') {
      fetchNews()
    }
  }, [fetchNews, formMode])

  // Handle pending action from dashboard (e.g., "Create Breaking News")
  useEffect(() => {
    if (pendingAction === 'create-breaking' || pendingAction === 'create') {
      setPendingAction(null)
      openCreateForm()
    }
  }, [pendingAction, setPendingAction])

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await authFetchJSON(`/api/admin/news/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminId: currentUser?.id }),
      })
      if (!res.ok) throw new Error()
      toast.success(`News ${status}`)
      fetchNews()
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleReject = async () => {
    await handleStatusChange(rejectId, 'rejected')
    setRejectDialogOpen(false)
    setRejectReason('')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this news?')) return
    try {
      await authFetch(`/api/admin/news/${id}`, { method: 'DELETE' })
      toast.success('News deleted')
      fetchNews()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const openCreateForm = () => {
    setEditItemId(null)
    setFormMode('create')
  }

  const openEditForm = (id: string) => {
    setEditItemId(id)
    setFormMode('edit')
  }

  const handleFormSave = async (formData: Record<string, unknown>) => {
    try {
      if (editItemId) {
        const res = await authFetchJSON(`/api/admin/news/${editItemId}`, {
          method: 'PUT',
          body: JSON.stringify({ ...formData, updatedBy: currentUser?.id }),
        })
        if (!res.ok) throw new Error()
        toast.success('News updated successfully')
      } else {
        const res = await authFetchJSON('/api/admin/news', {
          method: 'POST',
          body: JSON.stringify({ ...formData, createdBy: currentUser?.id }),
        })
        if (!res.ok) throw new Error()
        toast.success('News created successfully')
      }
      setFormMode('list')
      setEditItemId(null)
    } catch {
      toast.error('Failed to save news')
    }
  }

  const handleFormCancel = () => {
    setFormMode('list')
    setEditItemId(null)
  }

  const totalPages = Math.ceil(total / limit)

  // Show full-page form for create/edit
  if (formMode === 'create' || formMode === 'edit') {
    return (
      <NewsFormPage
        key={editItemId || 'create'}
        editItemId={editItemId}
        onSave={handleFormSave}
        onCancel={handleFormCancel}
        categories={categories}
        states={states}
        districts={districts}
        reporters={reporters}
        tags={tags}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">News Management</h1>
          <p className="text-sm text-muted-foreground">{total} total articles</p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700" onClick={openCreateForm}>
          <Plus className="h-4 w-4 mr-2" /> Create News
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All News</TabsTrigger>
          <TabsTrigger value="pending">Pending Review</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search news..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_review">Pending</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="breaking">Breaking</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="min-w-[250px]">Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>District</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {news.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.thumbnailUrl ? (
                          <img src={item.thumbnailUrl} alt="" className="w-10 h-10 rounded object-cover bg-muted" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">N</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium max-w-[300px] truncate">{item.title}</div>
                        {item.tags?.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {item.tags.slice(0, 3).map(t => (
                              <span key={t.tag.slug} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{t.tag.name}</span>
                            ))}
                            {item.tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{item.tags.length - 3}</span>}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" style={{ borderColor: item.category?.color, color: item.category?.color }}>
                          {item.category?.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{item.district?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge className={priorityColors[item.priority] || ''}>{item.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[item.status] || ''}>{item.status.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{item.viewsCount?.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          {item.status === 'pending_review' && (
                            <>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleStatusChange(item.id, 'published')}>
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => { setRejectId(item.id); setRejectDialogOpen(true) }}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditForm(item.id)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {news.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No news found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject News</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Label>Rejection Reason</Label>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Enter reason for rejection..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// Full-Page News Form Component
// ============================================================
function NewsFormPage({
  editItemId, onSave, onCancel, categories, states, districts, reporters, tags,
}: {
  editItemId: string | null
  onSave: (data: Record<string, unknown>) => void
  onCancel: () => void
  categories: Category[]
  states: State[]
  districts: District[]
  reporters: Reporter[]
  tags: Tag[]
}) {
  const [form, setForm] = useState<Record<string, unknown>>({
    title: '', shortDesc: '', content: '', categoryId: '', stateId: '', districtId: '',
    thumbnailUrl: '', imagesUrls: [] as string[], videoUrl: '', sourceType: 'original', reporterId: '',
    priority: 'normal', status: 'draft', isFeatured: false, tagIds: [] as string[],
  })
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pageLoading, setPageLoading] = useState(!!editItemId)

  // Load edit data
  useEffect(() => {
    if (editItemId && !loaded) {
      authFetchJson<Record<string, unknown>>(`/api/admin/news/${editItemId}`)
        .then(data => {
          // Robustly extract tag IDs from the API response
          const tagIds = Array.isArray(data.tags)
            ? data.tags
                .map((t: Record<string, unknown>) => {
                  const tag = t.tag as Record<string, unknown> | undefined
                  return tag?.id as string | undefined
                })
                .filter((id: string | undefined): id is string => !!id)
            : []

          setForm({
            title: data.title || '',
            shortDesc: data.shortDesc || '',
            content: data.content || '',
            categoryId: data.categoryId || '',
            stateId: data.stateId || '',
            districtId: data.districtId || '',
            thumbnailUrl: data.thumbnailUrl || '',
            imagesUrls: Array.isArray(data.imagesUrls) ? data.imagesUrls : [],
            videoUrl: data.videoUrl || '',
            sourceType: data.sourceType || 'original',
            reporterId: data.reporterId || '',
            priority: data.priority || 'normal',
            status: data.status || 'draft',
            isFeatured: data.isFeatured || false,
            tagIds,
          })
          setLoaded(true)
          setPageLoading(false)
        })
        .catch(() => {
          toast.error('Failed to load news data')
          setPageLoading(false)
        })
    } else if (!editItemId) {
      setLoaded(true)
      setPageLoading(false)
    }
  }, [editItemId, loaded])

  const updateField = (key: string, value: unknown) => setForm(prev => ({ ...prev, [key]: value }))

  const extractYoutubeThumbnail = (url: string): string | null => {
    if (!url) return null
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
    const match = url.match(regExp)
    if (match && match[2].length === 11) {
      return `https://img.youtube.com/vi/${match[2]}/hqdefault.jpg`
    }
    return null
  }

  const handleVideoUrlChange = (url: string) => {
    updateField('videoUrl', url)
    const ytThumb = extractYoutubeThumbnail(url)
    if (ytThumb && (!form.thumbnailUrl || (form.thumbnailUrl as string).startsWith('https://img.youtube.com/'))) {
      updateField('thumbnailUrl', ytThumb)
    }
  }

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingThumbnail(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await authFetch('/api/admin/media/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) {
        updateField('thumbnailUrl', data.url)
        toast.success('Thumbnail uploaded')
      }
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploadingThumbnail(false)
    }
  }

  const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingImages(true)
    const currentImages = (form.imagesUrls as string[]) || []
    try {
      for (const file of Array.from(files)) {
        if (currentImages.length >= 8) break
        const formData = new FormData()
        formData.append('file', file)
        const res = await authFetch('/api/admin/media/upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (data.url) {
          currentImages.push(data.url)
        }
      }
      updateField('imagesUrls', [...currentImages])
      toast.success('Images uploaded')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploadingImages(false)
    }
  }

  const removeImage = (index: number) => {
    const current = (form.imagesUrls as string[]) || []
    updateField('imagesUrls', current.filter((_, i) => i !== index))
  }

  const toggleTag = (tagId: string) => {
    const current = (form.tagIds as string[]) || []
    if (current.includes(tagId)) {
      updateField('tagIds', current.filter(id => id !== tagId))
    } else {
      updateField('tagIds', [...current, tagId])
    }
  }

  const handleSubmit = async () => {
    if (!form.title) {
      toast.error('Title is required')
      return
    }
    if (!form.categoryId) {
      toast.error('Category is required')
      return
    }
    if (!form.stateId) {
      toast.error('State is required')
      return
    }
    setSaving(true)
    try {
      await onSave(form)
    } finally {
      setSaving(false)
    }
  }

  if (pageLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onCancel} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{editItemId ? 'Edit News' : 'Create News'}</h1>
          <p className="text-sm text-muted-foreground">
            {editItemId ? 'Update the news article details below' : 'Fill in the details to create a new news article'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6 space-y-5">
              {/* Title */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Title *</Label>
                <Input
                  value={form.title as string}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="Enter news title"
                  className="text-base"
                />
              </div>

              {/* Short Description */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Short Description</Label>
                <Textarea
                  value={form.shortDesc as string}
                  onChange={(e) => updateField('shortDesc', e.target.value)}
                  rows={2}
                  placeholder="Brief summary (max 500 chars)"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">{(form.shortDesc as string)?.length || 0}/500 characters</p>
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Full Content</Label>
                <Textarea
                  value={form.content as string}
                  onChange={(e) => updateField('content', e.target.value)}
                  rows={8}
                  placeholder="Detailed news content (optional)"
                  className="min-h-[200px]"
                />
              </div>

              {/* Thumbnail Upload */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Thumbnail Image</Label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Input
                      value={form.thumbnailUrl as string}
                      onChange={(e) => updateField('thumbnailUrl', e.target.value)}
                      placeholder="Image URL or upload below"
                    />
                  </div>
                  <label className="cursor-pointer">
                    <Button type="button" variant="outline" size="sm" disabled={uploadingThumbnail} asChild>
                      <span>
                        {uploadingThumbnail ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-1" />
                        )}
                        Upload
                      </span>
                    </Button>
                    <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} />
                  </label>
                </div>
                {(form.thumbnailUrl as string) && (
                  <div className="relative inline-block">
                    <img src={form.thumbnailUrl as string} alt="Preview" className="h-24 w-40 object-cover rounded-lg border" />
                    <button
                      onClick={() => updateField('thumbnailUrl', '')}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Additional Images Upload */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Additional Images (up to 8)</Label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer">
                    <Button type="button" variant="outline" size="sm" disabled={uploadingImages || (form.imagesUrls as string[]).length >= 8} asChild>
                      <span>
                        {uploadingImages ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <ImageIcon className="h-4 w-4 mr-1" />
                        )}
                        Upload Images
                      </span>
                    </Button>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImagesUpload} />
                  </label>
                  <span className="text-xs text-muted-foreground">{(form.imagesUrls as string[]).length}/8 images</span>
                </div>
                {(form.imagesUrls as string[]).length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(form.imagesUrls as string[]).map((url, i) => (
                      <div key={i} className="relative group">
                        <img src={url} alt={`Image ${i + 1}`} className="h-20 w-full object-cover rounded-lg border" />
                        <button
                          onClick={() => removeImage(i)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Video URL */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Video URL (optional)</Label>
                <Input
                  value={form.videoUrl as string}
                  onChange={(e) => handleVideoUrlChange(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publish Settings */}
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-sm">Publish Settings</h3>

              {/* Category */}
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={form.categoryId as string} onValueChange={(v) => updateField('categoryId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* State */}
              <div className="space-y-2">
                <Label>State *</Label>
                <Select value={(form.stateId as string) || 'none'} onValueChange={(v) => {
                  const newStateId = v === 'none' ? '' : v
                  updateField('stateId', newStateId)
                  // Reset district when state changes
                  updateField('districtId', '')
                }}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select state</SelectItem>
                    {states.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* District */}
              <div className="space-y-2">
                <Label>District</Label>
                <Select value={(form.districtId as string) || 'none'} onValueChange={(v) => updateField('districtId', v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Statewide</SelectItem>
                    {(form.stateId
                      ? districts.filter(d => d.stateId === form.stateId)
                      : districts
                    ).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority as string} onValueChange={(v) => updateField('priority', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="breaking">Breaking</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status as string} onValueChange={(v) => updateField('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending_review">Submit for Review</SelectItem>
                    <SelectItem value="published">Publish</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Featured toggle */}
              <div className="flex items-center gap-3 pt-2">
                <Switch checked={form.isFeatured as boolean} onCheckedChange={(v) => updateField('isFeatured', v)} />
                <Label>Featured / Breaking</Label>
              </div>
            </CardContent>
          </Card>

          {/* Source & Reporter */}
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-sm">Source & Reporter</h3>

              <div className="space-y-2">
                <Label>Source Type</Label>
                <Select value={form.sourceType as string} onValueChange={(v) => updateField('sourceType', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">Original</SelectItem>
                    <SelectItem value="reporter">Reporter</SelectItem>
                    <SelectItem value="rss">RSS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Reporter</Label>
                <Select value={(form.reporterId as string) || 'none'} onValueChange={(v) => updateField('reporterId', v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Select reporter" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {reporters.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          {tags.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6 space-y-3">
                <h3 className="font-semibold text-sm">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => {
                    const selected = ((form.tagIds as string[]) || []).includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                          selected
                            ? 'bg-red-50 border-red-300 text-red-700'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {tag.name}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
            <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {editItemId ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

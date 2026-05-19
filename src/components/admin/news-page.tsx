'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { authFetch, authFetchJSON } from '@/lib/utils'
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
import { Plus, Pencil, Trash2, Search, CheckCircle, XCircle, Upload, X, ImageIcon } from 'lucide-react'

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
interface District { id: string; name: string }
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
  const { currentUser } = useAppStore()
  const [news, setNews] = useState<NewsItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [reporters, setReporters] = useState<Reporter[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItemId, setEditItemId] = useState<string | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectId, setRejectId] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [activeTab, setActiveTab] = useState('all')

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

      const res = await authFetch(`/api/admin/news?${params}`)
      const data = await res.json()
      setNews(data.news || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error('Fetch news error:', err)
    } finally {
      setLoading(false)
    }
  }, [page, search, filterStatus, filterCategory, filterPriority, activeTab])

  useEffect(() => {
    fetchCategories()
    fetchDistricts()
    fetchReporters()
    fetchTags()
  }, [])

  useEffect(() => {
    fetchNews()
  }, [fetchNews])

  const fetchCategories = async () => {
    const res = await authFetch('/api/admin/categories')
    setCategories(await res.json())
  }
  const fetchDistricts = async () => {
    const res = await authFetch('/api/admin/districts')
    setDistricts(await res.json())
  }
  const fetchReporters = async () => {
    const res = await authFetch('/api/admin/reporters')
    setReporters(await res.json())
  }
  const fetchTags = async () => {
    const res = await authFetch('/api/admin/tags')
    setTags(await res.json())
  }

  const handleSave = async (formData: Record<string, unknown>) => {
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
      setDialogOpen(false)
      setEditItemId(null)
      fetchNews()
    } catch {
      toast.error('Failed to save news')
    }
  }

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

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">News Management</h1>
          <p className="text-sm text-muted-foreground">{total} total articles</p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700" onClick={() => { setEditItemId(null); setDialogOpen(true) }}>
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
                              <span key={t.slug} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{t.tag.name}</span>
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
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditItemId(item.id); setDialogOpen(true) }}>
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

      {/* Create/Edit Dialog */}
      <NewsFormDialog
        key={editItemId || 'create'}
        editItemId={editItemId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        categories={categories}
        districts={districts}
        reporters={reporters}
        tags={tags}
        currentUser={currentUser}
      />

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

function NewsFormDialog({
  editItemId, open, onOpenChange, onSave, categories, districts, reporters, tags, currentUser,
}: {
  editItemId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: Record<string, unknown>) => void
  categories: Category[]
  districts: District[]
  reporters: Reporter[]
  tags: Tag[]
  currentUser: { id: string; name: string; role: string } | null
}) {
  const [form, setForm] = useState<Record<string, unknown>>({
    title: '', shortDesc: '', content: '', categoryId: '', districtId: '',
    thumbnailUrl: '', imagesUrls: [] as string[], videoUrl: '', sourceType: 'original', reporterId: '',
    priority: 'normal', status: 'draft', isFeatured: false, tagIds: [] as string[],
  })
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Load edit data when dialog opens
  useEffect(() => {
    if (open && editItemId && !loaded) {
      authFetch(`/api/admin/news/${editItemId}`)
        .then(r => r.json())
        .then(data => {
          setForm({
            title: data.title || '',
            shortDesc: data.shortDesc || '',
            content: data.content || '',
            categoryId: data.categoryId || '',
            districtId: data.districtId || '',
            thumbnailUrl: data.thumbnailUrl || '',
            imagesUrls: data.imagesUrls || [],
            videoUrl: data.videoUrl || '',
            sourceType: data.sourceType || 'original',
            reporterId: data.reporterId || '',
            priority: data.priority || 'normal',
            status: data.status || 'draft',
            isFeatured: data.isFeatured || false,
            tagIds: data.tags?.map((t: { tag: { id: string } }) => t.tag.id) || [],
          })
          setLoaded(true)
        })
        .catch(() => toast.error('Failed to load news'))
    } else if (open && !editItemId) {
      setForm({
        title: '', shortDesc: '', content: '', categoryId: '', districtId: '',
        thumbnailUrl: '', imagesUrls: [], videoUrl: '', sourceType: 'original', reporterId: '',
        priority: 'normal', status: 'draft', isFeatured: false, tagIds: [],
      })
      setLoaded(true)
    }
    if (!open) {
      setLoaded(false)
    }
  }, [open, editItemId])

  const updateField = (key: string, value: unknown) => setForm(prev => ({ ...prev, [key]: value }))

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

  if (!loaded && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Loading News</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-red-600 border-t-transparent rounded-full" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editItemId ? 'Edit News' : 'Create News'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={form.title as string} onChange={(e) => updateField('title', e.target.value)} placeholder="Enter news title" />
          </div>

          {/* Short Description */}
          <div className="space-y-2">
            <Label>Short Description</Label>
            <Textarea value={form.shortDesc as string} onChange={(e) => updateField('shortDesc', e.target.value)} rows={2} placeholder="Brief summary (max 500 chars)" maxLength={500} />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label>Full Content</Label>
            <Textarea value={form.content as string} onChange={(e) => updateField('content', e.target.value)} rows={5} placeholder="Detailed news content (optional)" />
          </div>

          {/* Category & District */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.categoryId as string} onValueChange={(v) => updateField('categoryId', v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>District</Label>
              <Select value={(form.districtId as string) || 'none'} onValueChange={(v) => updateField('districtId', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Statewide</SelectItem>
                  {districts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-2 gap-4">
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
          </div>

          {/* Thumbnail Upload */}
          <div className="space-y-2">
            <Label>Thumbnail Image</Label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Input value={form.thumbnailUrl as string} onChange={(e) => updateField('thumbnailUrl', e.target.value)} placeholder="Image URL or upload below" />
              </div>
              <label className="cursor-pointer">
                <Button type="button" variant="outline" size="sm" disabled={uploadingThumbnail} asChild>
                  <span>
                    {uploadingThumbnail ? (
                      <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                    ) : (
                      <Upload className="h-4 w-4 mr-1" />
                    )}
                    Upload
                  </span>
                </Button>
                <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} />
              </label>
            </div>
            {form.thumbnailUrl && (
              <div className="relative inline-block mt-2">
                <img src={form.thumbnailUrl as string} alt="Preview" className="h-20 w-32 object-cover rounded-lg border" />
                <button onClick={() => updateField('thumbnailUrl', '')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* Additional Images Upload */}
          <div className="space-y-2">
            <Label>Additional Images (up to 8)</Label>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <Button type="button" variant="outline" size="sm" disabled={uploadingImages || (form.imagesUrls as string[]).length >= 8} asChild>
                  <span>
                    {uploadingImages ? (
                      <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
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
              <div className="flex flex-wrap gap-2 mt-2">
                {(form.imagesUrls as string[]).map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt={`Image ${i + 1}`} className="h-16 w-24 object-cover rounded-lg border" />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Video URL */}
          <div className="space-y-2">
            <Label>Video URL (optional)</Label>
            <Input value={form.videoUrl as string} onChange={(e) => updateField('videoUrl', e.target.value)} placeholder="https://..." />
          </div>

          {/* Source & Reporter */}
          <div className="grid grid-cols-2 gap-4">
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
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => {
                  const selected = ((form.tagIds as string[]) || []).includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
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
            </div>
          )}

          {/* Featured toggle */}
          <div className="flex items-center gap-3">
            <Switch checked={form.isFeatured as boolean} onCheckedChange={(v) => updateField('isFeatured', v)} />
            <Label>Featured / Breaking</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={() => onSave(form)}>
            {editItemId ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
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
import { Plus, Pencil, Trash2, Search, CheckCircle, XCircle, Upload, X } from 'lucide-react'

interface NewsItem {
  id: string
  title: string
  status: string
  priority: string
  createdAt: string
  publishedAt: string | null
  viewsCount: number
  thumbnailUrl: string
  category: { name: string; color: string }
  district: { name: string } | null
  reporter: { name: string } | null
}

interface Category { id: string; name: string }
interface District { id: string; name: string }
interface Reporter { id: string; name: string }

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
      if (filterStatus) params.set('status', filterStatus)
      if (filterCategory) params.set('categoryId', filterCategory)
      if (filterPriority) params.set('priority', filterPriority)
      if (activeTab === 'pending') params.set('status', 'pending_review')

      const res = await fetch(`/api/admin/news?${params}`)
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
  }, [])

  useEffect(() => {
    fetchNews()
  }, [fetchNews])

  const fetchCategories = async () => {
    const res = await fetch('/api/admin/categories')
    setCategories(await res.json())
  }
  const fetchDistricts = async () => {
    const res = await fetch('/api/admin/districts')
    setDistricts(await res.json())
  }
  const fetchReporters = async () => {
    const res = await fetch('/api/admin/reporters')
    setReporters(await res.json())
  }

  const handleSave = async (formData: Record<string, unknown>) => {
    try {
      if (editItemId) {
        const res = await fetch(`/api/admin/news/${editItemId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, updatedBy: currentUser?.id }),
        })
        if (!res.ok) throw new Error()
        toast.success('News updated successfully')
      } else {
        const res = await fetch('/api/admin/news', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch(`/api/admin/news/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
      await fetch(`/api/admin/news/${id}`, { method: 'DELETE' })
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
                      <TableCell className="font-medium max-w-[300px] truncate">{item.title}</TableCell>
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
  editItemId, open, onOpenChange, onSave, categories, districts, reporters, currentUser,
}: {
  editItemId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: Record<string, unknown>) => void
  categories: Category[]
  districts: District[]
  reporters: Reporter[]
  currentUser: { id: string; name: string; role: string } | null
}) {
  const [form, setForm] = useState<Record<string, unknown>>({
    title: '', shortDesc: '', content: '', categoryId: '', districtId: '',
    thumbnailUrl: '', videoUrl: '', sourceType: 'original', reporterId: '',
    priority: 'normal', status: 'draft', isFeatured: false,
  })
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Load edit data when dialog opens
  useEffect(() => {
    if (open && editItemId && !loaded) {
      fetch(`/api/admin/news/${editItemId}`)
        .then(r => r.json())
        .then(data => {
          setForm({
            title: data.title || data.titleEn || '',
            shortDesc: data.shortDesc || data.shortDescEn || '',
            content: data.content || data.contentEn || '',
            categoryId: data.categoryId || '',
            districtId: data.districtId || '',
            thumbnailUrl: data.thumbnailUrl || '',
            videoUrl: data.videoUrl || '',
            sourceType: data.sourceType || 'original',
            reporterId: data.reporterId || '',
            priority: data.priority || 'normal',
            status: data.status || 'draft',
            isFeatured: data.isFeatured || false,
          })
          setLoaded(true)
        })
        .catch(() => toast.error('Failed to load news'))
    } else if (open && !editItemId) {
      setForm({
        title: '', shortDesc: '', content: '', categoryId: '', districtId: '',
        thumbnailUrl: '', videoUrl: '', sourceType: 'original', reporterId: '',
        priority: 'normal', status: 'draft', isFeatured: false,
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
      const res = await fetch('/api/admin/media/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) {
        updateField('thumbnailUrl', data.url)
        toast.success('Image uploaded')
      }
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploadingThumbnail(false)
    }
  }

  if (!loaded && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

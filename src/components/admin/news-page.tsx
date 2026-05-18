'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Plus, Pencil, Trash2, Search, Eye, CheckCircle, XCircle, Filter } from 'lucide-react'

interface NewsItem {
  id: string
  titleEn: string
  titleTe: string
  status: string
  priority: string
  createdAt: string
  publishedAt: string | null
  viewsCount: number
  category: { nameEn: string; nameTe: string; color: string }
  district: { name: string } | null
  reporter: { name: string } | null
}

interface Category { id: string; nameEn: string; nameTe: string }
interface District { id: string; name: string }
interface Reporter { id: string; name: string }
interface Tag { id: string; name: string; slug: string }

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
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null)
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
    fetchTags()
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
  const fetchTags = async () => {
    const res = await fetch('/api/admin/categories')
    // Tags will be fetched inline - using categories for now
  }

  const handleSave = async (formData: Record<string, unknown>) => {
    try {
      if (editItem) {
        const res = await fetch(`/api/admin/news/${editItem.id}`, {
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
      setEditItem(null)
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

  const openEdit = async (item: NewsItem) => {
    try {
      const res = await fetch(`/api/admin/news/${item.id}`)
      const data = await res.json()
      setEditItem(data)
      setDialogOpen(true)
    } catch {
      toast.error('Failed to load news')
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
        <Button className="bg-red-600 hover:bg-red-700" onClick={() => { setEditItem(null); setDialogOpen(true) }}>
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
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.nameEn}</SelectItem>)}
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
                      <TableCell className="font-medium max-w-[300px] truncate">{item.titleEn}</TableCell>
                      <TableCell>
                        <Badge variant="outline" style={{ borderColor: item.category?.color, color: item.category?.color }}>
                          {item.category?.nameEn}
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
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(item)}>
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
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No news found</TableCell></TableRow>
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
        key={editItem?.id || 'create'}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editItem={editItem}
        onSave={handleSave}
        categories={categories}
        districts={districts}
        reporters={reporters}
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
  open, onOpenChange, editItem, onSave, categories, districts, reporters,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editItem: Record<string, unknown> | null
  onSave: (data: Record<string, unknown>) => void
  categories: Category[]
  districts: District[]
  reporters: Reporter[]
}) {
  const getFormFromItem = (item: Record<string, unknown> | null): Record<string, unknown> => {
    if (item) {
      return {
        titleEn: item.titleEn || '',
        titleTe: item.titleTe || '',
        shortDescEn: item.shortDescEn || '',
        shortDescTe: item.shortDescTe || '',
        contentEn: item.contentEn || '',
        contentTe: item.contentTe || '',
        categoryId: item.categoryId || '',
        stateId: item.stateId || '',
        districtId: item.districtId || '',
        thumbnailUrl: item.thumbnailUrl || '',
        videoUrl: item.videoUrl || '',
        sourceType: item.sourceType || 'original',
        reporterId: item.reporterId || '',
        priority: item.priority || 'normal',
        status: item.status || 'draft',
        isFeatured: item.isFeatured || false,
        imagesUrls: typeof item.imagesUrls === 'string' ? JSON.parse(item.imagesUrls as string || '[]') : item.imagesUrls || [],
      }
    }
    return {
      titleEn: '', titleTe: '', shortDescEn: '', shortDescTe: '',
      contentEn: '', contentTe: '', categoryId: '', stateId: '', districtId: '',
      thumbnailUrl: '', videoUrl: '', sourceType: 'original', reporterId: '',
      priority: 'normal', status: 'draft', isFeatured: false, imagesUrls: [],
    }
  }

  const [form, setForm] = useState<Record<string, unknown>>(() => getFormFromItem(editItem))

  const updateField = (key: string, value: unknown) => setForm(prev => ({ ...prev, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editItem ? 'Edit News' : 'Create News'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title (English)</Label>
              <Input value={form.titleEn as string} onChange={(e) => updateField('titleEn', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Title (Telugu)</Label>
              <Input value={form.titleTe as string} onChange={(e) => updateField('titleTe', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Short Desc (English)</Label>
              <Textarea value={form.shortDescEn as string} onChange={(e) => updateField('shortDescEn', e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Short Desc (Telugu)</Label>
              <Textarea value={form.shortDescTe as string} onChange={(e) => updateField('shortDescTe', e.target.value)} rows={2} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Content (English)</Label>
              <Textarea value={form.contentEn as string} onChange={(e) => updateField('contentEn', e.target.value)} rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Content (Telugu)</Label>
              <Textarea value={form.contentTe as string} onChange={(e) => updateField('contentTe', e.target.value)} rows={4} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.categoryId as string} onValueChange={(v) => updateField('categoryId', v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.nameEn}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>District</Label>
              <Select value={(form.districtId as string) || 'none'} onValueChange={(v) => updateField('districtId', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {districts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
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
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Thumbnail URL</Label>
            <Input value={form.thumbnailUrl as string} onChange={(e) => updateField('thumbnailUrl', e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label>Video URL</Label>
            <Input value={form.videoUrl as string} onChange={(e) => updateField('videoUrl', e.target.value)} placeholder="https://..." />
          </div>
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
          <div className="flex items-center gap-3">
            <Switch checked={form.isFeatured as boolean} onCheckedChange={(v) => updateField('isFeatured', v)} />
            <Label>Featured / Breaking</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={() => onSave(form)}>
            {editItem ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

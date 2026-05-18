'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Upload,
  Play,
  Eye,
  Loader2,
  Video,
  RefreshCw,
  Film,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

interface VideoItem {
  id: string
  title: string
  description: string | null
  videoUrl: string
  thumbnailUrl: string | null
  duration: number
  categoryId: string | null
  status: string
  viewsCount: number
  createdAt: string
  category: { name: string; color: string } | null
}

interface Category {
  id: string
  name: string
  color: string
}

interface VideoFormData {
  title: string
  description: string
  videoUrl: string
  thumbnailUrl: string
  duration: number
  categoryId: string
  status: string
}

const initialFormData: VideoFormData = {
  title: '',
  description: '',
  videoUrl: '',
  thumbnailUrl: '',
  duration: 0,
  categoryId: '',
  status: 'draft',
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function parseDuration(formatted: string): number {
  const parts = formatted.split(':')
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10) || 0
    const secs = parseInt(parts[1], 10) || 0
    return mins * 60 + secs
  }
  if (parts.length === 3) {
    const hrs = parseInt(parts[0], 10) || 0
    const mins = parseInt(parts[1], 10) || 0
    const secs = parseInt(parts[2], 10) || 0
    return hrs * 3600 + mins * 60 + secs
  }
  const val = parseInt(formatted, 10)
  return isNaN(val) ? 0 : val
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'published':
      return 'bg-green-100 text-green-700 border-green-200'
    case 'draft':
      return 'bg-gray-100 text-gray-700 border-gray-200'
    case 'archived':
      return 'bg-purple-100 text-purple-700 border-purple-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null)
  const [formData, setFormData] = useState<VideoFormData>(initialFormData)
  const [saving, setSaving] = useState(false)
  const [durationInput, setDurationInput] = useState('00:00')

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<VideoItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Upload state
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchVideos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/videos')
      if (!res.ok) throw new Error('Failed to fetch videos')
      const data = await res.json()
      setVideos(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load videos')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/categories')
      if (!res.ok) throw new Error('Failed to fetch categories')
      const data = await res.json()
      setCategories(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load categories')
    }
  }, [])

  useEffect(() => {
    fetchVideos()
    fetchCategories()
  }, [fetchVideos, fetchCategories])

  const filteredVideos = videos.filter((video) => {
    const matchesSearch =
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (video.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (video.category?.name.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    const matchesStatus = statusFilter === 'all' || video.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const openCreateDialog = () => {
    setEditingVideo(null)
    setFormData(initialFormData)
    setDurationInput('00:00')
    setDialogOpen(true)
  }

  const openEditDialog = (video: VideoItem) => {
    setEditingVideo(video)
    setFormData({
      title: video.title,
      description: video.description || '',
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl || '',
      duration: video.duration,
      categoryId: video.categoryId || '',
      status: video.status === 'archived' ? 'draft' : video.status,
    })
    setDurationInput(formatDuration(video.duration))
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!formData.videoUrl.trim()) {
      toast.error('Video URL is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        videoUrl: formData.videoUrl.trim(),
        thumbnailUrl: formData.thumbnailUrl.trim() || null,
        duration: formData.duration,
        categoryId: formData.categoryId || null,
        status: formData.status,
      }

      let res: Response
      if (editingVideo) {
        res = await fetch(`/api/admin/videos/${editingVideo.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/admin/videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) throw new Error('Failed to save video')

      toast.success(editingVideo ? 'Video updated successfully' : 'Video created successfully')
      setDialogOpen(false)
      fetchVideos()
    } catch {
      toast.error('Failed to save video')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/videos/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete video')
      toast.success('Video deleted successfully')
      setDeleteTarget(null)
      fetchVideos()
    } catch {
      toast.error('Failed to delete video')
    } finally {
      setDeleting(false)
    }
  }

  const handleThumbnailUpload = async (file: File) => {
    setUploading(true)
    try {
      const uploadForm = new FormData()
      uploadForm.append('file', file)
      const res = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: uploadForm,
      })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      setFormData((prev) => ({ ...prev, thumbnailUrl: data.url || data.filePath || '' }))
      toast.success('Thumbnail uploaded')
    } catch {
      toast.error('Failed to upload thumbnail')
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleThumbnailUpload(file)
  }

  const handleDurationChange = (value: string) => {
    setDurationInput(value)
    const seconds = parseDuration(value)
    setFormData((prev) => ({ ...prev, duration: seconds }))
  }

  const totalViews = videos.reduce((sum, v) => sum + v.viewsCount, 0)
  const publishedCount = videos.filter((v) => v.status === 'published').length
  const draftCount = videos.filter((v) => v.status === 'draft').length

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50">
                <Film className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Videos</p>
                <p className="text-2xl font-bold">{videos.length}</p>
              </div>
            </div>
          </Card>
          <Card className="border-0 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50">
                <Play className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="text-2xl font-bold">{publishedCount}</p>
              </div>
            </div>
          </Card>
          <Card className="border-0 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-50">
                <Video className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Drafts</p>
                <p className="text-2xl font-bold">{draftCount}</p>
              </div>
            </div>
          </Card>
          <Card className="border-0 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Views</p>
                <p className="text-2xl font-bold">{totalViews.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Toolbar */}
        <Card className="border-0 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search videos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="icon"
                onClick={fetchVideos}
                className="shrink-0"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                onClick={openCreateDialog}
                className="bg-red-600 hover:bg-red-700 text-white flex-1 sm:flex-none"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Video
              </Button>
            </div>
          </div>
        </Card>

        {/* Videos Table */}
        <Card className="border-0 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-red-600" />
              <span className="ml-3 text-muted-foreground">Loading videos...</span>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Film className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-lg font-medium">No videos found</p>
              <p className="text-sm mt-1">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter'
                  : 'Click "Add Video" to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="w-[80px]">Thumbnail</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-[130px]">Category</TableHead>
                    <TableHead className="w-[90px]">Duration</TableHead>
                    <TableHead className="w-[90px] text-right">Views</TableHead>
                    <TableHead className="w-[110px]">Status</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVideos.map((video) => (
                    <TableRow key={video.id} className="group hover:bg-gray-50/50">
                      <TableCell>
                        <div className="relative w-16 h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                          {video.thumbnailUrl ? (
                            <img
                              src={video.thumbnailUrl}
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Film className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="h-3 w-3 text-white fill-white" />
                          </div>
                          <div className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[9px] px-1 rounded font-mono">
                            {formatDuration(video.duration)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[280px]">
                          <p className="font-medium text-sm truncate">{video.title}</p>
                          {video.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {video.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(video.createdAt)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {video.category ? (
                          <Badge
                            variant="outline"
                            className="text-xs font-medium"
                            style={{
                              borderColor: video.category.color,
                              color: video.category.color,
                              backgroundColor: `${video.category.color}10`,
                            }}
                          >
                            {video.category.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Uncategorized</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono tabular-nums">
                          {formatDuration(video.duration)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm tabular-nums">
                          {video.viewsCount.toLocaleString('en-IN')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs font-medium capitalize ${getStatusColor(video.status)}`}
                        >
                          {video.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditDialog(video)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit video</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setDeleteTarget(video)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete video</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {!loading && filteredVideos.length > 0 && (
            <div className="px-4 py-3 border-t bg-gray-50/30 text-sm text-muted-foreground">
              Showing {filteredVideos.length} of {videos.length} video{videos.length !== 1 ? 's' : ''}
            </div>
          )}
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingVideo ? 'Edit Video' : 'Add New Video'}</DialogTitle>
              <DialogDescription>
                {editingVideo
                  ? 'Update the video details below.'
                  : 'Fill in the details to add a new video.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 py-4">
              {/* Title */}
              <div className="grid gap-2">
                <Label htmlFor="video-title">
                  Title <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="video-title"
                  placeholder="Enter video title"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>

              {/* Description */}
              <div className="grid gap-2">
                <Label htmlFor="video-description">Description</Label>
                <Textarea
                  id="video-description"
                  placeholder="Enter video description (optional)"
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </div>

              {/* Video URL */}
              <div className="grid gap-2">
                <Label htmlFor="video-url">
                  Video URL <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="video-url"
                  placeholder="https://example.com/video.mp4"
                  value={formData.videoUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, videoUrl: e.target.value }))}
                />
              </div>

              {/* Thumbnail */}
              <div className="grid gap-2">
                <Label>Thumbnail</Label>
                <div className="flex items-start gap-3">
                  {formData.thumbnailUrl ? (
                    <div className="relative w-24 h-14 rounded overflow-hidden bg-gray-100 border shrink-0">
                      <img
                        src={formData.thumbnailUrl}
                        alt="Thumbnail preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, thumbnailUrl: '' }))
                        }
                        className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : null}
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="https://example.com/thumb.jpg or upload"
                      value={formData.thumbnailUrl}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, thumbnailUrl: e.target.value }))
                      }
                    />
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        {uploading ? 'Uploading...' : 'Upload Image'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Duration & Category Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="video-duration">Duration (mm:ss)</Label>
                  <Input
                    id="video-duration"
                    placeholder="00:00"
                    value={durationInput}
                    onChange={(e) => handleDurationChange(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.duration} second{formData.duration !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(val) =>
                      setFormData((prev) => ({ ...prev, categoryId: val === '__none__' ? '' : val }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Uncategorized</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Status */}
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, status: val }))}
                >
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                        Draft
                      </div>
                    </SelectItem>
                    <SelectItem value="published">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        Published
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingVideo ? 'Update Video' : 'Create Video'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Video</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &ldquo;{deleteTarget?.title}&rdquo;? This action
                cannot be undone. The video will be moved to archived status.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}

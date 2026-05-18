'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Trash2, ImageIcon, ExternalLink } from 'lucide-react'

interface MediaItem {
  id: string
  filename: string
  originalUrl: string
  thumbnailUrl: string | null
  mimeType: string | null
  size: number
  alt: string | null
  createdAt: string
}

export default function MediaPage() {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ filename: '', originalUrl: '', thumbnailUrl: '', mimeType: 'image/jpeg', size: 0, alt: '' })

  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/media')
      setMedia(await res.json())
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchMedia() }, [fetchMedia])

  const handleSave = async () => {
    try {
      const res = await fetch('/api/admin/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      toast.success('Media added')
      setDialogOpen(false)
      fetchMedia()
    } catch { toast.error('Failed to add media') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this media?')) return
    try {
      await fetch(`/api/admin/media/${id}`, { method: 'DELETE' })
      toast.success('Media deleted')
      fetchMedia()
    } catch { toast.error('Failed to delete') }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Media Library</h1>
          <p className="text-sm text-muted-foreground">{media.length} items</p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700" onClick={() => { setForm({ filename: '', originalUrl: '', thumbnailUrl: '', mimeType: 'image/jpeg', size: 0, alt: '' }); setDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" /> Add Media
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
        </div>
      ) : media.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No media items yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {media.map(item => (
            <Card key={item.id} className="group overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
              <div className="aspect-square bg-muted relative">
                {item.mimeType?.startsWith('image/') ? (
                  <img src={item.thumbnailUrl || item.originalUrl} alt={item.alt || item.filename} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => window.open(item.originalUrl, '_blank')}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-2">
                <p className="text-xs font-medium truncate">{item.filename}</p>
                <p className="text-[10px] text-muted-foreground">{formatSize(item.size)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Media</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Filename</Label><Input value={form.filename} onChange={e => setForm(p => ({ ...p, filename: e.target.value }))} placeholder="image.jpg" /></div>
            <div className="space-y-2"><Label>Image URL</Label><Input value={form.originalUrl} onChange={e => setForm(p => ({ ...p, originalUrl: e.target.value }))} placeholder="https://..." /></div>
            <div className="space-y-2"><Label>Thumbnail URL (optional)</Label><Input value={form.thumbnailUrl} onChange={e => setForm(p => ({ ...p, thumbnailUrl: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>MIME Type</Label><Input value={form.mimeType} onChange={e => setForm(p => ({ ...p, mimeType: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Size (bytes)</Label><Input type="number" value={form.size} onChange={e => setForm(p => ({ ...p, size: parseInt(e.target.value) || 0 }))} /></div>
            </div>
            <div className="space-y-2"><Label>Alt Text</Label><Input value={form.alt} onChange={e => setForm(p => ({ ...p, alt: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleSave}>Add Media</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, FolderOpen } from 'lucide-react'
import { authFetch, authFetchJSON, authFetchJson } from '@/lib/utils'

interface CategoryItem {
  id: string
  name: string
  slug: string
  iconUrl: string | null
  color: string | null
  sortOrder: number
  isActive: boolean
  _count?: { news: number }
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<CategoryItem | null>(null)
  const [form, setForm] = useState({
    name: '', slug: '', iconUrl: '', color: '#DC2626', sortOrder: 0, isActive: true,
  })

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true)
      const data = await authFetchJson<CategoryItem[]>('/api/admin/categories', undefined, true)
      setCategories(data)
    } catch (err) { console.error(err); toast.error('Failed to load categories') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const openCreate = () => {
    setEditItem(null)
    setForm({ name: '', slug: '', iconUrl: '', color: '#DC2626', sortOrder: categories.length, isActive: true })
    setDialogOpen(true)
  }

  const openEdit = (item: CategoryItem) => {
    setEditItem(item)
    setForm({
      name: item.name, slug: item.slug,
      iconUrl: item.iconUrl || '', color: item.color || '#DC2626',
      sortOrder: item.sortOrder, isActive: item.isActive,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      if (editItem) {
        const res = await authFetchJSON(`/api/admin/categories/${editItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error()
        toast.success('Category updated')
      } else {
        const res = await authFetchJSON('/api/admin/categories', {
          method: 'POST',
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error()
        toast.success('Category created')
      }
      setDialogOpen(false)
      fetchCategories()
    } catch { toast.error('Failed to save category') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return
    try {
      await authFetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
      toast.success('Category deleted')
      fetchCategories()
    } catch { toast.error('Failed to delete') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-sm text-muted-foreground">{categories.length} categories</p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Category
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>News</TableHead>
                    <TableHead>Sort</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat, i) => (
                    <TableRow key={cat.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4" style={{ color: cat.color || undefined }} />
                          {cat.name}
                        </div>
                      </TableCell>
                      <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{cat.slug}</code></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: cat.color || '#DC2626' }} />
                          <span className="text-xs">{cat.color}</span>
                        </div>
                      </TableCell>
                      <TableCell>{cat._count?.news || 0}</TableCell>
                      <TableCell>{cat.sortOrder}</TableCell>
                      <TableCell><Badge className={cat.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>{cat.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(cat)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="text-red-600" onClick={() => handleDelete(cat.id)}><Trash2 className="h-4 w-4" /></Button>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? 'Edit Category' : 'Add Category'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={e => { setForm(p => ({ ...p, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '') })); }} placeholder="Category name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Slug</Label><Input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} className="h-9 w-9 rounded cursor-pointer" />
                  <Input value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} className="flex-1" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Icon URL</Label><Input value={form.iconUrl} onChange={e => setForm(p => ({ ...p, iconUrl: e.target.value }))} placeholder="Optional" /></div>
              <div className="space-y-2"><Label>Sort Order</Label><Input type="number" value={form.sortOrder} onChange={e => setForm(p => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))} /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.isActive} onCheckedChange={v => setForm(p => ({ ...p, isActive: v }))} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleSave}>{editItem ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

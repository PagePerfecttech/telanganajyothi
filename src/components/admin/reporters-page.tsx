'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, UserCheck, UserX } from 'lucide-react'

interface ReporterItem {
  id: string
  name: string
  phone: string
  email: string | null
  avatar: string | null
  bio: string | null
  stateId: string
  districtId: string
  beat: string | null
  status: string
  canPublishDirectly: boolean
  state?: { name: string }
  district?: { name: string }
  _count?: { news: number }
}

interface District { id: string; name: string }

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
}

export default function ReportersPage() {
  const [reporters, setReporters] = useState<ReporterItem[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<ReporterItem | null>(null)
  const [form, setForm] = useState<Record<string, unknown>>({
    name: '', phone: '', email: '', avatar: '', bio: '',
    stateId: '', districtId: '', beat: '', status: 'pending', canPublishDirectly: false,
  })

  const fetchReporters = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/reporters')
      setReporters(await res.json())
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchReporters()
    fetch('/api/admin/districts').then(r => r.json()).then(setDistricts).catch(console.error)
  }, [fetchReporters])

  const handleSave = async () => {
    try {
      if (editItem) {
        await fetch(`/api/admin/reporters/${editItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        toast.success('Reporter updated')
      } else {
        await fetch('/api/admin/reporters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        toast.success('Reporter created')
      }
      setDialogOpen(false)
      setEditItem(null)
      fetchReporters()
    } catch { toast.error('Failed to save reporter') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this reporter?')) return
    try {
      await fetch(`/api/admin/reporters/${id}`, { method: 'DELETE' })
      toast.success('Reporter deleted')
      fetchReporters()
    } catch { toast.error('Failed to delete') }
  }

  const openEdit = (item: ReporterItem) => {
    setEditItem(item)
    setForm({
      name: item.name, phone: item.phone, email: item.email || '', avatar: item.avatar || '',
      bio: item.bio || '', stateId: item.stateId, districtId: item.districtId,
      beat: item.beat || '', status: item.status, canPublishDirectly: item.canPublishDirectly,
    })
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reporters</h1>
          <p className="text-sm text-muted-foreground">{reporters.length} reporters</p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700" onClick={() => {
          setEditItem(null)
          setForm({ name: '', phone: '', email: '', avatar: '', bio: '', stateId: '', districtId: '', beat: '', status: 'pending', canPublishDirectly: false })
          setDialogOpen(true)
        }}>
          <Plus className="h-4 w-4 mr-2" /> Add Reporter
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
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>District</TableHead>
                    <TableHead>Beat</TableHead>
                    <TableHead>Submissions</TableHead>
                    <TableHead>Can Publish</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reporters.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-sm">{r.phone}</TableCell>
                      <TableCell className="text-sm">{r.district?.name || '-'}</TableCell>
                      <TableCell><Badge variant="outline">{r.beat || 'General'}</Badge></TableCell>
                      <TableCell>{r._count?.news || 0}</TableCell>
                      <TableCell>{r.canPublishDirectly ? <UserCheck className="h-4 w-4 text-green-600" /> : <UserX className="h-4 w-4 text-gray-400" />}</TableCell>
                      <TableCell><Badge className={statusColors[r.status] || ''}>{r.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="text-red-600" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4" /></Button>
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
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editItem ? 'Edit Reporter' : 'Add Reporter'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Name</Label><Input value={form.name as string} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone as string} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email as string} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Avatar URL</Label><Input value={form.avatar as string} onChange={e => setForm(p => ({ ...p, avatar: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Bio</Label><Textarea value={form.bio as string} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>District</Label>
                <select className="w-full border rounded-md p-2 text-sm" value={form.districtId as string} onChange={e => setForm(p => ({ ...p, districtId: e.target.value }))}>
                  <option value="">Select district</option>
                  {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="space-y-2"><Label>Beat</Label><Input value={form.beat as string} onChange={e => setForm(p => ({ ...p, beat: e.target.value }))} placeholder="Politics, Crime..." /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <select className="w-full border rounded-md p-2 text-sm" value={form.status as string} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch checked={form.canPublishDirectly as boolean} onCheckedChange={v => setForm(p => ({ ...p, canPublishDirectly: v }))} />
                <Label>Can Publish Directly</Label>
              </div>
            </div>
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

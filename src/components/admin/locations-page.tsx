'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, MapPin } from 'lucide-react'
import { authFetch, authFetchJSON, authFetchJson } from '@/lib/utils'

interface StateItem { id: string; name: string; code: string; isActive: boolean; _count?: { districts: number; news: number } }
interface DistrictItem { id: string; name: string; stateId: string; isActive: boolean; state?: { name: string }; _count?: { news: number; mandals: number } }
interface MandalItem { id: string; name: string; districtId: string; isActive: boolean; district?: { name: string; state?: { name: string; code: string } }; _count?: { news: number } }

export default function LocationsPage() {
  const [states, setStates] = useState<StateItem[]>([])
  const [districts, setDistricts] = useState<DistrictItem[]>([])
  const [mandals, setMandals] = useState<MandalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('districts')
  const [stateDialogOpen, setStateDialogOpen] = useState(false)
  const [districtDialogOpen, setDistrictDialogOpen] = useState(false)
  const [mandalDialogOpen, setMandalDialogOpen] = useState(false)
  const [editState, setEditState] = useState<StateItem | null>(null)
  const [editDistrict, setEditDistrict] = useState<DistrictItem | null>(null)
  const [editMandal, setEditMandal] = useState<MandalItem | null>(null)
  const [stateForm, setStateForm] = useState({ name: '', code: '', isActive: true })
  const [districtForm, setDistrictForm] = useState({ name: '', stateId: '', isActive: true })
  const [mandalForm, setMandalForm] = useState({ name: '', districtId: '', isActive: true })

  const fetchStates = useCallback(async () => {
    try {
      const data = await authFetchJson<StateItem[]>('/api/admin/states', undefined, true)
      setStates(data)
    } catch { toast.error('Failed to load states') }
  }, [])

  const fetchDistricts = useCallback(async () => {
    try {
      setLoading(true)
      const data = await authFetchJson<DistrictItem[]>('/api/admin/districts', undefined, true)
      setDistricts(data)
    } catch { toast.error('Failed to load districts') }
    finally { setLoading(false) }
  }, [])

  const fetchMandals = useCallback(async () => {
    try {
      const data = await authFetchJson<MandalItem[]>('/api/admin/mandals', undefined, true)
      setMandals(data)
    } catch { toast.error('Failed to load mandals') }
  }, [])

  useEffect(() => { fetchStates(); fetchDistricts(); fetchMandals() }, [fetchStates, fetchDistricts, fetchMandals])

  const handleSaveState = async () => {
    try {
      if (editState) {
        await authFetchJSON(`/api/admin/states`, { method: 'PUT', body: JSON.stringify({ id: editState.id, ...stateForm }) })
        toast.success('State updated')
      } else {
        await authFetchJSON('/api/admin/states', { method: 'POST', body: JSON.stringify(stateForm) })
        toast.success('State created')
      }
      setStateDialogOpen(false)
      setEditState(null)
      fetchStates()
    } catch { toast.error('Failed to save state') }
  }

  const handleSaveDistrict = async () => {
    try {
      if (editDistrict) {
        await authFetchJSON(`/api/admin/districts`, { method: 'PUT', body: JSON.stringify({ id: editDistrict.id, ...districtForm }) })
        toast.success('District updated')
      } else {
        await authFetchJSON('/api/admin/districts', { method: 'POST', body: JSON.stringify(districtForm) })
        toast.success('District created')
      }
      setDistrictDialogOpen(false)
      setEditDistrict(null)
      fetchDistricts()
    } catch { toast.error('Failed to save district') }
  }

  const handleDeleteDistrict = async (id: string) => {
    if (!confirm('Delete this district?')) return
    try {
      await authFetchJSON(`/api/admin/districts`, { method: 'DELETE', body: JSON.stringify({ id }) })
      toast.success('District deleted')
      fetchDistricts()
    } catch { toast.error('Failed to delete') }
  }

  const handleSaveMandal = async () => {
    try {
      if (editMandal) {
        await authFetchJSON(`/api/admin/mandals`, { method: 'PUT', body: JSON.stringify({ id: editMandal.id, ...mandalForm }) })
        toast.success('Mandal updated')
      } else {
        await authFetchJSON('/api/admin/mandals', { method: 'POST', body: JSON.stringify(mandalForm) })
        toast.success('Mandal created')
      }
      setMandalDialogOpen(false)
      setEditMandal(null)
      fetchMandals()
    } catch { toast.error('Failed to save mandal') }
  }

  const handleDeleteMandal = async (id: string) => {
    if (!confirm('Delete this mandal?')) return
    try {
      await authFetchJSON(`/api/admin/mandals`, { method: 'DELETE', body: JSON.stringify({ id }) })
      toast.success('Mandal deleted')
      fetchMandals()
    } catch { toast.error('Failed to delete') }
  }

  const telanganaState = states.find(s => s.code === 'TG')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Location Management</h1>
          <p className="text-sm text-muted-foreground">Manage states and districts</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="districts"><MapPin className="h-4 w-4 mr-2" />Districts ({districts.length})</TabsTrigger>
          <TabsTrigger value="mandals">Mandals ({mandals.length})</TabsTrigger>
          <TabsTrigger value="states">States ({states.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="states" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => { setEditState(null); setStateForm({ name: '', code: '', isActive: true }); setStateDialogOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" /> Add State
            </Button>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Districts</TableHead>
                    <TableHead>News</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {states.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell><Badge variant="outline">{s.code}</Badge></TableCell>
                      <TableCell>{s._count?.districts || 0}</TableCell>
                      <TableCell>{s._count?.news || 0}</TableCell>
                      <TableCell><Badge className={s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>{s.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => { setEditState(s); setStateForm({ name: s.name, code: s.code, isActive: s.isActive }); setStateDialogOpen(true) }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="districts" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => { setEditDistrict(null); setDistrictForm({ name: '', stateId: telanganaState?.id || '', isActive: true }); setDistrictDialogOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" /> Add District
            </Button>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : (
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>News</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {districts.map(d => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.name}</TableCell>
                          <TableCell>{d.state?.name || '-'}</TableCell>
                          <TableCell>{d._count?.news || 0}</TableCell>
                          <TableCell><Badge className={d.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>{d.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <Button size="icon" variant="ghost" onClick={() => { setEditDistrict(d); setDistrictForm({ name: d.name, stateId: d.stateId, isActive: d.isActive }); setDistrictDialogOpen(true) }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="text-red-600" onClick={() => handleDeleteDistrict(d.id)}>
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
        </TabsContent>

        <TabsContent value="mandals" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => { setEditMandal(null); setMandalForm({ name: '', districtId: '', isActive: true }); setMandalDialogOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" /> Add Mandal
            </Button>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : (
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>District</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>News</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mandals.map(m => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.name}</TableCell>
                          <TableCell>{m.district?.name || '-'}</TableCell>
                          <TableCell>{m.district?.state?.name || '-'}</TableCell>
                          <TableCell>{m._count?.news || 0}</TableCell>
                          <TableCell><Badge className={m.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>{m.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <Button size="icon" variant="ghost" onClick={() => { setEditMandal(m); setMandalForm({ name: m.name, districtId: m.districtId, isActive: m.isActive }); setMandalDialogOpen(true) }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="text-red-600" onClick={() => handleDeleteMandal(m.id)}>
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
        </TabsContent>
      </Tabs>

      {/* State Dialog */}
      <Dialog open={stateDialogOpen} onOpenChange={setStateDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editState ? 'Edit State' : 'Add State'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={stateForm.name} onChange={e => setStateForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Code</Label><Input value={stateForm.code} onChange={e => setStateForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} maxLength={3} /></div>
            <div className="flex items-center gap-2"><Switch checked={stateForm.isActive} onCheckedChange={v => setStateForm(p => ({ ...p, isActive: v }))} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStateDialogOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleSaveState}>{editState ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* District Dialog */}
      <Dialog open={districtDialogOpen} onOpenChange={setDistrictDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editDistrict ? 'Edit District' : 'Add District'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={districtForm.name} onChange={e => setDistrictForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>State</Label>
              <select className="w-full border rounded-md p-2 text-sm" value={districtForm.stateId} onChange={e => setDistrictForm(p => ({ ...p, stateId: e.target.value }))}>
                <option value="">Select state</option>
                {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2"><Switch checked={districtForm.isActive} onCheckedChange={v => setDistrictForm(p => ({ ...p, isActive: v }))} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDistrictDialogOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleSaveDistrict}>{editDistrict ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mandal Dialog */}
      <Dialog open={mandalDialogOpen} onOpenChange={setMandalDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editMandal ? 'Edit Mandal' : 'Add Mandal'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={mandalForm.name} onChange={e => setMandalForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>District</Label>
              <select className="w-full border rounded-md p-2 text-sm" value={mandalForm.districtId} onChange={e => setMandalForm(p => ({ ...p, districtId: e.target.value }))}>
                <option value="">Select district</option>
                {districts.map(d => <option key={d.id} value={d.id}>{d.name} ({d.state?.code})</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2"><Switch checked={mandalForm.isActive} onCheckedChange={v => setMandalForm(p => ({ ...p, isActive: v }))} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMandalDialogOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleSaveMandal}>{editMandal ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

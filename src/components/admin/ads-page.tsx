'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Plus, Pencil, Trash2, Megaphone, ImageIcon, Video } from 'lucide-react'

interface AdItem {
  id: string
  title: string
  advertiser: string
  type: string
  placement: string
  layout: string
  imagesUrls: string[]
  videoUrl: string | null
  clickUrl: string | null
  impressionsLimit: number
  impressionsServed: number
  clicksServed: number
  startDate: string | null
  endDate: string | null
  isActive: boolean
  targetStateIds: string[]
  targetCategoryIds: string[]
}

export default function AdsPage() {
  const [ads, setAds] = useState<AdItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<AdItem | null>(null)
  const [activeTab, setActiveTab] = useState('ads')
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [form, setForm] = useState<Record<string, unknown>>({
    title: '', advertiser: '', type: 'image', placement: 'feed_inline',
    layout: 'grid', imagesUrls: [], videoUrl: '', clickUrl: '',
    impressionsLimit: 0, startDate: '', endDate: '', isActive: true,
    targetStateIds: [], targetCategoryIds: [],
  })

  const fetchAds = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/ads')
      setAds(await res.json())
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings')
      setSettings(await res.json())
    } catch (err) { console.error(err) }
  }, [])

  useEffect(() => { fetchAds(); fetchSettings() }, [fetchAds, fetchSettings])

  const handleSave = async () => {
    try {
      if (editItem) {
        await fetch(`/api/admin/ads/${editItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        toast.success('Ad updated')
      } else {
        await fetch('/api/admin/ads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        toast.success('Ad created')
      }
      setDialogOpen(false)
      setEditItem(null)
      fetchAds()
    } catch { toast.error('Failed to save ad') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this ad?')) return
    try {
      await fetch(`/api/admin/ads/${id}`, { method: 'DELETE' })
      toast.success('Ad deleted')
      fetchAds()
    } catch { toast.error('Failed to delete') }
  }

  const handleSaveSettings = async () => {
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      toast.success('AdMob settings saved')
    } catch { toast.error('Failed to save settings') }
  }

  const placementLabels: Record<string, string> = {
    home_banner: 'Home Banner',
    feed_inline: 'Feed Inline',
    article_banner: 'Article Banner',
    interstitial: 'Interstitial',
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Ads & AdMob</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ads"><Megaphone className="h-4 w-4 mr-2" />Custom Ads</TabsTrigger>
          <TabsTrigger value="admob">AdMob Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="ads" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => { setEditItem(null); setForm({ title: '', advertiser: '', type: 'image', placement: 'feed_inline', layout: 'grid', imagesUrls: [], videoUrl: '', clickUrl: '', impressionsLimit: 0, startDate: '', endDate: '', isActive: true, targetStateIds: [], targetCategoryIds: [] }); setDialogOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" /> Create Ad
            </Button>
          </div>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Advertiser</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Placement</TableHead>
                        <TableHead>Impressions</TableHead>
                        <TableHead>Clicks</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ads.map(ad => (
                        <TableRow key={ad.id}>
                          <TableCell className="font-medium">{ad.title}</TableCell>
                          <TableCell>{ad.advertiser}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {ad.type === 'image' ? <ImageIcon className="h-3 w-3" /> : <Video className="h-3 w-3" />}
                              {ad.type}
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline">{placementLabels[ad.placement] || ad.placement}</Badge></TableCell>
                          <TableCell>{ad.impressionsServed?.toLocaleString()} / {ad.impressionsLimit?.toLocaleString() || '∞'}</TableCell>
                          <TableCell>{ad.clicksServed?.toLocaleString()}</TableCell>
                          <TableCell><Badge className={ad.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>{ad.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <Button size="icon" variant="ghost" onClick={() => { setEditItem(ad); setForm({ ...ad, startDate: ad.startDate?.split('T')[0] || '', endDate: ad.endDate?.split('T')[0] || '' }); setDialogOpen(true) }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="text-red-600" onClick={() => handleDelete(ad.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {ads.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No ads yet</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admob" className="space-y-4 mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">AdMob Configuration</CardTitle>
              <CardDescription>Configure Google AdMob integration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div><Label className="font-medium">Enable AdMob</Label><p className="text-xs text-muted-foreground">Toggle AdMob ads on/off</p></div>
                <Switch checked={settings.admob_enabled === 'true'} onCheckedChange={v => setSettings(p => ({ ...p, admob_enabled: String(v) }))} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Banner Ad Unit ID</Label><Input value={settings.admob_banner_id || ''} onChange={e => setSettings(p => ({ ...p, admob_banner_id: e.target.value }))} placeholder="ca-app-pub-xxx/yyy" /></div>
                <div className="space-y-2"><Label>Interstitial Ad Unit ID</Label><Input value={settings.admob_interstitial_id || ''} onChange={e => setSettings(p => ({ ...p, admob_interstitial_id: e.target.value }))} placeholder="ca-app-pub-xxx/yyy" /></div>
                <div className="space-y-2"><Label>Native Ad Unit ID</Label><Input value={settings.admob_native_id || ''} onChange={e => setSettings(p => ({ ...p, admob_native_id: e.target.value }))} placeholder="ca-app-pub-xxx/yyy" /></div>
                <div className="space-y-2"><Label>Rewarded Ad Unit ID</Label><Input value={settings.admob_rewarded_id || ''} onChange={e => setSettings(p => ({ ...p, admob_rewarded_id: e.target.value }))} placeholder="ca-app-pub-xxx/yyy" /></div>
                <div className="space-y-2"><Label>Frequency Cap (per session)</Label><Input type="number" value={settings.admob_frequency_cap || '5'} onChange={e => setSettings(p => ({ ...p, admob_frequency_cap: e.target.value }))} /></div>
              </div>
              <Button className="bg-red-600 hover:bg-red-700" onClick={handleSaveSettings}>Save AdMob Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Ad Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? 'Edit Ad' : 'Create Ad'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Title</Label><Input value={form.title as string} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Advertiser</Label><Input value={form.advertiser as string} onChange={e => setForm(p => ({ ...p, advertiser: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <select className="w-full border rounded-md p-2 text-sm" value={form.type as string} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Placement</Label>
                <select className="w-full border rounded-md p-2 text-sm" value={form.placement as string} onChange={e => setForm(p => ({ ...p, placement: e.target.value }))}>
                  <option value="home_banner">Home Banner</option>
                  <option value="feed_inline">Feed Inline</option>
                  <option value="article_banner">Article Banner</option>
                  <option value="interstitial">Interstitial</option>
                </select>
              </div>
            </div>
            {form.type === 'image' && (
              <div className="space-y-2">
                <Label>Image URLs (one per line)</Label>
                <textarea className="w-full border rounded-md p-2 text-sm min-h-[80px]" value={(form.imagesUrls as string[])?.join('\n') || ''} onChange={e => setForm(p => ({ ...p, imagesUrls: e.target.value.split('\n').filter(Boolean) }))} placeholder="https://example.com/ad1.jpg&#10;https://example.com/ad2.jpg" />
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Layout:</Label>
                  <select className="border rounded p-1 text-xs" value={form.layout as string} onChange={e => setForm(p => ({ ...p, layout: e.target.value }))}>
                    <option value="grid">Grid</option>
                    <option value="carousel">Carousel</option>
                  </select>
                </div>
              </div>
            )}
            {form.type === 'video' && (
              <div className="space-y-2"><Label>Video URL</Label><Input value={form.videoUrl as string} onChange={e => setForm(p => ({ ...p, videoUrl: e.target.value }))} placeholder="https://..." /></div>
            )}
            <div className="space-y-2"><Label>Click URL</Label><Input value={form.clickUrl as string} onChange={e => setForm(p => ({ ...p, clickUrl: e.target.value }))} placeholder="https://..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={form.startDate as string} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} /></div>
              <div className="space-y-2"><Label>End Date</Label><Input type="date" value={form.endDate as string} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Impressions Limit</Label><Input type="number" value={form.impressionsLimit as number} onChange={e => setForm(p => ({ ...p, impressionsLimit: parseInt(e.target.value) || 0 }))} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.isActive as boolean} onCheckedChange={v => setForm(p => ({ ...p, isActive: v }))} /><Label>Active</Label></div>
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

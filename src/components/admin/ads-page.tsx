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
import { Plus, Pencil, Trash2, ImageIcon, Film, Upload, X, Megaphone, Settings, Play, LayoutGrid, ArrowLeft, Save, Loader2 } from 'lucide-react'
import { authFetch, authFetchJSON, authFetchJson } from '@/lib/utils'

interface AdItem {
  id: string
  title: string
  advertiser: string
  type: string // poster or video
  imagesUrls: string[]
  layout: string
  videoUrl: string | null
  clickUrl: string | null
  placement: string
  frequency: number
  impressionsLimit: number
  impressionsServed: number
  clicksServed: number
  startDate: string | null
  endDate: string | null
  isActive: boolean
  targetStateIds: string[]
  targetCategoryIds: string[]
}

const defaultForm = {
  title: '', advertiser: '', type: 'poster', placement: 'feed_inline',
  layout: 'grid', imagesUrls: [] as string[], videoUrl: '', clickUrl: '',
  frequency: 5, impressionsLimit: 0, startDate: '', endDate: '', isActive: true,
  targetStateIds: [] as string[], targetCategoryIds: [] as string[],
}

export default function AdsPage() {
  const [ads, setAds] = useState<AdItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('poster')
  const [settings, setSettings] = useState<Record<string, string>>({})

  // Page-based form state
  const [formMode, setFormMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editItem, setEditItem] = useState<AdItem | null>(null)
  const [formType, setFormType] = useState<'poster' | 'video'>('poster')

  const fetchAds = useCallback(async () => {
    try {
      setLoading(true)
      const data = await authFetchJson<AdItem[]>('/api/admin/ads')
      setAds(data)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load ads')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSettings = useCallback(async () => {
    try {
      const data = await authFetchJson<Record<string, string>>('/api/admin/settings')
      setSettings(data)
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => { fetchAds(); fetchSettings() }, [fetchAds, fetchSettings])

  const posterAds = ads.filter(a => a.type === 'image' || a.type === 'poster')
  const videoAds = ads.filter(a => a.type === 'video')

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this ad?')) return
    try {
      await authFetch(`/api/admin/ads/${id}`, { method: 'DELETE' })
      toast.success('Ad deleted')
      fetchAds()
    } catch { toast.error('Failed to delete') }
  }

  const handleSaveSettings = async () => {
    try {
      await authFetchJSON('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      })
      toast.success('AdMob settings saved')
    } catch { toast.error('Failed to save settings') }
  }

  const openCreate = (type: 'poster' | 'video') => {
    setEditItem(null)
    setFormType(type)
    setFormMode('create')
  }

  const openEdit = (ad: AdItem) => {
    setEditItem(ad)
    setFormType(ad.type === 'image' ? 'poster' : (ad.type as 'poster' | 'video'))
    setFormMode('edit')
  }

  const handleFormSave = async (formData: Record<string, unknown>) => {
    try {
      if (editItem) {
        const res = await authFetchJSON(`/api/admin/ads/${editItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        })
        if (!res.ok) throw new Error()
        toast.success('Ad updated')
      } else {
        const res = await authFetchJSON('/api/admin/ads', {
          method: 'POST',
          body: JSON.stringify(formData),
        })
        if (!res.ok) throw new Error()
        toast.success('Ad created')
      }
      setFormMode('list')
      setEditItem(null)
      fetchAds()
    } catch {
      toast.error('Failed to save ad')
    }
  }

  const handleFormCancel = () => {
    setFormMode('list')
    setEditItem(null)
  }

  const placementLabels: Record<string, string> = {
    home_banner: 'Home Banner',
    feed_inline: 'Feed (Every Nth)',
    article_banner: 'Article Banner',
    interstitial: 'Interstitial',
  }

  // Show full-page form for create/edit
  if (formMode === 'create' || formMode === 'edit') {
    return (
      <AdFormPage
        key={editItem?.id || formType}
        editItem={editItem}
        adType={formType}
        onSave={handleFormSave}
        onCancel={handleFormCancel}
      />
    )
  }

  const renderAdTable = (data: AdItem[], type: 'poster' | 'video') => (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-0">
        {loading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Advertiser</TableHead>
                  <TableHead>Placement</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Impressions</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(ad => (
                  <TableRow key={ad.id}>
                    <TableCell>
                      {type === 'poster' ? (
                        ad.imagesUrls?.[0] ? (
                          <img src={ad.imagesUrls[0]} alt="" className="w-10 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>
                        )
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center"><Play className="h-4 w-4 text-muted-foreground" /></div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{ad.title}</TableCell>
                    <TableCell className="text-sm">{ad.advertiser}</TableCell>
                    <TableCell><Badge variant="outline">{placementLabels[ad.placement] || ad.placement}</Badge></TableCell>
                    <TableCell>
                      {ad.placement === 'feed_inline' ? (
                        <Badge className="bg-red-100 text-red-700">Every {ad.frequency || 5}th</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{ad.impressionsServed?.toLocaleString()} / {ad.impressionsLimit?.toLocaleString() || '\u221E'}</TableCell>
                    <TableCell className="text-sm">{ad.clicksServed?.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {ad.startDate ? new Date(ad.startDate).toLocaleDateString() : '-'} &rarr; {ad.endDate ? new Date(ad.endDate).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={ad.isActive}
                        onCheckedChange={async (v) => {
                          try {
                            await authFetchJSON(`/api/admin/ads/${ad.id}`, {
                              method: 'PUT',
                              body: JSON.stringify({ ...ad, isActive: v, type: ad.type === 'image' ? 'poster' : ad.type }),
                            })
                            toast.success(v ? 'Ad activated' : 'Ad deactivated')
                            fetchAds()
                          } catch { toast.error('Failed to update') }
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(ad)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-red-600" onClick={() => handleDelete(ad.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No {type} ads yet. Click &quot;Create {type === 'poster' ? 'Poster Ad' : 'Video Ad'}&quot; to add one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Ads Management</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="poster"><ImageIcon className="h-4 w-4 mr-2" />Poster Ads ({posterAds.length})</TabsTrigger>
          <TabsTrigger value="video"><Film className="h-4 w-4 mr-2" />Video Ads ({videoAds.length})</TabsTrigger>
          <TabsTrigger value="admob"><Settings className="h-4 w-4 mr-2" />AdMob</TabsTrigger>
        </TabsList>

        <TabsContent value="poster" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Image-based ads displayed as banners or inline cards at a set frequency</p>
            </div>
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => openCreate('poster')}>
              <Plus className="h-4 w-4 mr-2" /> Create Poster Ad
            </Button>
          </div>
          {renderAdTable(posterAds, 'poster')}
        </TabsContent>

        <TabsContent value="video" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Video ads (pre-roll, mid-roll) displayed at a set frequency in the feed</p>
            </div>
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => openCreate('video')}>
              <Plus className="h-4 w-4 mr-2" /> Create Video Ad
            </Button>
          </div>
          {renderAdTable(videoAds, 'video')}
        </TabsContent>

        <TabsContent value="admob" className="space-y-4 mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">AdMob Configuration</CardTitle>
              <CardDescription>Configure Google AdMob integration alongside custom ads</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div><Label className="font-medium">Enable AdMob</Label><p className="text-xs text-muted-foreground">Toggle AdMob ads on/off globally</p></div>
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
    </div>
  )
}

// ============================================================
// Full-Page Ad Form Component
// ============================================================
function AdFormPage({
  editItem, adType, onSave, onCancel,
}: {
  editItem: AdItem | null
  adType: 'poster' | 'video'
  onSave: (data: Record<string, unknown>) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<Record<string, unknown>>({
    ...defaultForm,
    type: adType,
    layout: adType === 'poster' ? 'grid' : '',
    frequency: 5,
    ...(editItem ? {
      ...editItem,
      type: editItem.type === 'image' ? 'poster' : editItem.type,
      startDate: editItem.startDate?.split('T')[0] || '',
      endDate: editItem.endDate?.split('T')[0] || '',
    } : {}),
  })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await authFetch('/api/admin/media/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) {
        const current = (form.imagesUrls as string[]) || []
        setForm(p => ({ ...p, imagesUrls: [...current, data.url] }))
        toast.success('Image uploaded')
      }
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (index: number) => {
    const current = (form.imagesUrls as string[]) || []
    setForm(p => ({ ...p, imagesUrls: current.filter((_, i) => i !== index) }))
  }

  const handleSubmit = async () => {
    if (!form.title) {
      toast.error('Title is required')
      return
    }
    if (!form.advertiser) {
      toast.error('Advertiser is required')
      return
    }
    setSaving(true)
    try {
      await onSave(form)
    } finally {
      setSaving(false)
    }
  }

  const isPoster = (form.type as string) === 'poster'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onCancel} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {editItem ? `Edit ${isPoster ? 'Poster' : 'Video'} Ad` : `Create ${isPoster ? 'Poster' : 'Video'} Ad`}
          </h1>
          <p className="text-sm text-muted-foreground">
            {editItem ? 'Update the ad campaign details' : 'Configure a new ad campaign with placement and frequency settings'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6 space-y-5">
              <h3 className="font-semibold text-sm">Campaign Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input value={form.title as string} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ad campaign name" />
                </div>
                <div className="space-y-2">
                  <Label>Advertiser *</Label>
                  <Input value={form.advertiser as string} onChange={e => setForm(p => ({ ...p, advertiser: e.target.value }))} placeholder="Company name" />
                </div>
              </div>

              {/* Poster: Image Upload */}
              {isPoster && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Ad Images (up to 4)</Label>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer">
                      <Button type="button" variant="outline" size="sm" disabled={uploading || (form.imagesUrls as string[]).length >= 4} asChild>
                        <span>
                          {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                          Upload Image
                        </span>
                      </Button>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                    <span className="text-xs text-muted-foreground">{(form.imagesUrls as string[]).length}/4 images</span>
                  </div>
                  {(form.imagesUrls as string[]).length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(form.imagesUrls as string[]).map((url, i) => (
                        <div key={i} className="relative group">
                          <img src={url} alt={`Ad ${i + 1}`} className="h-20 w-full object-cover rounded-lg border" />
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
                  {/* Layout selector */}
                  {(form.imagesUrls as string[]).length > 1 && (
                    <div className="flex items-center gap-3">
                      <Label className="text-xs">Layout:</Label>
                      <div className="flex gap-2">
                        <button
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border ${form.layout === 'grid' ? 'bg-red-50 border-red-300 text-red-700' : 'hover:bg-muted'}`}
                          onClick={() => setForm(p => ({ ...p, layout: 'grid' }))}
                        >
                          <LayoutGrid className="h-3 w-3" /> Grid
                        </button>
                        <button
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border ${form.layout === 'carousel' ? 'bg-red-50 border-red-300 text-red-700' : 'hover:bg-muted'}`}
                          onClick={() => setForm(p => ({ ...p, layout: 'carousel' }))}
                        >
                          <Megaphone className="h-3 w-3" /> Carousel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Video: URL */}
              {!isPoster && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Video URL</Label>
                  <Input value={form.videoUrl as string} onChange={e => setForm(p => ({ ...p, videoUrl: e.target.value }))} placeholder="https://example.com/ad-video.mp4" />
                  <p className="text-xs text-muted-foreground">MP4 or WebM format. Video will play as pre-roll before content.</p>
                </div>
              )}

              {/* Click URL */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Click URL (Landing Page)</Label>
                <Input value={form.clickUrl as string} onChange={e => setForm(p => ({ ...p, clickUrl: e.target.value }))} placeholder="https://example.com/landing" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Placement & Frequency */}
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-sm">Placement & Frequency</h3>

              <div className="space-y-2">
                <Label>Placement</Label>
                <select className="w-full border rounded-md p-2 text-sm bg-background" value={form.placement as string} onChange={e => setForm(p => ({ ...p, placement: e.target.value }))}>
                  <option value="home_banner">Home Banner</option>
                  <option value="feed_inline">Feed (Every Nth Item)</option>
                  <option value="article_banner">Article Banner</option>
                  <option value="interstitial">Interstitial (Full Screen)</option>
                </select>
              </div>

              {form.placement === 'feed_inline' && (
                <div className="space-y-2">
                  <Label>Display Frequency</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Every</span>
                    <Input type="number" min={2} max={20} value={form.frequency as number} onChange={e => setForm(p => ({ ...p, frequency: parseInt(e.target.value) || 5 }))} className="w-20 text-center" />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">items</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Ad will appear after every N news items in the feed</p>
                </div>
              )}

              {/* Schedule */}
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={form.startDate as string} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={form.endDate as string} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
              </div>

              {/* Impressions Limit */}
              <div className="space-y-2">
                <Label>Impressions Limit (0 = unlimited)</Label>
                <Input type="number" value={form.impressionsLimit as number} onChange={e => setForm(p => ({ ...p, impressionsLimit: parseInt(e.target.value) || 0 }))} />
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-2 pt-2">
                <Switch checked={form.isActive as boolean} onCheckedChange={v => setForm(p => ({ ...p, isActive: v }))} />
                <Label>Active</Label>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
            <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {editItem ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

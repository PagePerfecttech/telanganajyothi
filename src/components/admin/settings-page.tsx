'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Settings, Shield, Wrench, Bell, Moon, Video, Bookmark, Share, MessageSquare, Save } from 'lucide-react'

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings')
      setSettings(await res.json())
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      toast.success('Settings saved successfully')
    } catch { toast.error('Failed to save settings') }
    finally { setSaving(false) }
  }

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />)}</div>
  }

  const featureFlags = [
    { key: 'feature_comments', label: 'Comments', desc: 'Allow users to comment on articles', icon: MessageSquare },
    { key: 'feature_dark_mode', label: 'Dark Mode', desc: 'Enable dark mode toggle in app', icon: Moon },
    { key: 'feature_video_section', label: 'Video Section', desc: 'Show video section in app', icon: Video },
    { key: 'feature_notifications', label: 'Push Notifications', desc: 'Enable push notifications', icon: Bell },
    { key: 'feature_bookmarks', label: 'Bookmarks', desc: 'Allow users to bookmark articles', icon: Bookmark },
    { key: 'feature_share', label: 'Share', desc: 'Allow users to share articles', icon: Share },
  ]

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">App Settings</h1>
          <p className="text-sm text-muted-foreground">Remote config & feature flags</p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save All'}
        </Button>
      </div>

      {/* Force Update */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Shield className="h-5 w-5 text-red-600" /> Force Update</CardTitle>
          <CardDescription>Set minimum app versions and force update behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Min Android Version</Label>
              <Input value={settings.force_update_android || '1.0.0'} onChange={e => updateSetting('force_update_android', e.target.value)} placeholder="1.0.0" />
            </div>
            <div className="space-y-2">
              <Label>Min iOS Version</Label>
              <Input value={settings.force_update_ios || '1.0.0'} onChange={e => updateSetting('force_update_ios', e.target.value)} placeholder="1.0.0" />
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div><Label className="font-medium">Hard Block</Label><p className="text-xs text-muted-foreground">Block app access for outdated versions</p></div>
            <Switch checked={settings.force_update_hard_block === 'true'} onCheckedChange={v => updateSetting('force_update_hard_block', String(v))} />
          </div>
        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Settings className="h-5 w-5 text-red-600" /> Feature Flags</CardTitle>
          <CardDescription>Toggle app features remotely</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {featureFlags.map((flag, i) => {
            const Icon = flag.icon
            return (
              <div key={flag.key}>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg"><Icon className="h-4 w-4" /></div>
                    <div>
                      <Label className="font-medium">{flag.label}</Label>
                      <p className="text-xs text-muted-foreground">{flag.desc}</p>
                    </div>
                  </div>
                  <Switch checked={settings[flag.key] !== 'false'} onCheckedChange={v => updateSetting(flag.key, String(v))} />
                </div>
                {i < featureFlags.length - 1 && <Separator />}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Maintenance Mode */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Wrench className="h-5 w-5 text-red-600" /> Maintenance Mode</CardTitle>
          <CardDescription>Temporarily disable app access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div><Label className="font-medium">Enable Maintenance Mode</Label><p className="text-xs text-muted-foreground">Shows maintenance screen in the app</p></div>
            <Switch checked={settings.maintenance_mode === 'true'} onCheckedChange={v => updateSetting('maintenance_mode', String(v))} />
          </div>
          <div className="space-y-2">
            <Label>Maintenance Message</Label>
            <Textarea value={settings.maintenance_message || ''} onChange={e => updateSetting('maintenance_message', e.target.value)} placeholder="We'll be back shortly..." rows={2} />
          </div>
        </CardContent>
      </Card>

      {/* AdMob Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Bell className="h-5 w-5 text-red-600" /> AdMob Settings</CardTitle>
          <CardDescription>Configure Google AdMob (also available in Ads tab)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div><Label className="font-medium">Enable AdMob</Label></div>
            <Switch checked={settings.admob_enabled === 'true'} onCheckedChange={v => updateSetting('admob_enabled', String(v))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Banner ID</Label><Input value={settings.admob_banner_id || ''} onChange={e => updateSetting('admob_banner_id', e.target.value)} /></div>
            <div className="space-y-2"><Label>Interstitial ID</Label><Input value={settings.admob_interstitial_id || ''} onChange={e => updateSetting('admob_interstitial_id', e.target.value)} /></div>
            <div className="space-y-2"><Label>Native ID</Label><Input value={settings.admob_native_id || ''} onChange={e => updateSetting('admob_native_id', e.target.value)} /></div>
            <div className="space-y-2"><Label>Rewarded ID</Label><Input value={settings.admob_rewarded_id || ''} onChange={e => updateSetting('admob_rewarded_id', e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Frequency Cap</Label><Input type="number" value={settings.admob_frequency_cap || '5'} onChange={e => updateSetting('admob_frequency_cap', e.target.value)} /></div>
        </CardContent>
      </Card>
    </div>
  )
}

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
import { Settings, Shield, Wrench, MessageSquare, Moon, Video as VideoIcon, Bell, Bookmark, Share, Save, Megaphone, Youtube, Coins, Trash2, Clock, Sparkles } from 'lucide-react'
import { authFetch, authFetchJSON, authFetchJson } from '@/lib/utils'

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      const data = await authFetchJson<Record<string, string>>('/api/admin/settings')
      setSettings(data)
    } catch { toast.error('Failed to load settings') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const handleSave = async () => {
    setSaving(true)
    try {
      await authFetchJSON('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      })
      toast.success('Settings saved successfully')
    } catch { toast.error('Failed to save settings') }
    finally { setSaving(false) }
  }

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const [runningCleanup, setRunningCleanup] = useState(false)

  const handleManualCleanup = async () => {
    const days = parseInt(settings.auto_delete_days || '0', 10)
    if (isNaN(days) || days <= 0) {
      toast.error('Please set Auto Delete Days greater than 0 first')
      return
    }
    setRunningCleanup(true)
    try {
      const res = await authFetchJson<{ success: boolean; message: string }>('/api/admin/news/auto-delete', {
        method: 'POST',
        body: JSON.stringify({ days }),
      })
      if (res.success) {
        toast.success(res.message)
      } else {
        toast.error('Auto-delete cleanup failed')
      }
    } catch {
      toast.error('Failed to run auto-delete cleanup')
    } finally {
      setRunningCleanup(false)
    }
  }

  if (loading) {
    return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />)}</div>
  }

  const featureFlags = [
    { key: 'feature_comments', label: 'Comments', desc: 'Allow users to comment on articles', icon: MessageSquare },
    { key: 'feature_dark_mode', label: 'Dark Mode', desc: 'Enable dark mode toggle in app', icon: Moon },
    { key: 'feature_video_section', label: 'Video Section', desc: 'Show video section in app', icon: VideoIcon },
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

      {/* YouTube Shorts Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Youtube className="h-5 w-5 text-red-600" /> YouTube Shorts Integration</CardTitle>
          <CardDescription>Connect YouTube channel for auto-publishing videos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <Label className="font-medium">Connection Status</Label>
              <p className="text-xs text-muted-foreground">
                {settings.YOUTUBE_REFRESH_TOKEN ? 'Connected (Refresh token found)' : 'Not Connected'}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                const res = await authFetchJson<{ url: string }>('/api/admin/youtube/auth')
                if (res.url) {
                  window.location.href = res.url
                }
              }}
            >
              Connect YouTube
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reward Tiers Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Coins className="h-5 w-5 text-red-600" /> Reporter Reward Tiers</CardTitle>
          <CardDescription>Configure how many coins reporters earn</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Coins for Article/News Approval (per post)</Label>
              <Input 
                type="number"
                value={settings.REWARD_ARTICLE || settings.NEWS_APPROVAL_COINS || '2'} 
                onChange={e => {
                  updateSetting('REWARD_ARTICLE', e.target.value)
                  updateSetting('NEWS_APPROVAL_COINS', e.target.value)
                }} 
              />
            </div>
            <div className="space-y-2">
              <Label>Coins for Video Approval</Label>
              <Input 
                type="number"
                value={settings.VIDEO_APPROVAL_COINS || '20'} 
                onChange={e => updateSetting('VIDEO_APPROVAL_COINS', e.target.value)} 
              />
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <Label>Coins equivalent to 1 INR</Label>
            <p className="text-xs text-muted-foreground">e.g., 5 means 5 coins = 1 INR</p>
            <Input 
              type="number"
              step="1"
              value={settings.COINS_PER_INR || '100'} 
              onChange={e => updateSetting('COINS_PER_INR', e.target.value)} 
            />
          </div>
        </CardContent>
      </Card>

      {/* Ad Management */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Megaphone className="h-5 w-5 text-red-600" /> Ad Management</CardTitle>
          <CardDescription>Configure Google AdMob IDs and Custom Ads</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Global Ad Settings</h3>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div><Label className="font-medium">Enable AdMob Feed Ads</Label><p className="text-xs text-muted-foreground">Show native ads in the news feed</p></div>
              <Switch checked={settings.admob_feed_enabled !== 'false'} onCheckedChange={v => updateSetting('admob_feed_enabled', String(v))} />
            </div>
            <div className="grid grid-cols-1 gap-2 pt-2">
              <Label>Ad Feed Frequency (Posts between ads)</Label>
              <Input type="number" value={settings.admob_feed_frequency || '4'} onChange={e => updateSetting('admob_feed_frequency', e.target.value)} />
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">AdMob IDs (Android)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>App Open ID</Label><Input value={settings.admob_app_open_id_android || ''} onChange={e => updateSetting('admob_app_open_id_android', e.target.value)} placeholder="ca-app-pub-..." /></div>
              <div className="space-y-2"><Label>Native ID</Label><Input value={settings.admob_native_id_android || ''} onChange={e => updateSetting('admob_native_id_android', e.target.value)} placeholder="ca-app-pub-..." /></div>
              <div className="space-y-2"><Label>Interstitial ID</Label><Input value={settings.admob_interstitial_id_android || ''} onChange={e => updateSetting('admob_interstitial_id_android', e.target.value)} placeholder="ca-app-pub-..." /></div>
              <div className="space-y-2"><Label>Banner ID</Label><Input value={settings.admob_banner_id_android || ''} onChange={e => updateSetting('admob_banner_id_android', e.target.value)} placeholder="ca-app-pub-..." /></div>
            </div>
          </div>

          <Separator />
          
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">AdMob IDs (iOS)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>App Open ID</Label><Input value={settings.admob_app_open_id_ios || ''} onChange={e => updateSetting('admob_app_open_id_ios', e.target.value)} placeholder="ca-app-pub-..." /></div>
              <div className="space-y-2"><Label>Native ID</Label><Input value={settings.admob_native_id_ios || ''} onChange={e => updateSetting('admob_native_id_ios', e.target.value)} placeholder="ca-app-pub-..." /></div>
              <div className="space-y-2"><Label>Interstitial ID</Label><Input value={settings.admob_interstitial_id_ios || ''} onChange={e => updateSetting('admob_interstitial_id_ios', e.target.value)} placeholder="ca-app-pub-..." /></div>
              <div className="space-y-2"><Label>Banner ID</Label><Input value={settings.admob_banner_id_ios || ''} onChange={e => updateSetting('admob_banner_id_ios', e.target.value)} placeholder="ca-app-pub-..." /></div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Custom Sponsor Banner (Overrides AdMob Banner)</h3>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div><Label className="font-medium">Enable Custom Banner</Label><p className="text-xs text-muted-foreground">Show your own banner image at the bottom of the feed instead of AdMob</p></div>
              <Switch checked={settings.custom_banner_enabled === 'true'} onCheckedChange={v => updateSetting('custom_banner_enabled', String(v))} />
            </div>
            {settings.custom_banner_enabled === 'true' && (
              <div className="grid grid-cols-1 gap-4 pt-2">
                <div className="space-y-2"><Label>Banner Image URL</Label><Input value={settings.custom_banner_image_url || ''} onChange={e => updateSetting('custom_banner_image_url', e.target.value)} placeholder="https://..." /></div>
                <div className="space-y-2"><Label>Click Link URL</Label><Input value={settings.custom_banner_link_url || ''} onChange={e => updateSetting('custom_banner_link_url', e.target.value)} placeholder="https://..." /></div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reporter Level, Rewards & Performance Thresholds */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Coins className="h-5 w-5 text-red-600" /> Reporter Level, Rewards & Scoring Thresholds
          </CardTitle>
          <CardDescription>
            Configure reward rates per approved article (₹), daily submission limits, and promotion score thresholds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold text-sm text-gray-700">Junior Reporter Reward (₹ / article)</Label>
              <Input
                type="number"
                value={settings.reward_junior_article || '2'}
                onChange={e => updateSetting('reward_junior_article', e.target.value)}
                placeholder="2"
              />
              <p className="text-xs text-muted-foreground">Default ₹2 per approved article</p>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-sm text-gray-700">Senior Reporter Reward (₹ / article)</Label>
              <Input
                type="number"
                value={settings.reward_senior_article || '5'}
                onChange={e => updateSetting('reward_senior_article', e.target.value)}
                placeholder="5"
              />
              <p className="text-xs text-muted-foreground">Default ₹5 per approved article</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold text-sm text-gray-700">Junior Daily Approved Limit</Label>
              <Input
                type="number"
                value={settings.limit_junior_daily || '5'}
                onChange={e => updateSetting('limit_junior_daily', e.target.value)}
                placeholder="5"
              />
              <p className="text-xs text-muted-foreground">Max news submissions per day for Junior Reporters (Crime exempt)</p>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-sm text-gray-700">Senior Daily Approved Limit</Label>
              <Input
                type="number"
                value={settings.limit_senior_daily || '10'}
                onChange={e => updateSetting('limit_senior_daily', e.target.value)}
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground">Max news submissions per day for Senior Reporters (Crime exempt)</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold text-sm text-gray-700">Promotion Score Threshold</Label>
              <Input
                type="number"
                value={settings.promotion_score_threshold || '100'}
                onChange={e => updateSetting('promotion_score_threshold', e.target.value)}
                placeholder="100"
              />
              <p className="text-xs text-muted-foreground">Min Performance Score for Senior promotion eligibility</p>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-sm text-gray-700">Min Approved Articles</Label>
              <Input
                type="number"
                value={settings.promotion_min_approved || '100'}
                onChange={e => updateSetting('promotion_min_approved', e.target.value)}
                placeholder="100"
              />
              <p className="text-xs text-muted-foreground">Min approved articles for Senior promotion eligibility</p>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-sm text-gray-700">Demotion Score Threshold</Label>
              <Input
                type="number"
                value={settings.demotion_score_threshold || '40'}
                onChange={e => updateSetting('demotion_score_threshold', e.target.value)}
                placeholder="40"
              />
              <p className="text-xs text-muted-foreground">Score below which system recommends demotion</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Google Gemini AI Article Writing & Suggestions */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" /> Google Gemini AI Article Writing & Suggestions
          </CardTitle>
          <CardDescription>
            Configure Google Gemini API key to automatically rewrite reporter submissions into professional Telugu news articles with suggested change approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="font-semibold text-sm text-gray-700">Gemini API Key</Label>
            <Input
              type="password"
              value={settings.gemini_api_key || ''}
              onChange={e => updateSetting('gemini_api_key', e.target.value)}
              placeholder="AIzaSy..."
            />
            <p className="text-xs text-muted-foreground">
              Obtain your free API key from Google AI Studio (aistudio.google.com). Powers automatic professional Telugu headline & article rewrites.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Auto Delete News & Media Retention */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" /> Auto Delete News & Media Retention
          </CardTitle>
          <CardDescription>
            Automatically purge old news articles and clean up associated media files (images, thumbnails, uploaded videos) from server storage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 font-medium">
                <Clock className="h-4 w-4 text-muted-foreground" /> Retention Threshold (Days Count)
              </Label>
              <select
                className="w-full border rounded-md p-2 text-sm bg-background"
                value={settings.auto_delete_days || '0'}
                onChange={e => updateSetting('auto_delete_days', e.target.value)}
              >
                <option value="0">Disabled (Keep all news forever)</option>
                <option value="7">7 Days (Delete news older than 1 week)</option>
                <option value="15">15 Days (Delete news older than 15 days)</option>
                <option value="30">30 Days (Delete news older than 1 month)</option>
                <option value="60">60 Days (Delete news older than 2 months)</option>
                <option value="90">90 Days (Delete news older than 3 months)</option>
                <option value="180">180 Days (Delete news older than 6 months)</option>
                <option value="365">365 Days (Delete news older than 1 year)</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Set to 0 to disable. When set, posts older than this number of days will be deleted along with all their media files.
              </p>
            </div>
            <div className="flex justify-start md:justify-end">
              <Button
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 font-semibold"
                onClick={handleManualCleanup}
                disabled={runningCleanup || !settings.auto_delete_days || settings.auto_delete_days === '0'}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {runningCleanup ? 'Cleaning up...' : 'Run Cleanup Now'}
              </Button>
            </div>
          </div>
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
    </div>
  )
}

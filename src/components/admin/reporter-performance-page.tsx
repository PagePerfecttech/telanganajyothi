'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Award, AlertTriangle, ShieldCheck, TrendingUp, Search, UserCheck, ArrowUpRight, ArrowDownRight, RefreshCw, AlertCircle } from 'lucide-react'
import { authFetchJSON, authFetchJson } from '@/lib/utils'

interface ReporterPerformanceItem {
  id: string
  name: string
  phone: string
  email: string | null
  avatar: string | null
  role: 'junior' | 'senior'
  status: string
  performanceScore: number
  approvedArticles: number
  rejectedArticles: number
  fakeNewsCount: number
  warningCount: number
  promotionStatus: 'none' | 'recommended' | 'demotion_recommended' | 'promoted' | 'demoted'
  earningsBalance: number
  totalViews: number
  district: string | null
  mandal: string | null
  createdAt: string
}

export default function ReporterPerformancePage() {
  const [reporters, setReporters] = useState<ReporterPerformanceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'recommended' | 'demotion_recommended' | 'junior' | 'senior'>('all')

  const [warningModalItem, setWarningModalItem] = useState<ReporterPerformanceItem | null>(null)
  const [warningReason, setWarningReason] = useState('')
  const [submittingAction, setSubmittingAction] = useState(false)

  const fetchPerformance = useCallback(async () => {
    try {
      setLoading(true)
      const data = await authFetchJson<ReporterPerformanceItem[]>('/api/admin/reporters/performance')
      setReporters(data)
    } catch {
      toast.error('Failed to load reporter performance data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPerformance()
  }, [fetchPerformance])

  const handleAction = async (reporterId: string, action: string, extraData?: Record<string, unknown>) => {
    try {
      setSubmittingAction(true)
      const res = await authFetchJson<{ success: boolean; message?: string }>('/api/admin/reporters/performance', {
        method: 'POST',
        body: JSON.stringify({ reporterId, action, ...extraData }),
      })
      if (res.success) {
        toast.success(`Reporter action '${action}' updated successfully`)
        setWarningModalItem(null)
        setWarningReason('')
        fetchPerformance()
      } else {
        toast.error('Action failed')
      }
    } catch {
      toast.error('Failed to execute reporter action')
    } finally {
      setSubmittingAction(false)
    }
  }

  const filteredReporters = reporters.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone.includes(searchQuery) ||
      (r.district && r.district.toLowerCase().includes(searchQuery.toLowerCase()))

    if (!matchesSearch) return false

    if (statusFilter === 'recommended') return r.promotionStatus === 'recommended'
    if (statusFilter === 'demotion_recommended') return r.promotionStatus === 'demotion_recommended'
    if (statusFilter === 'junior') return r.role === 'junior'
    if (statusFilter === 'senior') return r.role === 'senior'

    return true
  })

  const totalReporters = reporters.length
  const totalRecommendedPromotions = reporters.filter((r) => r.promotionStatus === 'recommended').length
  const totalDemotionRecommended = reporters.filter((r) => r.promotionStatus === 'demotion_recommended').length
  const totalSeniors = reporters.filter((r) => r.role === 'senior').length
  const totalJuniors = reporters.filter((r) => r.role === 'junior').length

  const getScoreBadge = (score: number) => {
    if (score >= 100) return <Badge className="bg-emerald-600 text-white font-bold">🟢 Excellent ({score})</Badge>
    if (score >= 50) return <Badge className="bg-amber-500 text-white font-semibold">🟡 Average ({score})</Badge>
    return <Badge className="bg-rose-600 text-white font-semibold">🔴 Poor ({score})</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="h-6 w-6 text-red-600" /> Reporter Performance & Promotion Engine
          </h1>
          <p className="text-sm text-muted-foreground">
            Track performance scores, approval rates, fake news flags, and process Senior Reporter promotions.
          </p>
        </div>
        <Button variant="outline" onClick={fetchPerformance} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
        </Button>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Eligible for Promotion</p>
              <h3 className="text-2xl font-bold text-emerald-900 mt-1">{totalRecommendedPromotions}</h3>
              <p className="text-xs text-emerald-700 mt-0.5">Score ≥100 & 100+ approved</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <ArrowUpRight className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-50 to-rose-100/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Demotion Recommended</p>
              <h3 className="text-2xl font-bold text-rose-900 mt-1">{totalDemotionRecommended}</h3>
              <p className="text-xs text-rose-700 mt-0.5">Score &lt;40 or Warnings ≥5</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold">
              <ArrowDownRight className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Senior Reporters</p>
              <h3 className="text-2xl font-bold mt-1">{totalSeniors}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">₹5 / article (Limit: 10/day)</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Junior Reporters</p>
              <h3 className="text-2xl font-bold mt-1">{totalJuniors}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">₹2 / article (Limit: 5/day)</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center font-bold">
              <UserCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reporter, phone, district..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                All ({totalReporters})
              </Button>
              <Button
                variant={statusFilter === 'recommended' ? 'default' : 'outline'}
                size="sm"
                className={statusFilter === 'recommended' ? 'bg-emerald-600' : 'text-emerald-700 border-emerald-300'}
                onClick={() => setStatusFilter('recommended')}
              >
                🟢 Promotion Recommended ({totalRecommendedPromotions})
              </Button>
              <Button
                variant={statusFilter === 'demotion_recommended' ? 'default' : 'outline'}
                size="sm"
                className={statusFilter === 'demotion_recommended' ? 'bg-rose-600' : 'text-rose-700 border-rose-300'}
                onClick={() => setStatusFilter('demotion_recommended')}
              >
                🔴 Demotion Recommended ({totalDemotionRecommended})
              </Button>
              <Button
                variant={statusFilter === 'senior' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('senior')}
              >
                Seniors ({totalSeniors})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredReporters.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground border border-dashed rounded-xl">
              No reporters match the selected filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Level / Role</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead className="text-center">Approved</TableHead>
                    <TableHead className="text-center">Rejected</TableHead>
                    <TableHead className="text-center">Total Views</TableHead>
                    <TableHead className="text-center">Earnings (₹)</TableHead>
                    <TableHead>Status & Recommendation</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReporters.map((reporter) => (
                    <TableRow key={reporter.id} className="hover:bg-muted/40">
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold text-sm">{reporter.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {reporter.phone} • {reporter.district || 'State'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {reporter.role === 'senior' ? (
                          <Badge className="bg-blue-600 text-white font-semibold">⭐ Senior Reporter</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100 text-gray-700">Junior Reporter</Badge>
                        )}
                      </TableCell>
                      <TableCell>{getScoreBadge(reporter.performanceScore)}</TableCell>
                      <TableCell className="text-center font-bold text-emerald-600">{reporter.approvedArticles}</TableCell>
                      <TableCell className="text-center font-bold text-rose-600">{reporter.rejectedArticles}</TableCell>
                      <TableCell className="text-center font-medium">{reporter.totalViews.toLocaleString()}</TableCell>
                      <TableCell className="text-center font-bold text-emerald-700">₹{reporter.earningsBalance}</TableCell>
                      <TableCell>
                        {reporter.promotionStatus === 'recommended' && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full w-fit">
                            <TrendingUp className="h-3.5 w-3.5" /> Eligible for Senior Promotion
                          </div>
                        )}
                        {reporter.promotionStatus === 'demotion_recommended' && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full w-fit">
                            <AlertTriangle className="h-3.5 w-3.5" /> Recommended for Demotion
                          </div>
                        )}
                        {reporter.promotionStatus === 'promoted' && (
                          <div className="text-xs font-semibold text-blue-600">Promoted Senior</div>
                        )}
                        {reporter.promotionStatus === 'none' && (
                          <div className="text-xs text-muted-foreground">Normal Active</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {reporter.role === 'junior' ? (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                              onClick={() => handleAction(reporter.id, 'promote')}
                              disabled={submittingAction}
                            >
                              Promote Senior
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-rose-300 text-rose-600 hover:bg-rose-50 text-xs h-8"
                              onClick={() => handleAction(reporter.id, 'demote')}
                              disabled={submittingAction}
                            >
                              Demote Junior
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-amber-700 border-amber-300 hover:bg-amber-50 text-xs h-8"
                            onClick={() => setWarningModalItem(reporter)}
                          >
                            Warning (-20)
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-rose-700 border-rose-300 hover:bg-rose-50 text-xs h-8"
                            onClick={() => handleAction(reporter.id, 'fake_news')}
                            disabled={submittingAction}
                          >
                            Fake News (-50)
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

      {/* Warning Reason Modal */}
      <Dialog open={!!warningModalItem} onOpenChange={() => setWarningModalItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="h-5 w-5" /> Issue Warning to {warningModalItem?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 my-2">
            <p className="text-sm text-muted-foreground">
              Issuing a warning will deduct <strong>20 points</strong> from the reporter&apos;s Performance Score and increment their warning count.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Reason for Warning:</label>
              <Input
                placeholder="e.g. Unverified sources, misleading title, formatting guidelines violation..."
                value={warningReason}
                onChange={(e) => setWarningReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWarningModalItem(null)}>Cancel</Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => warningModalItem && handleAction(warningModalItem.id, 'warning', { reason: warningReason })}
              disabled={submittingAction}
            >
              Confirm Issue Warning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

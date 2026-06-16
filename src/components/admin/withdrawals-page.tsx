'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Banknote, CheckCircle, XCircle, Clock, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { authFetchJson, authFetchJSON } from '@/lib/utils'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

type Withdrawal = {
  id: string
  reporterId: string
  coinsAmount: number
  moneyAmount: number
  upiId: string
  status: 'pending' | 'processing' | 'completed' | 'rejected'
  adminNotes: string | null
  createdAt: string
  updatedAt: string
  reporter: {
    name: string
    phone: string
    district: string
  }
}

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [actionStatus, setActionStatus] = useState<'processing' | 'completed' | 'rejected' | null>(null)
  const [processing, setProcessing] = useState(false)

  const fetchWithdrawals = useCallback(async () => {
    try {
      setLoading(true)
      const data = await authFetchJson<Withdrawal[]>('/api/admin/withdrawals')
      setWithdrawals(data)
    } catch (error) {
      toast.error('Failed to load withdrawals')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWithdrawals()
  }, [fetchWithdrawals])

  const handleAction = async () => {
    if (!selectedWithdrawal || !actionStatus) return

    setProcessing(true)
    try {
      await authFetchJSON(`/api/admin/withdrawals/${selectedWithdrawal.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: actionStatus,
          adminNotes: adminNotes,
        }),
      })
      toast.success(`Withdrawal marked as ${actionStatus}`)
      setDialogOpen(false)
      fetchWithdrawals()
    } catch (error) {
      toast.error('Failed to update withdrawal status')
      console.error(error)
    } finally {
      setProcessing(false)
    }
  }

  const openDialog = (w: Withdrawal, status: 'processing' | 'completed' | 'rejected') => {
    setSelectedWithdrawal(w)
    setActionStatus(status)
    setAdminNotes(w.adminNotes || '')
    setDialogOpen(true)
  }

  const filtered = withdrawals.filter(w => 
    w.reporter.name.toLowerCase().includes(search.toLowerCase()) ||
    w.reporter.phone.includes(search) ||
    w.upiId.toLowerCase().includes(search.toLowerCase())
  )

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Banknote className="h-6 w-6 text-red-600" />
            Withdrawals
          </h1>
          <p className="text-sm text-muted-foreground">Manage reporter payout requests</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Withdrawal Requests</CardTitle>
              <CardDescription>Review and process pending payouts</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or UPI..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reporter</TableHead>
                  <TableHead>UPI ID</TableHead>
                  <TableHead>Coins</TableHead>
                  <TableHead>Amount (₹)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">Loading withdrawals...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">No withdrawals found.</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <div className="font-medium">{w.reporter.name}</div>
                        <div className="text-xs text-muted-foreground">{w.reporter.phone}</div>
                        <div className="text-xs text-muted-foreground">{w.reporter.district}</div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{w.upiId}</TableCell>
                      <TableCell>{w.coinsAmount}</TableCell>
                      <TableCell className="font-semibold text-green-600 dark:text-green-400">₹{w.moneyAmount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusColors[w.status]}>
                          {w.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(w.createdAt).toLocaleDateString()}
                        <br />
                        {new Date(w.createdAt).toLocaleTimeString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {w.status !== 'completed' && w.status !== 'rejected' && (
                              <>
                                {w.status === 'pending' && (
                                  <DropdownMenuItem onClick={() => openDialog(w, 'processing')}>
                                    <Clock className="mr-2 h-4 w-4 text-blue-500" />
                                    Mark Processing
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => openDialog(w, 'completed')}>
                                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                  Mark Completed
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openDialog(w, 'rejected')}>
                                  <XCircle className="mr-2 h-4 w-4 text-red-500" />
                                  Reject & Refund
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">Mark as {actionStatus}</DialogTitle>
            <DialogDescription>
              {actionStatus === 'completed' && 'Confirm that you have transferred the funds to the reporter\'s UPI ID.'}
              {actionStatus === 'rejected' && 'This will reject the withdrawal and refund the coins back to the reporter\'s wallet.'}
              {actionStatus === 'processing' && 'This indicates you are currently processing the payment.'}
            </DialogDescription>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm bg-muted p-4 rounded-lg">
                <div>
                  <p className="text-muted-foreground">Reporter</p>
                  <p className="font-medium">{selectedWithdrawal.reporter.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">UPI ID</p>
                  <p className="font-medium font-mono">{selectedWithdrawal.upiId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-medium text-green-600">₹{selectedWithdrawal.moneyAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Coins</p>
                  <p className="font-medium">{selectedWithdrawal.coinsAmount}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Admin Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="E.g., Transaction ID, reason for rejection..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={processing}>
              Cancel
            </Button>
            <Button 
              onClick={handleAction} 
              disabled={processing}
              variant={actionStatus === 'rejected' ? 'destructive' : 'default'}
            >
              {processing ? 'Saving...' : 'Confirm Action'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

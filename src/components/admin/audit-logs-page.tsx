'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText } from 'lucide-react'
import { authFetch } from '@/lib/utils'

interface AuditLogItem {
  id: string
  action: string
  entity: string
  entityId: string | null
  ipAddress: string | null
  changes: string
  createdAt: string
  admin: { name: string; email: string }
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [entityFilter, setEntityFilter] = useState('')

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ limit: '100' })
      if (entityFilter) params.set('entity', entityFilter)
      const res = await authFetch(`/api/admin/audit-logs?${params}`)
      setLogs(await res.json())
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [entityFilter])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const actionColors: Record<string, string> = {
    create: 'bg-green-100 text-green-700',
    update: 'bg-blue-100 text-blue-700',
    delete: 'bg-red-100 text-red-700',
    status_published: 'bg-emerald-100 text-emerald-700',
    status_rejected: 'bg-orange-100 text-orange-700',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">Track all admin actions</p>
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Filter entity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            <SelectItem value="news">News</SelectItem>
            <SelectItem value="category">Category</SelectItem>
            <SelectItem value="reporter">Reporter</SelectItem>
            <SelectItem value="ad">Ad</SelectItem>
            <SelectItem value="notification">Notification</SelectItem>
            <SelectItem value="setting">Setting</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Changes</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.admin?.name || 'System'}</TableCell>
                      <TableCell>
                        <Badge className={actionColors[log.action] || 'bg-gray-100 text-gray-700'}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {log.entity}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{log.entityId ? `${log.entityId.slice(0, 8)}...` : '-'}</TableCell>
                      <TableCell className="text-xs">{log.ipAddress || '-'}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{log.changes !== '{}' ? log.changes : '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No audit logs found</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

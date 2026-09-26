'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Users, Package, Clock, ArrowUp, ArrowDown, TrendingUp, AlertTriangle, DollarSign, Store, Truck, Pill, BarChart, CheckCircle, XCircle, ExternalLink, Image, Calendar, Clock as ClockIcon, User } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart as RechartsBarChart,
  Bar,
  LineChart,
  Line,
  Tooltip,
  Legend,
} from 'recharts'

const COLORS = {
  teal: '#0F766E',
  tealLight: '#CCFBF1',
  amber: '#F59E0B',
  amberLight: '#FEF3C7',
  red: '#DC2626',
  redLight: '#FEE2E2',
  orange: '#EA580C',
  orangeLight: '#FFEDD5',
  gray: '#9CA3AF',
  grayLight: '#F3F4F6',
}

const STATUSES = [
  'RX_PENDING', 'CONFIRMED', 'ACCEPTED', 'PACKING', 'PACKED', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'
]

export default function AdminOverviewPage() {
  const { isLoading: authLoading, user } = useAuth()
  const [overview, setOverview] = useState<any>(null)
  const [trends, setTrends] = useState<any>(null)
  const [pharmacyHealth, setPharmacyHealth] = useState<any[]>([])
  const [topMedicines, setTopMedicines] = useState<any[]>([])
  const [alerts, setAlerts] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<'today' | '7d' | '30d'>('today')
  const [pulse, setPulse] = useState<any[]>([])

  async function fetchAll() {
    setLoading(true)
    try {
      const [overviewRes, trendsRes, healthRes, medicinesRes, pulseRes] = await Promise.all([
        fetch(`/api/admin/overview?range=${range}`),
        fetch(`/api/admin/trends?range=${range}`),
        fetch(`/api/admin/pharmacy-health`),
        fetch(`/api/admin/top-medicines?range=${range}`),
        fetch(`/api/admin/pulse`),
      ])
      const [o, t, h, m, p] = await Promise.all([
        overviewRes.json(),
        trendsRes.json(),
        healthRes.json(),
        medicinesRes.json(),
        pulseRes.json(),
      ])
      setOverview(o)
      setTrends(t)
      setPharmacyHealth(h.pharmacies || [])
      setTopMedicines(m.medicines || [])
      setPulse(p.events || [])
    } catch (err) {
      console.error('Failed to load admin overview:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [range])

  useEffect(() => {
    const interval = setInterval(() => fetch('/api/admin/pulse').then(r => r.json()).then(p => setPulse(p.events || [])), 15000)
    return () => clearInterval(interval)
  }, [])

  function fmt(n: number) {
    return n.toLocaleString('en-IN')
  }

  function rupees(n: number) {
    return '₹' + fmt(Math.round(n))
  }

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!overview) return null

  const activeCount = overview.activeOrders || 0
  const stuckCount = overview.stuckOrders || 0

  return (
    <div className="space-y-6">
      {/* Alert banner */}
      {alerts.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex flex-wrap gap-3 text-sm text-red-700">
            {alerts.map((a, i) => (
              <div key={i} className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{a}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header + Range selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Overview</h1>
          <p className="text-muted-foreground">Daily operational snapshot — money flow & stuck items</p>
        </div>
        <Select value={range} onValueChange={(v) => setRange(v as typeof range)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Live Ops Pulse */}
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* Row 1 — 4 KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-5 flex items-start gap-4">
                <div className="rounded-full bg-teal-50 p-3 text-teal-700">
                  <Users className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">Customers</p>
                  <p className="text-2xl font-bold tabular-nums">{fmt(overview.customers || 0)}</p>
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <ArrowUp className="h-3 w-3" />
                    {overview.customersDelta?.toFixed(1) || '0.0'}% vs last week
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-start gap-4">
                <div className="rounded-full bg-green-50 p-3 text-green-700">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">Completed Orders</p>
                  <p className="text-2xl font-bold tabular-nums">{fmt(overview.completedOrders || 0)}</p>
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <ArrowUp className="h-3 w-3" />
                    {overview.completedDelta?.toFixed(1) || '0.0'}% · avg ₹{Math.round(overview.avgOrderValue || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-start gap-4">
                <div className={cn('rounded-full p-3', activeCount > 20 ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700')}>
                  <Package className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">Active Orders</p>
                  <p className="text-2xl font-bold tabular-nums">{fmt(activeCount)}</p>
<p className={cn('text-xs flex items-center gap-1', stuckCount > 0 ? 'text-red-600' : 'text-amber-600')}>
                      {stuckCount > 0 && (
                        <>
                          <AlertTriangle className="h-3 w-3" />
                          {stuckCount} stuck over 30 min
                        </>
                      )}
                      {stuckCount === 0 && <span>All flowing</span>}
                    </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-start gap-4">
                <div className="rounded-full bg-amber-50 p-3 text-amber-700">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">Revenue Today</p>
                  <p className="text-2xl font-bold tabular-nums">{rupees(overview.revenueToday || 0)}</p>
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <ArrowUp className="h-3 w-3" />
                    {overview.revenueDelta?.toFixed(1) || '0.0'}% vs yesterday
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2 — 4 Donuts + Revenue Area */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1.2fr]">
            <DonutCard
              title="Delivery Rate"
              subtitle={overview.deliveryRate ? `${overview.deliveryRate.toFixed(1)}%` : '—'}
              color={COLORS.teal}
              colorLight={COLORS.tealLight}
              value={overview.deliveryRate || 0}
              total={100}
              icon={<CheckCircle className="h-4 w-4" />}
            />
            <DonutCard
              title="Cancel Rate"
              subtitle={overview.cancelRate ? `${overview.cancelRate.toFixed(1)}%` : '—'}
              color={COLORS.red}
              colorLight={COLORS.redLight}
              value={overview.cancelRate || 0}
              total={100}
              icon={<XCircle className="h-4 w-4" />}
              warnAbove={10}
            />
            <DonutCard
              title="Rx Approval Rate"
              subtitle={overview.rxApprovalRate ? `${overview.rxApprovalRate.toFixed(1)}%` : '—'}
              color={COLORS.amber}
              colorLight={COLORS.amberLight}
              value={overview.rxApprovalRate || 0}
              total={100}
              icon={<Pill className="h-4 w-4" />}
              sublabel={overview.avgVerifyMin ? `${overview.avgVerifyMin} min avg` : ''}
            />
            <DonutCard
              title="OOS Line Rate"
              subtitle={overview.oosRate ? `${overview.oosRate.toFixed(1)}%` : '—'}
              color={COLORS.orange}
              colorLight={COLORS.orangeLight}
              value={overview.oosRate || 0}
              total={100}
              icon={<AlertTriangle className="h-4 w-4" />}
            />
            {/* Revenue Area Chart */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Revenue {range === 'today' ? '(Hourly)' : '(Daily)'}</CardTitle>
                  <Badge variant="secondary">{rupees(overview.revenueToday || 0)}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={trends?.revenue || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.teal} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.teal} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grayLight} />
                    <XAxis dataKey={range === 'today' ? 'hour' : 'date'} tick={{ fontSize: 11 }} stroke={COLORS.gray} />
                    <YAxis tick={{ fontSize: 11 }} stroke={COLORS.gray} tickFormatter={(v) => '₹' + (v / 1000).toFixed(0) + 'k' } />
                    <Tooltip formatter={(v: any) => v !== undefined ? rupees(v) : ''} labelFormatter={(label) => range === 'today' ? `${label}:00` : label} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={COLORS.teal}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#revenueGradient)"
                    />
                    {trends?.revenueYesterday && (
                      <Area
                        type="monotone"
                        dataKey="revenueYesterday"
                        stroke={COLORS.gray}
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        fill="none"
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Row 3 — Trend Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5 text-amber-600" />
                  Demand by Hour
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <RechartsBarChart data={trends?.demandByHour || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grayLight} />
                    <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke={COLORS.gray} />
                    <YAxis tick={{ fontSize: 11 }} stroke={COLORS.gray} />
                    <Tooltip formatter={(v: any) => v !== undefined ? `${v} Orders` : ''} />
                    <Bar dataKey="orders" fill={COLORS.amber} radius={[4, 4, 0, 0]} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-teal-600" />
                  Avg Delivery Time (minutes)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trends?.deliveryTime || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grayLight} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke={COLORS.gray} />
                    <YAxis tick={{ fontSize: 11 }} stroke={COLORS.gray} domain={[0, 'auto']} />
                    <Tooltip formatter={(v: any) => v !== undefined ? `${v.toFixed(1)} min` : ''} />
                    <Line
                      type="monotone"
                      dataKey="avgMinutes"
                      stroke={COLORS.teal}
                      strokeWidth={2}
                      dot={{ fill: COLORS.teal, strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: COLORS.teal, strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Row 4 — Tables */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Top Medicines */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Pill className="h-5 w-5" />
                  Top Medicines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topMedicines.slice(0, 10).map((m: any, i: number) => (
                    <div key={m.name} className="flex items-center gap-3 py-2 border-b last:border-0">
                      <span className="w-7 text-center text-muted-foreground font-medium">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{m.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.rxPct ? `${m.rxPct}% Rx · ` : ''}{fmt(m.units)} units · {rupees(m.revenue)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {topMedicines.length === 0 && (
                    <div className="py-8 text-center text-muted-foreground">No data</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pharmacy Health */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Pharmacy Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium">Pharmacy</th>
                        <th className="px-3 py-2 text-right font-medium">Orders/wk</th>
                        <th className="px-3 py-2 text-right font-medium">Accept</th>
                        <th className="px-3 py-2 text-right font-medium">Avg Accept</th>
                        <th className="px-3 py-2 text-right font-medium">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pharmacyHealth.slice(0, 10).map((p: any) => (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-3 py-2 font-medium">{p.name}</td>
                          <td className="px-3 py-2 text-right">{fmt(p.orders || 0)}</td>
                          <td className="px-3 py-2 text-right">
                            <span className={cn('font-medium', p.acceptRate >= 95 ? 'text-green-600' : p.acceptRate >= 90 ? 'text-amber-600' : 'text-red-600')}>
                              {p.acceptRate?.toFixed(1) || '—'}%
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">{p.avgAcceptMin?.toFixed(1) || '—'} min</td>
                          <td className="px-3 py-2 text-right">
                            <Badge variant={p.score === 'A' ? 'default' : p.score === 'B' ? 'secondary' : 'outline'}>
                              {p.score || 'C'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pharmacyHealth.length === 0 && <div className="py-8 text-center text-muted-foreground">No data</div>}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right rail — Live Ops Pulse */}
        <Card className="lg:sticky lg:top-24 lg:self-start h-[calc(100vh-10rem)] overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" />
              Live Ops Pulse
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[calc(100%-4rem)] overflow-y-auto space-y-0">
              {pulse.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm">No recent activity</p>
                </div>
              ) : (
                pulse.slice(0, 30).map((e: any, i: number) => (
                  <div
                    key={`${e.id}-${i}`}
                    className={cn(
                      'px-4 py-3 border-b last:border-0 transition-colors hover:bg-muted/50',
                      e.type === 'stuck' && 'bg-red-50 border-l-4 border-red-500 pl-3'
                    )}
                  >
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {e.time || new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-sm flex items-center gap-2">
                      {e.type === 'delivery' && <Truck className="h-4 w-4 text-blue-600" />}
                      {e.type === 'rx' && <Pill className="h-4 w-4 text-amber-600" />}
                      {e.type === 'rider' && <User className="h-4 w-4 text-green-600" />}
                      {e.type === 'stuck' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                      <span className="font-mono text-xs">{e.orderId ? `#${e.orderId.slice(0, 8)}` : ''}</span>
                      <span>{e.message}</span>
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DonutCard({ title, subtitle, color, colorLight, value, total = 100, icon, sublabel, warnAbove }: any) {
  const pct = Math.min(Math.max(value, 0), total)
  const angle = (pct / total) * 360
  const isWarn = warnAbove && pct > warnAbove

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="rounded-full p-1.5" style={{ background: colorLight, color }}>
              {icon}
            </span>
            {title}
          </span>
          {warnAbove && pct > warnAbove && (
            <span title={`${title} above ${warnAbove}%`}>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative h-32 w-32 mx-auto flex items-center justify-center">
          <svg width="128" height="128" viewBox="0 0 128 128">
            <circle
              cx="64" cy="64" r="54"
              fill="none" stroke={colorLight} strokeWidth="10"
            />
            <circle
              cx="64" cy="64" r="54"
              fill="none" stroke={color} strokeWidth="10"
              strokeDasharray={`${(pct / total) * 339.3} 339.3`}
              strokeLinecap="round"
              transform="rotate(-90 64 64)"
              style={{ transition: 'stroke-dasharray 500ms ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums" style={{ color }}>{subtitle}</span>
            {sublabel && <span className="text-[10px] text-muted-foreground">{sublabel}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
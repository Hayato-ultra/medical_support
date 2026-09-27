'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, BarChart, TrendingUp, DollarSign, Package, Users, Clock, Download, Calendar } from 'lucide-react'
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
  gray: '#9CA3AF',
  grayLight: '#E5E7EB',
}

export default function ReportsPage() {
  const { isLoading: authLoading, user } = useAuth()
  const [range, setRange] = useState<'today' | '7d' | '30d' | '90d'>('7d')
  const [reportType, setReportType] = useState<'overview' | 'orders' | 'revenue' | 'customers' | 'pharmacies' | 'riders'>('overview')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  async function fetchReport() {
    try {
      const res = await fetch(`/api/admin/reports?type=${reportType}&range=${range}`)
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error('Failed to load report:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchReport()
  }, [reportType, range])

  function fmt(n: number) {
    return n.toLocaleString('en-IN')
  }

  function rupees(n: number) {
    return '₹' + fmt(Math.round(n))
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold">Admin access required</h1>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">Generate and export business reports.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={reportType} onValueChange={(v) => setReportType(v as typeof reportType)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Report Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="orders">Orders Report</SelectItem>
              <SelectItem value="revenue">Revenue Report</SelectItem>
              <SelectItem value="customers">Customers Report</SelectItem>
              <SelectItem value="pharmacies">Pharmacies Report</SelectItem>
              <SelectItem value="riders">Riders Report</SelectItem>
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={(v) => setRange(v as typeof range)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5 flex items-start gap-4">
            <div className="rounded-full bg-teal-50 p-3 text-teal-700">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold tabular-nums">{data?.totalRevenue ? rupees(data.totalRevenue) : '&mdash;'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-start gap-4">
            <div className="rounded-full bg-amber-50 p-3 text-amber-700">
              <Package className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold tabular-nums">{data?.totalOrders?.toLocaleString('en-IN') ?? '&mdash;'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-start gap-4">
            <div className="rounded-full bg-green-50 p-3 text-green-700">
              <Users className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Active Customers</p>
              <p className="text-2xl font-bold tabular-nums">{data?.activeCustomers?.toLocaleString('en-IN') ?? '&mdash;'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-start gap-4">
            <div className="rounded-full bg-amber-50 p-3 text-amber-700">
              <Package className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Avg Order Value</p>
              <p className="text-2xl font-bold tabular-nums">{data?.avgOrderValue ? rupees(data.avgOrderValue) : '&mdash;'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5 text-amber-600" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data?.revenueTrend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.teal} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.teal} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grayLight} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke={COLORS.gray} />
                <YAxis tick={{ fontSize: 11 }} stroke={COLORS.gray} tickFormatter={(v) => '₹' + (v / 1000).toFixed(0) + 'k'} />
                <Tooltip formatter={(v: any) => v !== undefined ? rupees(v) : ''} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={COLORS.teal}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-teal-600" />
              Order Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data?.orderStatusDistribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="status"
                >
                  {data?.orderStatusDistribution?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS.teal} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => v !== undefined ? `${v} orders` : ''} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5 text-amber-600" />
            Top Medicines by Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Rank</th>
                  <th className="px-4 py-3 text-left font-medium">Medicine</th>
                  <th className="px-4 py-3 text-left font-medium">Units Sold</th>
                  <th className="px-4 py-3 text-left font-medium">Revenue</th>
                  <th className="px-4 py-3 text-left font-medium">Orders</th>
                </tr>
              </thead>
              <tbody>
                {data?.topMedicines?.slice(0, 10).map((m: any, i: number) => (
                  <tr key={m.name} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{i + 1}</td>
                    <td className="px-4 py-3">{m.name}</td>
                    <td className="px-4 py-3">{m.units?.toLocaleString('en-IN') ?? '0'}</td>
                    <td className="px-4 py-3">₹{m.revenue?.toLocaleString('en-IN') ?? '0'}</td>
                    <td className="px-4 py-3">{m.orders?.toLocaleString('en-IN') ?? '0'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function rupees(n: number) {
  return '₹' + n.toLocaleString('en-IN')
}
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Toggle } from '@/components/ui/toggle'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Settings, Bell, Shield, Database, Key, Globe, Mail, Save, AlertTriangle } from 'lucide-react'

type GeneralSettings = {
  siteName: string
  siteDescription: string
  contactEmail: string
  contactPhone: string
  address: string
  timezone: string
  currency: string
}

type NotificationSettings = {
  emailOrders: boolean
  emailPayments: boolean
  emailRefunds: boolean
  smsOrders: boolean
  smsDeliveries: boolean
  pushNotifications: boolean
}

type SecuritySettings = {
  twoFactorAuth: boolean
  sessionTimeout: number
  maxLoginAttempts: number
  passwordExpiry: number
  requireStrongPassword: boolean
}

type DatabaseSettings = {
  autoBackup: boolean
  backupFrequency: 'hourly' | 'daily' | 'weekly' | 'monthly'
  retentionDays: number
  encryptBackups: boolean
}

type APISettings = {
  rateLimit: number
  webhookUrl: string
  webhookSecret: string
  enableCors: boolean
}

type IntegrationSettings = {
  razorpayKeyId: string
  razorpayKeySecret: string
  twilioSid: string
  twilioToken: string
  twilioPhone: string
  firebaseKey: string
}

type Settings = {
  general: GeneralSettings
  notifications: NotificationSettings
  security: SecuritySettings
  database: DatabaseSettings
  api: APISettings
  integrations: IntegrationSettings
}

const defaultSettings: Settings = {
  general: {
    siteName: 'Mediconnect',
    siteDescription: 'Your trusted medicine delivery partner',
    contactEmail: 'support@medicalsupport.com',
    contactPhone: '+91 9876543210',
    address: '123 Medical Street, Health City, HC 110001',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
  },
  notifications: {
    emailOrders: true,
    emailPayments: true,
    emailRefunds: true,
    smsOrders: false,
    smsDeliveries: true,
    pushNotifications: true,
  },
  security: {
    twoFactorAuth: false,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordExpiry: 90,
    requireStrongPassword: true,
  },
  database: {
    autoBackup: true,
    backupFrequency: 'daily',
    retentionDays: 90,
    encryptBackups: true,
  },
  api: {
    rateLimit: 1000,
    webhookUrl: '',
    webhookSecret: '',
    enableCors: true,
  },
  integrations: {
    razorpayKeyId: '',
    razorpayKeySecret: '',
    twilioSid: '',
    twilioToken: '',
    twilioPhone: '',
    firebaseKey: '',
  },
}

export default function SettingsPage() {
  const { isLoading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [settings, setSettings] = useState<Settings>(defaultSettings)

  async function handleSave(section: string) {
    setLoading(true)
    setError('')
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError('Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  function updateGeneral(key: keyof GeneralSettings, value: string) {
    setSettings(prev => ({ ...prev, general: { ...prev.general, [key]: value } }))
  }

  function updateNotification(key: keyof NotificationSettings, value: boolean) {
    setSettings(prev => ({ ...prev, notifications: { ...prev.notifications, [key]: value } }))
  }

  function updateSecurity(key: keyof SecuritySettings, value: boolean | number) {
    setSettings(prev => ({ ...prev, security: { ...prev.security, [key]: value } }))
  }

  function updateDatabase(key: keyof DatabaseSettings, value: boolean | number | 'hourly' | 'daily' | 'weekly' | 'monthly') {
    setSettings(prev => ({ ...prev, database: { ...prev.database, [key]: value } }))
  }

  function updateIntegration(key: keyof IntegrationSettings, value: string) {
    setSettings(prev => ({ ...prev, integrations: { ...prev.integrations, [key]: value } }))
  }

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Settings className="h-10 w-10 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Configure application settings and preferences.</p>
        </div>
      </div>

      {saved && (
        <div className="rounded-md border border-green-300 bg-green-50 p-4 text-sm text-green-700 flex items-center gap-2" role="alert">
          <AlertTriangle className="h-4 w-4" />
          Settings saved successfully
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              General Settings
            </CardTitle>
            <CardDescription>Basic application information and contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={settings.general.siteName}
                  onChange={(e) => updateGeneral('siteName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteDescription">Site Description</Label>
                <Input
                  id="siteDescription"
                  value={settings.general.siteDescription}
                  onChange={(e) => updateGeneral('siteDescription', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={settings.general.contactEmail}
                  onChange={(e) => updateGeneral('contactEmail', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  value={settings.general.contactPhone}
                  onChange={(e) => updateGeneral('contactPhone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={settings.general.address}
                  onChange={(e) => updateGeneral('address', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={settings.general.timezone}
                  onChange={(e) => updateGeneral('timezone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={settings.general.currency}
                  onChange={(e) => updateGeneral('currency', e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => handleSave('general')} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                Save General Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Configure notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Email Notifications for New Orders</Label>
                  <p className="text-sm text-muted-foreground">Receive email when new orders are placed</p>
                </div>
                <Toggle
                  pressed={settings.notifications.emailOrders}
                  onPressedChange={(checked) => updateNotification('emailOrders', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Email Notifications for Payments</Label>
                  <p className="text-sm text-muted-foreground">Receive email when payments are received</p>
                </div>
                <Toggle
                  pressed={settings.notifications.emailPayments}
                  onPressedChange={(checked) => updateNotification('emailPayments', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Email Notifications for Refunds</Label>
                  <p className="text-sm text-muted-foreground">Receive email when refunds are requested</p>
                </div>
                <Toggle
                  pressed={settings.notifications.emailRefunds}
                  onPressedChange={(checked) => updateNotification('emailRefunds', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>SMS Notifications for Orders</Label>
                  <p className="text-sm text-muted-foreground">Receive SMS when new orders are placed</p>
                </div>
                <Toggle
                  pressed={settings.notifications.smsOrders}
                  onPressedChange={(checked) => updateNotification('smsOrders', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>SMS Notifications for Deliveries</Label>
                  <p className="text-sm text-muted-foreground">Receive SMS for delivery updates</p>
                </div>
                <Toggle
                  pressed={settings.notifications.smsDeliveries}
                  onPressedChange={(checked) => updateNotification('smsDeliveries', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Enable push notifications for the app</p>
                </div>
                <Toggle
                  pressed={settings.notifications.pushNotifications}
                  onPressedChange={(checked) => updateNotification('pushNotifications', checked)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => handleSave('notifications')} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                Save Notification Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>Configure security and authentication settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">Require 2FA for admin accounts</p>
                </div>
                <Toggle
                  pressed={settings.security.twoFactorAuth}
                  onPressedChange={(checked) => updateSecurity('twoFactorAuth', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Session Timeout (minutes)</Label>
                  <p className="text-sm text-muted-foreground">Auto-logout after inactivity</p>
                </div>
                <Input
                  type="number"
                  value={settings.security.sessionTimeout}
                  onChange={(e) => updateSecurity('sessionTimeout', parseInt(e.target.value) || 30)}
                  className="w-24"
                  min="5"
                  max="1440"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Max Login Attempts</Label>
                  <p className="text-sm text-muted-foreground">Lock account after failed attempts</p>
                </div>
                <Input
                  type="number"
                  value={settings.security.maxLoginAttempts}
                  onChange={(e) => updateSecurity('maxLoginAttempts', parseInt(e.target.value) || 5)}
                  className="w-24"
                  min="1"
                  max="10"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Password Expiry (days)</Label>
                  <p className="text-sm text-muted-foreground">Force password change after days</p>
                </div>
                <Input
                  type="number"
                  value={settings.security.passwordExpiry}
                  onChange={(e) => updateSecurity('passwordExpiry', parseInt(e.target.value) || 90)}
                  className="w-24"
                  min="30"
                  max="365"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Require Strong Passwords</Label>
                  <p className="text-sm text-muted-foreground">Enforce password complexity requirements</p>
                </div>
                <Toggle
                  pressed={settings.security.requireStrongPassword}
                  onPressedChange={(checked) => updateSecurity('requireStrongPassword', checked)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => handleSave('security')} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                Save Security Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database & Backups
            </CardTitle>
            <CardDescription>Configure database maintenance and backup settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Auto Backup</Label>
                  <p className="text-sm text-muted-foreground">Automatically backup database</p>
                </div>
                <Toggle
                  pressed={settings.database.autoBackup}
                  onPressedChange={(checked) => updateDatabase('autoBackup', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Backup Frequency</Label>
                  <p className="text-sm text-muted-foreground">How often to create backups</p>
                </div>
                <Select value={settings.database.backupFrequency} onValueChange={(v) => updateDatabase('backupFrequency', v as 'hourly' | 'daily' | 'weekly' | 'monthly')}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Retention Days</Label>
                  <p className="text-sm text-muted-foreground">Days to keep backups</p>
                </div>
                <Input
                  type="number"
                  value={settings.database.retentionDays}
                  onChange={(e) => updateDatabase('retentionDays', parseInt(e.target.value) || 90)}
                  className="w-24"
                  min="1"
                  max="365"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Encrypt Backups</Label>
                  <p className="text-sm text-muted-foreground">Encrypt backup files at rest</p>
                </div>
                <Toggle
                  pressed={settings.database.encryptBackups}
                  onPressedChange={(checked) => updateDatabase('encryptBackups', checked)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => handleSave('database')} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                Save Database Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API & Integrations
            </CardTitle>
            <CardDescription>Configure external service integrations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Razorpay</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="razorpayKeyId">Key ID</Label>
                  <Input
                    id="razorpayKeyId"
                    type="password"
                    value={settings.integrations.razorpayKeyId}
                    onChange={(e) => updateIntegration('razorpayKeyId', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="razorpayKeySecret">Key Secret</Label>
                  <Input
                    id="razorpayKeySecret"
                    type="password"
                    value={settings.integrations.razorpayKeySecret}
                    onChange={(e) => updateIntegration('razorpayKeySecret', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <div>
              <h3 className="text-lg font-medium mb-4">Twilio (SMS)</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="twilioSid">Account SID</Label>
                  <Input
                    id="twilioSid"
                    value={settings.integrations.twilioSid}
                    onChange={(e) => updateIntegration('twilioSid', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twilioToken">Auth Token</Label>
                  <Input
                    id="twilioToken"
                    type="password"
                    value={settings.integrations.twilioToken}
                    onChange={(e) => updateIntegration('twilioToken', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twilioPhone">From Phone Number</Label>
                  <Input
                    id="twilioPhone"
                    placeholder="+1xxxxxxxxxx"
                    value={settings.integrations.twilioPhone}
                    onChange={(e) => updateIntegration('twilioPhone', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <div>
              <h3 className="text-lg font-medium mb-4">Firebase</h3>
              <div className="space-y-2">
                <Label htmlFor="firebaseKey">Firebase Server Key</Label>
                <Input
                  id="firebaseKey"
                  type="password"
                  value={settings.integrations.firebaseKey}
                  onChange={(e) => updateIntegration('firebaseKey', e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => handleSave('integrations')} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                Save Integrations
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
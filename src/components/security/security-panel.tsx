/**
 * Security Panel Component
 * Comprehensive UI for 2FA, Sessions, and Security Settings
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import {
  Shield,
  Smartphone,
  Key,
  Monitor,
  MapPin,
  Clock,
  LogOut,
  AlertTriangle,
  CheckCircle,
  Copy,
  Loader2
} from 'lucide-react'
import { use2FA } from '@/hooks/use-2fa'
import { useSession } from '@/hooks/use-session'
import { useToast } from '@/hooks/use-toast'

interface SecurityPanelProps {
  userId: string
  userRole?: string
}

interface SessionInfo {
  id: string
  deviceName?: string
  ipAddress?: string
  location?: string
  lastActiveAt: string
  createdAt: string
  expiresAt: string
  isExpired: boolean
  isCurrent: boolean
}

export function SecurityPanel({ userId, userRole = 'user' }: SecurityPanelProps) {
  const { toast } = useToast()
  const twoFA = use2FA()
  const session = useSession()

  // Local state
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [sessionStats, setSessionStats] = useState({ total: 0, active: 0, expired: 0 })
  const [showEnable2FADialog, setShowEnable2FADialog] = useState(false)
  const [showDisable2FADialog, setShowDisable2FADialog] = useState(false)
  const [showBackupCodesDialog, setShowBackupCodesDialog] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [password, setPassword] = useState('')
  const [copiedCodes, setCopiedCodes] = useState(false)

  // Load sessions and 2FA status
  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([
        twoFA.getStatus(userId),
        session.getSessions().then(result => {
          setSessions(result.sessions)
          setSessionStats(result.stats)
        })
      ])
    }
    void loadInitialData()
  }, [userId])

  // Handle enable 2FA
  const handleEnable2FA = async () => {
    if (!password) {
      toast({
        title: 'Password required',
        description: 'Please enter your password to enable 2FA',
        variant: 'destructive'
      })
      return
    }

    const result = await twoFA.enable(userId, password)
    if (result.success) {
      setShowEnable2FADialog(true)
      setPassword('')
    } else {
      toast({
        title: 'Failed to enable 2FA',
        description: result.error || 'An error occurred',
        variant: 'destructive'
      })
    }
  }

  // Handle verify 2FA
  const handleVerify2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: 'Invalid code',
        description: 'Please enter a 6-digit code',
        variant: 'destructive'
      })
      return
    }

    const result = await twoFA.verify(userId, verificationCode)
    if (result.success) {
      setShowEnable2FADialog(false)
      setVerificationCode('')
      toast({
        title: '2FA Enabled',
        description: 'Two-factor authentication has been enabled successfully'
      })
    } else {
      toast({
        title: 'Verification failed',
        description: result.error || 'Invalid code',
        variant: 'destructive'
      })
    }
  }

  // Handle disable 2FA
  const handleDisable2FA = async () => {
    if (!verificationCode && !password) {
      toast({
        title: 'Verification required',
        description: 'Please enter a code or password',
        variant: 'destructive'
      })
      return
    }

    const success = verificationCode
      ? await twoFA.disable(userId, verificationCode, true)
      : await twoFA.disable(userId, password, false)

    if (success) {
      setShowDisable2FADialog(false)
      setVerificationCode('')
      setPassword('')
      toast({
        title: '2FA Disabled',
        description: 'Two-factor authentication has been disabled'
      })
    }
  }

  // Handle terminate session
  const handleTerminateSession = async (sessionId: string) => {
    const success = await session.terminateSession(sessionId)
    if (success) {
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      toast({
        title: 'Session terminated',
        description: 'The session has been terminated'
      })
    }
  }

  // Handle terminate all other sessions
  const handleTerminateOtherSessions = async () => {
    const count = await session.terminateOtherSessions()
    if (count > 0) {
      const result = await session.getSessions()
      setSessions(result.sessions)
      setSessionStats(result.stats)
      toast({
        title: 'Sessions terminated',
        description: `${count} other session(s) have been terminated`
      })
    }
  }

  // Copy backup codes
  const handleCopyBackupCodes = () => {
    if (twoFA.setupData.backupCodes.length > 0) {
      navigator.clipboard.writeText(twoFA.setupData.backupCodes.join('\n'))
      setCopiedCodes(true)
      toast({
        title: 'Copied',
        description: 'Backup codes copied to clipboard'
      })
    }
  }

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* 2FA Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Two-Factor Authentication</CardTitle>
            </div>
            <Badge variant={twoFA.status?.enabled ? 'default' : 'secondary'}>
              {twoFA.status?.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!twoFA.status?.enabled ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Two-factor authentication is currently disabled. Enable it to protect your account
                with an authenticator app like Google Authenticator or Authy.
              </p>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="max-w-xs"
                />
                <Button onClick={handleEnable2FA} disabled={twoFA.isEnabling}>
                  {twoFA.isEnabling ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Key className="h-4 w-4 mr-2" />
                  )}
                  Enable 2FA
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Two-factor authentication is enabled</span>
              </div>
              {twoFA.status.verifiedAt && (
                <p className="text-sm text-muted-foreground">
                  Enabled on {formatDate(twoFA.status.verifiedAt)}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowBackupCodesDialog(true)}
                >
                  <Key className="h-4 w-4 mr-2" />
                  View Backup Codes
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowDisable2FADialog(true)}
                >
                  Disable 2FA
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sessions Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" />
              <CardTitle>Active Sessions</CardTitle>
            </div>
            <Badge variant="outline">{sessionStats.active} active</Badge>
          </div>
          <CardDescription>
            Manage your active sessions across all devices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {sessions.map(s => (
                <div
                  key={s.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    s.isCurrent ? 'bg-primary/5 border-primary/20' : 'bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-background rounded-lg">
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{s.deviceName || 'Unknown Device'}</span>
                        {s.isCurrent && (
                          <Badge variant="default" className="text-xs">Current</Badge>
                        )}
                        {s.isExpired && (
                          <Badge variant="destructive" className="text-xs">Expired</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {s.ipAddress && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {s.ipAddress}
                          </span>
                        )}
                        {s.location && <span>{s.location}</span>}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Last active: {formatDate(s.lastActiveAt)}
                      </div>
                    </div>
                  </div>
                  {!s.isCurrent && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleTerminateSession(s.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              {sessions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Monitor className="h-12 w-12 mb-2" />
                  <p>No active sessions</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {sessionStats.active > 1 && (
            <>
              <Separator className="my-4" />
              <Button
                variant="outline"
                className="w-full"
                onClick={handleTerminateOtherSessions}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Log out all other sessions
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Enable 2FA Dialog */}
      <Dialog open={showEnable2FADialog} onOpenChange={setShowEnable2FADialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan this QR code with your authenticator app
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* QR Code */}
            {twoFA.setupData.qrCode && (
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg">
                  <img
                    src={twoFA.setupData.qrCode}
                    alt="2FA QR Code"
                    className="w-48 h-48"
                  />
                </div>
              </div>
            )}

            {/* Manual entry */}
            {twoFA.setupData.secret && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Or enter this code manually:
                </p>
                <code className="block p-2 bg-muted rounded text-sm font-mono">
                  {twoFA.setupData.secret}
                </code>
              </div>
            )}

            {/* Verification */}
            <div className="space-y-2">
              <Label htmlFor="verify-code">Enter verification code</Label>
              <Input
                id="verify-code"
                placeholder="000000"
                maxLength={6}
                value={verificationCode}
                onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            {/* Backup codes */}
            {twoFA.setupData.backupCodes.length > 0 && (
              <div className="space-y-2">
                <Label>Backup Codes (save these!)</Label>
                <div className="p-2 bg-muted rounded text-sm font-mono max-h-32 overflow-y-auto">
                  {twoFA.setupData.backupCodes.map((code, i) => (
                    <div key={i}>{code}</div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyBackupCodes}
                  className="w-full"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {copiedCodes ? 'Copied!' : 'Copy Codes'}
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnable2FADialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleVerify2FA} disabled={twoFA.isVerifying}>
              {twoFA.isVerifying && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Verify & Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable 2FA Dialog */}
      <AlertDialog open={showDisable2FADialog} onOpenChange={setShowDisable2FADialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Two-Factor Authentication</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the extra security layer from your account. Please verify
              your identity to continue.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="disable-code">Verification code or password</Label>
              <Input
                id="disable-code"
                placeholder="Enter 6-digit code or password"
                value={verificationCode || password}
                onChange={e => {
                  const val = e.target.value
                  if (/^\d*$/.test(val) && val.length <= 6) {
                    setVerificationCode(val)
                    setPassword('')
                  } else {
                    setPassword(val)
                    setVerificationCode('')
                  }
                }}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setVerificationCode('')
              setPassword('')
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisable2FA}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {twoFA.isDisabling && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Disable 2FA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Backup Codes Dialog */}
      <Dialog open={showBackupCodesDialog} onOpenChange={setShowBackupCodesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Backup Codes</DialogTitle>
            <DialogDescription>
              Use these codes to access your account if you lose your authenticator device.
              Each code can only be used once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span className="text-sm text-yellow-800 dark:text-yellow-200">
                Store these codes securely. They won&apos;t be shown again.
              </span>
            </div>

            {twoFA.setupData.backupCodes.length > 0 ? (
              <div className="p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {twoFA.setupData.backupCodes.map((code, i) => (
                    <div key={i} className="text-center">{code}</div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No backup codes available. Generate new ones below.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBackupCodesDialog(false)}>
              Close
            </Button>
            <Button onClick={() => twoFA.regenerateBackupCodes(userId, verificationCode)}>
              Generate New Codes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SecurityPanel

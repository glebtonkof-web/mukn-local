'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Shield,
  UserPlus,
  Key,
  MessageSquare,
  BarChart3,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';

// Types
interface Account {
  id: string;
  username?: string;
  phone?: string;
  platform: string;
  status: string;
}

interface ShadowAccount {
  id: string;
  primaryAccountId: string;
  shadowAccountId: string;
  triggerKeywords: string[];
  responseTemplates: string[];
  defensesCount: number;
  successCount: number;
  isActive: boolean;
  shadowAccount?: Account;
  primaryAccount?: Account;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  active: number;
}

export function ShadowAccountsPanel() {
  const [loading, setLoading] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Form state
  const [selectedPrimaryAccountId, setSelectedPrimaryAccountId] = useState<string>('');
  const [selectedShadowAccountId, setSelectedShadowAccountId] = useState<string>('');
  const [triggerKeywords, setTriggerKeywords] = useState('');
  const [responseTemplates, setResponseTemplates] = useState('');

  // Shadow accounts list
  const [shadowAccounts, setShadowAccounts] = useState<ShadowAccount[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0 });

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKeywords, setEditKeywords] = useState('');
  const [editTemplates, setEditTemplates] = useState('');

  // Load accounts
  useEffect(() => {
    loadAccounts();
  }, []);

  // Load shadow accounts when primary account changes
  useEffect(() => {
    if (selectedPrimaryAccountId) {
      loadShadowAccounts(selectedPrimaryAccountId);
    }
  }, [selectedPrimaryAccountId]);

  const loadAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      if (data.success && data.accounts) {
        setAccounts(data.accounts);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const loadShadowAccounts = async (primaryAccountId: string) => {
    setLoading('loading');
    try {
      const res = await fetch(`/api/advanced/shadow-accounts?primaryAccountId=${primaryAccountId}&includeInactive=true`);
      const data = await res.json();
      if (data.success) {
        setShadowAccounts(data.shadowAccounts);
        setStats({ total: data.total, active: data.active });
      }
    } catch (error) {
      console.error('Error loading shadow accounts:', error);
    } finally {
      setLoading(null);
    }
  };

  const createShadowAccount = async () => {
    if (!selectedPrimaryAccountId || !selectedShadowAccountId) {
      return;
    }

    setLoading('creating');
    try {
      const res = await fetch('/api/advanced/shadow-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryAccountId: selectedPrimaryAccountId,
          shadowAccountId: selectedShadowAccountId,
          triggerKeywords: triggerKeywords.split(',').map(k => k.trim()).filter(Boolean),
          responseTemplates: responseTemplates.split('\n').map(t => t.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (data.success) {
        loadShadowAccounts(selectedPrimaryAccountId);
        // Reset form
        setSelectedShadowAccountId('');
        setTriggerKeywords('');
        setResponseTemplates('');
      } else {
        alert(data.error || 'Failed to create shadow account');
      }
    } catch (error) {
      console.error('Error creating shadow account:', error);
    } finally {
      setLoading(null);
    }
  };

  const updateShadowAccount = async (id: string, updates: Partial<ShadowAccount>) => {
    setLoading('updating');
    try {
      const res = await fetch('/api/advanced/shadow-accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          ...updates,
        }),
      });
      const data = await res.json();
      if (data.success) {
        loadShadowAccounts(selectedPrimaryAccountId);
        setEditingId(null);
      }
    } catch (error) {
      console.error('Error updating shadow account:', error);
    } finally {
      setLoading(null);
    }
  };

  const deleteShadowAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shadow account?')) return;

    setLoading('deleting');
    try {
      const res = await fetch(`/api/advanced/shadow-accounts?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        loadShadowAccounts(selectedPrimaryAccountId);
      }
    } catch (error) {
      console.error('Error deleting shadow account:', error);
    } finally {
      setLoading(null);
    }
  };

  const recordDefense = async (id: string, success: boolean) => {
    try {
      const res = await fetch('/api/advanced/shadow-accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, success }),
      });
      const data = await res.json();
      if (data.success) {
        loadShadowAccounts(selectedPrimaryAccountId);
      }
    } catch (error) {
      console.error('Error recording defense:', error);
    }
  };

  // Filter available shadow accounts (not already bound)
  const availableShadowAccounts = accounts.filter(
    (a) => a.id !== selectedPrimaryAccountId && 
    !shadowAccounts.some((sa) => sa.shadowAccountId === a.id)
  );

  return (
    <div className="space-y-6">
      {/* Add Shadow Account Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-500" />
            Add Shadow Support Account
          </CardTitle>
          <CardDescription>
            Create a defense account that responds to negative comments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Primary Account Selection */}
          <div className="space-y-2">
            <Label>Primary Account</Label>
            <Select value={selectedPrimaryAccountId} onValueChange={setSelectedPrimaryAccountId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select primary account to protect..." />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.username || account.phone || account.id}
                    <Badge variant="outline" className="ml-2">{account.platform}</Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Shadow Account Selection */}
          <div className="space-y-2">
            <Label>Shadow Account</Label>
            <Select 
              value={selectedShadowAccountId} 
              onValueChange={setSelectedShadowAccountId}
              disabled={!selectedPrimaryAccountId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select shadow account for defense..." />
              </SelectTrigger>
              <SelectContent>
                {availableShadowAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.username || account.phone || account.id}
                    <Badge variant="outline" className="ml-2">{account.platform}</Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Trigger Keywords */}
          <div className="space-y-2">
            <Label>Trigger Keywords (comma-separated)</Label>
            <Textarea
              placeholder="развод, лохотрон, скам, обман, мошенники..."
              value={triggerKeywords}
              onChange={(e) => setTriggerKeywords(e.target.value)}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              These keywords will trigger defensive responses
            </p>
          </div>

          {/* Response Templates */}
          <div className="space-y-2">
            <Label>Response Templates (one per line)</Label>
            <Textarea
              placeholder={"Да я уже полгода с ними работаю, всё норм\nСам сначала попробуй, потом пиши\nУ меня всё вывели без проблем"}
              value={responseTemplates}
              onChange={(e) => setResponseTemplates(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Templates for automatic responses to negative comments
            </p>
          </div>

          {/* Create Button */}
          <Button
            onClick={createShadowAccount}
            disabled={!selectedPrimaryAccountId || !selectedShadowAccountId || loading === 'creating'}
            className="w-full"
          >
            {loading === 'creating' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Create Shadow Account
          </Button>
        </CardContent>
      </Card>

      {/* Defense Statistics */}
      {selectedPrimaryAccountId && shadowAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-500" />
              Defense Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted">
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Accounts</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-500/10">
                <p className="text-3xl font-bold text-green-600">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-blue-500/10">
                <p className="text-3xl font-bold text-blue-600">
                  {shadowAccounts.reduce((sum, sa) => sum + sa.defensesCount, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Defenses</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-amber-500/10">
                <p className="text-3xl font-bold text-amber-600">
                  {shadowAccounts.reduce((sum, sa) => sum + sa.successCount, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Successful</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shadow Accounts List */}
      {selectedPrimaryAccountId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-500" />
              Shadow Accounts
            </CardTitle>
            <CardDescription>
              Manage shadow accounts for {shadowAccounts.length} defense setup(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading === 'loading' ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : shadowAccounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No shadow accounts configured yet</p>
                <p className="text-sm">Add a shadow account above to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shadow Account</TableHead>
                    <TableHead>Keywords</TableHead>
                    <TableHead>Defenses</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shadowAccounts.map((sa) => (
                    <TableRow key={sa.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {sa.shadowAccount?.username || sa.shadowAccount?.phone || 'Unknown'}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {sa.shadowAccount?.platform}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {editingId === sa.id ? (
                          <Input
                            value={editKeywords}
                            onChange={(e) => setEditKeywords(e.target.value)}
                            placeholder="Keywords..."
                            className="min-w-[200px]"
                          />
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {sa.triggerKeywords.slice(0, 3).map((keyword, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                            {sa.triggerKeywords.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{sa.triggerKeywords.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{sa.defensesCount}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {sa.defensesCount > 0 
                              ? Math.round((sa.successCount / sa.defensesCount) * 100) 
                              : 0}%
                          </p>
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500"
                              style={{ 
                                width: `${sa.defensesCount > 0 
                                  ? (sa.successCount / sa.defensesCount) * 100 
                                  : 0}%` 
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={sa.isActive}
                          onCheckedChange={(checked) => 
                            updateShadowAccount(sa.id, { isActive: checked })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {editingId === sa.id ? (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  updateShadowAccount(sa.id, {
                                    triggerKeywords: editKeywords.split(',').map(k => k.trim()).filter(Boolean),
                                  });
                                }}
                                disabled={loading === 'updating'}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingId(null)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingId(sa.id);
                                  setEditKeywords(sa.triggerKeywords.join(', '));
                                  setEditTemplates(sa.responseTemplates.join('\n'));
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => recordDefense(sa.id, true)}
                              >
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteShadowAccount(sa.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Response Templates Card */}
      {selectedPrimaryAccountId && shadowAccounts.length > 0 && editingId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-cyan-500" />
              Edit Response Templates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={editTemplates}
              onChange={(e) => setEditTemplates(e.target.value)}
              placeholder="One template per line..."
              rows={5}
            />
            <Button
              onClick={() => {
                updateShadowAccount(editingId, {
                  responseTemplates: editTemplates.split('\n').map(t => t.trim()).filter(Boolean),
                });
              }}
              disabled={loading === 'updating'}
            >
              {loading === 'updating' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Save Templates
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ShadowAccountsPanel;

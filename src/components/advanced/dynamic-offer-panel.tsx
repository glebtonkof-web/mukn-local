'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
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
  ArrowRightLeft,
  TrendingDown,
  Clock,
  History,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';

// Types
interface Campaign {
  id: string;
  name: string;
  status: string;
  niche?: string;
}

interface Offer {
  id: string;
  name: string;
  niche?: string;
  payout: number;
  status: string;
}

interface DynamicOfferSettings {
  id: string;
  campaignId: string;
  primaryOfferId: string;
  backupOfferId: string | null;
  minReactionThreshold: number;
  checkAfterMinutes: number;
  currentOfferId: string | null;
  replacedCount: number;
  primaryOffer?: Offer;
  backupOffer?: Offer | null;
  currentOffer?: Offer | null;
  createdAt: string;
  updatedAt: string;
}

interface ReplacementHistory {
  id: string;
  replacedCount: number;
  createdAt: string;
  updatedAt: string;
}

export function DynamicOfferPanel() {
  const [loading, setLoading] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);

  // Form state
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [primaryOfferId, setPrimaryOfferId] = useState<string>('');
  const [backupOfferId, setBackupOfferId] = useState<string>('');
  const [reactionThreshold, setReactionThreshold] = useState(10);
  const [checkInterval, setCheckInterval] = useState(5);
  const [isEnabled, setIsEnabled] = useState(false);

  // Current settings
  const [currentSettings, setCurrentSettings] = useState<DynamicOfferSettings | null>(null);

  // Test metrics
  const [testComments, setTestComments] = useState(0);
  const [testClicks, setTestClicks] = useState(0);
  const [testConversions, setTestConversions] = useState(0);
  const [testMinutes, setTestMinutes] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Load campaigns and offers
  useEffect(() => {
    loadCampaigns();
    loadOffers();
  }, []);

  const loadCampaigns = async () => {
    try {
      const res = await fetch('/api/campaigns');
      const data = await res.json();
      if (data.success && data.campaigns) {
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  };

  const loadOffers = async () => {
    try {
      const res = await fetch('/api/offers');
      const data = await res.json();
      if (data.success && data.offers) {
        setOffers(data.offers);
      }
    } catch (error) {
      console.error('Error loading offers:', error);
    }
  };

  // Load settings when campaign changes
  useEffect(() => {
    if (selectedCampaignId) {
      loadSettings(selectedCampaignId);
    }
  }, [selectedCampaignId]);

  const loadSettings = async (campaignId: string) => {
    setLoading('loading');
    try {
      const res = await fetch(`/api/advanced/dynamic-offer?campaignId=${campaignId}`);
      const data = await res.json();
      if (data.success && data.settings) {
        setCurrentSettings(data.settings);
        setPrimaryOfferId(data.settings.primaryOfferId);
        setBackupOfferId(data.settings.backupOfferId || '');
        setReactionThreshold(data.settings.minReactionThreshold);
        setCheckInterval(data.settings.checkAfterMinutes);
        setIsEnabled(true);
      } else {
        // Reset form if no settings exist
        setCurrentSettings(null);
        setPrimaryOfferId('');
        setBackupOfferId('');
        setReactionThreshold(10);
        setCheckInterval(5);
        setIsEnabled(false);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(null);
    }
  };

  const saveSettings = async () => {
    if (!selectedCampaignId || !primaryOfferId) {
      return;
    }

    setLoading('saving');
    try {
      const res = await fetch('/api/advanced/dynamic-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: selectedCampaignId,
          primaryOfferId,
          backupOfferId: backupOfferId || null,
          minReactionThreshold: reactionThreshold,
          checkAfterMinutes: checkInterval,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentSettings(data.settings);
        setIsEnabled(true);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setLoading(null);
    }
  };

  const testMetrics = async () => {
    if (!selectedCampaignId) return;

    setLoading('testing');
    try {
      const res = await fetch('/api/advanced/dynamic-offer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: selectedCampaignId,
          metrics: {
            comments: testComments,
            clicks: testClicks,
            conversions: testConversions,
            minutesElapsed: testMinutes,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAnalysisResult(data.analysis);
        if (data.replaced) {
          // Reload settings to show new current offer
          loadSettings(selectedCampaignId);
        }
      }
    } catch (error) {
      console.error('Error testing metrics:', error);
    } finally {
      setLoading(null);
    }
  };

  const deleteSettings = async () => {
    if (!selectedCampaignId) return;

    setLoading('deleting');
    try {
      const res = await fetch(`/api/advanced/dynamic-offer?campaignId=${selectedCampaignId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setCurrentSettings(null);
        setIsEnabled(false);
        setPrimaryOfferId('');
        setBackupOfferId('');
        setReactionThreshold(10);
        setCheckInterval(5);
      }
    } catch (error) {
      console.error('Error deleting settings:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-blue-500" />
            Dynamic Offer Replacement
          </CardTitle>
          <CardDescription>
            Automatically switch to backup offer when primary underperforms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Campaign Selection */}
          <div className="space-y-2">
            <Label>Select Campaign</Label>
            <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a campaign..." />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                    <Badge variant="outline" className="ml-2">{campaign.status}</Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Offers Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Primary Offer</Label>
              <Select value={primaryOfferId} onValueChange={setPrimaryOfferId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select primary offer..." />
                </SelectTrigger>
                <SelectContent>
                  {offers.map((offer) => (
                    <SelectItem key={offer.id} value={offer.id}>
                      {offer.name}
                      <span className="ml-2 text-muted-foreground">
                        (${offer.payout})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Backup Offer</Label>
              <Select value={backupOfferId || 'none'} onValueChange={(v) => setBackupOfferId(v === 'none' ? '' : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select backup offer..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {offers
                    .filter((o) => o.id !== primaryOfferId)
                    .map((offer) => (
                      <SelectItem key={offer.id} value={offer.id}>
                        {offer.name}
                        <span className="ml-2 text-muted-foreground">
                          (${offer.payout})
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Thresholds */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between">
                <Label>Reaction Threshold</Label>
                <span className="font-bold text-sm">{reactionThreshold} clicks</span>
              </div>
              <Slider
                value={[reactionThreshold]}
                onValueChange={([value]) => setReactionThreshold(value)}
                max={100}
                min={1}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Minimum clicks before considering backup
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between">
                <Label>Check Interval</Label>
                <span className="font-bold text-sm">{checkInterval} minutes</span>
              </div>
              <Slider
                value={[checkInterval]}
                onValueChange={([value]) => setCheckInterval(value)}
                max={60}
                min={1}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Time before first check
              </p>
            </div>
          </div>

          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label>Enable Dynamic Replacement</Label>
              <p className="text-sm text-muted-foreground">
                Automatically switch offers based on performance
              </p>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={(checked) => {
                if (checked) {
                  saveSettings();
                } else {
                  deleteSettings();
                }
              }}
              disabled={!selectedCampaignId || !primaryOfferId}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={saveSettings}
              disabled={!selectedCampaignId || !primaryOfferId || loading === 'saving'}
            >
              {loading === 'saving' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Save Settings
            </Button>
            {currentSettings && (
              <Button
                variant="destructive"
                onClick={deleteSettings}
                disabled={loading === 'deleting'}
              >
                {loading === 'deleting' ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Disable
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Status Card */}
      {currentSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-green-500" />
              Current Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Primary Offer</p>
                <p className="font-medium">
                  {currentSettings.primaryOffer?.name || 'Not set'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Backup Offer</p>
                <p className="font-medium">
                  {currentSettings.backupOffer?.name || 'Not set'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Current Active</p>
                <div className="flex items-center gap-2">
                  <p className="font-medium">
                    {currentSettings.currentOffer?.name || currentSettings.primaryOffer?.name || 'Unknown'}
                  </p>
                  {currentSettings.currentOfferId === currentSettings.backupOfferId && (
                    <Badge variant="destructive" className="text-xs">BACKUP</Badge>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Replacements</p>
                <p className="font-medium text-2xl">{currentSettings.replacedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Metrics Card */}
      {currentSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-orange-500" />
              Test Metrics Analysis
            </CardTitle>
            <CardDescription>
              Simulate metrics to test replacement logic
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Comments</Label>
                <Input
                  type="number"
                  value={testComments}
                  onChange={(e) => setTestComments(parseInt(e.target.value) || 0)}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label>Clicks</Label>
                <Input
                  type="number"
                  value={testClicks}
                  onChange={(e) => setTestClicks(parseInt(e.target.value) || 0)}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label>Conversions</Label>
                <Input
                  type="number"
                  value={testConversions}
                  onChange={(e) => setTestConversions(parseInt(e.target.value) || 0)}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label>Minutes Elapsed</Label>
                <Input
                  type="number"
                  value={testMinutes}
                  onChange={(e) => setTestMinutes(parseInt(e.target.value) || 0)}
                  min={0}
                />
              </div>
            </div>

            <Button onClick={testMetrics} disabled={loading === 'testing'}>
              {loading === 'testing' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Analyze
            </Button>

            {analysisResult && (
              <div className="mt-4 p-4 rounded-lg bg-muted/50 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    {analysisResult.shouldCheck ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">Check Time</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {analysisResult.thresholdNotMet ? (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    <span className="text-sm">Threshold</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {analysisResult.lowConversion ? (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    <span className="text-sm">Conversion</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Conversion Rate:</span>
                    <p className="font-bold">{(analysisResult.conversionRate * 100).toFixed(2)}%</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Should Replace:</span>
                    <Badge variant={analysisResult.shouldReplace ? 'destructive' : 'default'}>
                      {analysisResult.shouldReplace ? 'YES' : 'NO'}
                    </Badge>
                  </div>
                </div>
                {analysisResult.reason && (
                  <div className="p-3 rounded bg-amber-500/10 border border-amber-500/20">
                    <p className="text-sm text-amber-600">{analysisResult.reason}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Replacement History */}
      {currentSettings && currentSettings.replacedCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-purple-500" />
              Replacement History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Total Replacements</TableHead>
                  <TableHead>Current Offer</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    {new Date(currentSettings.updatedAt).toLocaleString()}
                  </TableCell>
                  <TableCell>{currentSettings.replacedCount}</TableCell>
                  <TableCell>
                    {currentSettings.currentOffer?.name || 'Primary'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={currentSettings.currentOfferId === currentSettings.backupOfferId ? 'destructive' : 'default'}>
                      {currentSettings.currentOfferId === currentSettings.backupOfferId ? 'Using Backup' : 'Using Primary'}
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default DynamicOfferPanel;

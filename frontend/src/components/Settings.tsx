import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useToast, Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui';

export default function Settings() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [openBrowserOnStart, setOpenBrowserOnStart] = useState(false);
  const [drawingDirection, setDrawingDirection] = useState('ttb');
  const [drawingOrder, setDrawingOrder] = useState('linear');
  const [pixelSkip, setPixelSkip] = useState(1);
  const [accountCooldown, setAccountCooldown] = useState(20);
  const [purchaseCooldown, setPurchaseCooldown] = useState(5);
  const [accountCheckCooldown, setAccountCheckCooldown] = useState(0);
  const [dropletReserve, setDropletReserve] = useState(0);
  const [antiGriefStandby, setAntiGriefStandby] = useState(10);
  const [chargeThreshold, setChargeThreshold] = useState(50);
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [proxyRotationMode, setProxyRotationMode] = useState('sequential');
  const [logProxyUsage, setLogProxyUsage] = useState(false);

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/settings');
      const settings = response.data;
      setOpenBrowserOnStart(settings.openBrowserOnStart || false);
      setDrawingDirection(settings.drawingDirection || 'ttb');
      setDrawingOrder(settings.drawingOrder || 'linear');
      setPixelSkip(Number(settings.pixelSkip) || 1);
      setAccountCooldown((settings.accountCooldown || 20000) / 1000);
      setPurchaseCooldown((settings.purchaseCooldown || 5000) / 1000);
      setAccountCheckCooldown((settings.accountCheckCooldown || 0) / 1000);
      setDropletReserve(Number(settings.dropletReserve) || 0);
      setAntiGriefStandby((settings.antiGriefStandby || 600000) / 60000);
      setChargeThreshold(Math.round((settings.chargeThreshold || 0.5) * 100));
      setProxyEnabled(settings.proxyEnabled || false);
      setProxyRotationMode(settings.proxyRotationMode || 'sequential');
      setLogProxyUsage(settings.logProxyUsage || false);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await axios.post('/settings', {
        openBrowserOnStart,
        drawingDirection,
        drawingOrder,
        pixelSkip: pixelSkip,
        accountCooldown: accountCooldown * 1000,
        purchaseCooldown: purchaseCooldown * 1000,
        accountCheckCooldown: accountCheckCooldown * 1000,
        dropletReserve: dropletReserve,
        antiGriefStandby: antiGriefStandby * 60000,
        chargeThreshold: chargeThreshold / 100,
        proxyEnabled,
        proxyRotationMode,
        logProxyUsage,
      });
      success('Settings Saved', 'Your settings have been saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      showError('Save Failed', 'Failed to save settings. Please try again.');
    }
  };

  const toggleSection = (sectionId: string, isOpen: boolean) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !isOpen
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-4">Settings</h2>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 space-y-4">
          <Collapsible open={!collapsedSections.drawing} onOpenChange={(open) => toggleSection('drawing', open)}>
            <CollapsibleTrigger className="flex w-full items-center justify-between p-4 bg-secondary rounded-lg hover:bg-secondary/80">
              <h3 className="text-lg font-semibold">Drawing Settings</h3>
            </CollapsibleTrigger>
            <CollapsibleContent className="relative z-50">
              <div className="grid grid-cols-2 gap-4 p-4">
                <div className="space-y-2">
                  <label htmlFor="drawingDirectionSelect" className="text-sm font-medium">Drawing Direction</label>
                  <select
                    id="drawingDirectionSelect"
                    value={drawingDirection}
                    onChange={(e) => setDrawingDirection(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring relative z-50"
                  >
                    <option value="ttb">Top to Bottom</option>
                    <option value="btt">Bottom to Top</option>
                    <option value="ltr">Left to Right</option>
                    <option value="rtl">Right to Left</option>
                    <option value="center_out">Center Out</option>
                    <option value="random">Random Pixels</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="drawingOrderSelect" className="text-sm font-medium">Drawing Order</label>
                  <select
                    id="drawingOrderSelect"
                    value={drawingOrder}
                    onChange={(e) => setDrawingOrder(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring relative z-50"
                  >
                    <option value="linear">Linear</option>
                    <option value="randomColor">Random Color</option>
                    <option value="color">Color by Color</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="pixelSkipSelect" className="text-sm font-medium">Drawing Density</label>
                  <select
                    id="pixelSkipSelect"
                    value={pixelSkip}
                    onChange={(e) => setPixelSkip(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring relative z-50"
                  >
                    <option value="1">1/1 (Every Pixel)</option>
                    <option value="2">1/2</option>
                    <option value="4">1/4</option>
                    <option value="8">1/8</option>
                    <option value="16">1/16</option>
                    <option value="32">1/32</option>
                    <option value="64">1/64</option>
                    <option value="128">1/128</option>
                  </select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={!collapsedSections.startup} onOpenChange={(open) => toggleSection('startup', open)}>
            <CollapsibleTrigger className="flex w-full items-center justify-between p-4 bg-secondary rounded-lg hover:bg-secondary/80">
              <h3 className="text-lg font-semibold">Startup Settings</h3>
            </CollapsibleTrigger>
            <CollapsibleContent className="relative z-50">
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <input
                    id="openBrowserOnStart"
                    type="checkbox"
                    checked={openBrowserOnStart}
                    onChange={(e) => setOpenBrowserOnStart(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="openBrowserOnStart" className="text-sm">Open Browser on Startup</label>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={!collapsedSections.cooldown} onOpenChange={(open) => toggleSection('cooldown', open)}>
            <CollapsibleTrigger className="flex w-full items-center justify-between p-4 bg-secondary rounded-lg hover:bg-secondary/80">
              <h3 className="text-lg font-semibold">Cooldown Settings</h3>
            </CollapsibleTrigger>
            <CollapsibleContent className="relative z-50">
              <div className="grid grid-cols-2 gap-4 p-4">
                <div className="space-y-2">
                  <label htmlFor="accountCooldown" className="text-sm font-medium">Account Turn Cooldown</label>
                  <div className="relative">
                    <input
                      type="number"
                      id="accountCooldown"
                      min="0"
                      step="1"
                      value={accountCooldown}
                      onChange={(e) => setAccountCooldown(Number(e.target.value))}
                      className="w-full px-3 py-2 pr-12 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring relative z-50"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">s</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="purchaseCooldown" className="text-sm font-medium">Purchase Cooldown</label>
                  <div className="relative">
                    <input
                      type="number"
                      id="purchaseCooldown"
                      min="0"
                      step="1"
                      value={purchaseCooldown}
                      onChange={(e) => setPurchaseCooldown(Number(e.target.value))}
                      className="w-full px-3 py-2 pr-12 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring relative z-50"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">s</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="accountCheckCooldown" className="text-sm font-medium">Account Check Cooldown</label>
                  <div className="relative">
                    <input
                      type="number"
                      id="accountCheckCooldown"
                      min="0"
                      step="1"
                      value={accountCheckCooldown}
                      onChange={(e) => setAccountCheckCooldown(Number(e.target.value))}
                      className="w-full px-3 py-2 pr-12 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring relative z-50"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">s</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="antiGriefStandby" className="text-sm font-medium">Anti-Grief Standby</label>
                  <div className="relative">
                    <input
                      type="number"
                      id="antiGriefStandby"
                      min="1"
                      step="1"
                      value={antiGriefStandby}
                      onChange={(e) => setAntiGriefStandby(Number(e.target.value))}
                      className="w-full px-3 py-2 pr-14 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring relative z-50"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">min</span>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

        </div>

        <div className="flex-1 space-y-4">
          <Collapsible open={!collapsedSections.resource} onOpenChange={(open) => toggleSection('resource', open)}>
            <CollapsibleTrigger className="flex w-full items-center justify-between p-4 bg-secondary rounded-lg hover:bg-secondary/80">
              <h3 className="text-lg font-semibold">Resource Settings</h3>
            </CollapsibleTrigger>
            <CollapsibleContent className="relative z-50">
              <div className="grid grid-cols-2 gap-4 p-4">
                <div className="space-y-2">
                  <label htmlFor="dropletReserve" className="text-sm font-medium">Min. Droplets Before Buying</label>
                  <div className="relative">
                    <input
                      type="number"
                      id="dropletReserve"
                      min="0"
                      value={dropletReserve}
                      onChange={(e) => setDropletReserve(Number(e.target.value))}
                      className="w-full px-3 py-2 pr-16 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring relative z-50"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">drops</span>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={!collapsedSections.charge} onOpenChange={(open) => toggleSection('charge', open)}>
            <CollapsibleTrigger className="flex w-full items-center justify-between p-4 bg-secondary rounded-lg hover:bg-secondary/80">
              <h3 className="text-lg font-semibold">Charge Settings</h3>
            </CollapsibleTrigger>
            <CollapsibleContent className="relative z-50">
              <div className="p-4 space-y-2">
                <label htmlFor="chargeThreshold" className="text-sm font-medium">Charge Threshold</label>
                <div className="relative">
                  <input
                    type="number"
                    id="chargeThreshold"
                    min="0"
                    max="100"
                    value={chargeThreshold}
                    onChange={(e) => setChargeThreshold(Number(e.target.value))}
                    className="w-full px-3 py-2 pr-12 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring relative z-50"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={!collapsedSections.proxy} onOpenChange={(open) => toggleSection('proxy', open)}>
            <CollapsibleTrigger className="flex w-full items-center justify-between p-4 bg-secondary rounded-lg hover:bg-secondary/80">
              <h3 className="text-lg font-semibold">Proxy Settings</h3>
            </CollapsibleTrigger>
            <CollapsibleContent className="relative z-50">
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    id="proxyEnabled"
                    type="checkbox"
                    checked={proxyEnabled}
                    onChange={(e) => setProxyEnabled(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="proxyEnabled" className="text-sm">Enable Rotating Proxies</label>
                </div>
                {proxyEnabled && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Proxies are loaded from the <code className="bg-muted px-1 rounded">proxies.txt</code> file in your <code className="bg-muted px-1 rounded">/data</code> folder.
                      Add one proxy per line in the format <code className="bg-muted px-1 rounded">protocol://user:pass@host:port</code>.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <input
                          id="logProxyUsage"
                          type="checkbox"
                          checked={logProxyUsage}
                          onChange={(e) => setLogProxyUsage(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <label htmlFor="logProxyUsage" className="text-sm">Log Proxy Connections</label>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="proxyRotationMode" className="text-sm font-medium">Rotation Mode</label>
                        <select
                          id="proxyRotationMode"
                          value={proxyRotationMode}
                          onChange={(e) => setProxyRotationMode(e.target.value)}
                          className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring relative z-50"
                        >
                          <option value="sequential">Sequential</option>
                          <option value="random">Random</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={!collapsedSections.credits} onOpenChange={(open) => toggleSection('credits', open)}>
            <CollapsibleTrigger className="flex w-full items-center justify-between p-4 bg-secondary rounded-lg hover:bg-secondary/80">
              <h3 className="text-lg font-semibold">Original Credits</h3>
            </CollapsibleTrigger>
            <CollapsibleContent className="relative z-50">
              <div className="p-4">
                <p className="text-sm">
                  Original wplacer developed by:{' '}
                  <a href="https://github.com/luluwaffless" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    luluwaffless
                  </a>{' '}
                  and{' '}
                  <a href="https://github.com/JinxTheCatto" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    JinxTheCatto
                  </a>
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      <div className="flex gap-2 pt-4 justify-center">
        <button type="button" className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90" onClick={handleSaveSettings}>
          Save Settings
        </button>
        <button type="button" className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/80" onClick={() => navigate('/')}>
          Return
        </button>
      </div>
    </div>
  );
}

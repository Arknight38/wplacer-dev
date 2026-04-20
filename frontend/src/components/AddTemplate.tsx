import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useToast, Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui';

interface User {
  id: string;
  name: string;
}

export default function AddTemplate() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [templateName, setTemplateName] = useState('');
  const [tx, setTx] = useState('');
  const [ty, setTy] = useState('');
  const [px, setPx] = useState('');
  const [py, setPy] = useState('');
  const [users, setUsers] = useState<Record<string, User>>({});
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [canBuyMaxCharges, setCanBuyMaxCharges] = useState(false);
  const [canBuyCharges, setCanBuyCharges] = useState(false);
  const [antiGriefMode, setAntiGriefMode] = useState(false);
  const [eraseMode, setEraseMode] = useState(false);
  const [templateOutlineMode, setTemplateOutlineMode] = useState(false);
  const [templateSkipPaintedPixels, setTemplateSkipPaintedPixels] = useState(false);
  const [enableAutostart, setEnableAutostart] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [templateData, setTemplateData] = useState<{ width: number; height: number; data: number[][] } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleSelectAllUsers = () => {
    setSelectedUsers(new Set(Object.keys(users)));
  };

  const handleUserToggle = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!templateData) {
      showError('Missing Image', 'Please upload an image to create a template');
      return;
    }

    try {
      await axios.post('/template', {
        templateName,
        template: templateData,
        coords: [parseInt(tx), parseInt(ty), parseInt(px), parseInt(py)],
        userIds: Array.from(selectedUsers),
        canBuyMaxCharges,
        canBuyCharges,
        antiGriefMode,
        eraseMode,
        outlineMode: templateOutlineMode,
        skipPaintedPixels: templateSkipPaintedPixels,
        enableAutostart,
      });
      success('Template Added', 'Template has been added successfully');
      navigate('/templates');
    } catch (error) {
      console.error('Failed to add template:', error);
      showError('Add Failed', 'Failed to add template. Please try again.');
    }
  };

  const toggleSection = (sectionId: string, isOpen: boolean) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !isOpen
    }));
  };

  const fetchOverlayCoords = async () => {
    try {
      const response = await axios.get('/overlay/coords');
      if (response.data.coords) {
        const { worldX, worldY } = response.data.coords;
        // Convert world coordinates to template coordinates
        const tileX = Math.floor(worldX / 1000);
        const tileY = Math.floor(worldY / 1000);
        const pixelX = worldX % 1000;
        const pixelY = worldY % 1000;
        setTx(tileX.toString());
        setTy(tileY.toString());
        setPx(pixelX.toString());
        setPy(pixelY.toString());
        success('Coordinates Fetched', `Overlay anchor: world(${worldX}, ${worldY})`);
      } else {
        showError('No Coordinates', 'No overlay coordinates available. Click on the canvas in wplace.live first.');
      }
    } catch (error) {
      console.error('Failed to fetch overlay coords:', error);
      showError('Fetch Failed', 'Failed to fetch overlay coordinates');
    }
  };

  const openWplace = () => {
    window.open('https://wplace.live/', '_blank');
  };

  // Color palette from backend constants
  const colorPalette: Record<string, number> = {
    '0,0,0': 1,
    '60,60,60': 2,
    '120,120,120': 3,
    '210,210,210': 4,
    '255,255,255': 5,
    '96,0,24': 6,
    '237,28,36': 7,
    '255,127,39': 8,
    '246,170,9': 9,
    '249,221,59': 10,
    '255,250,188': 11,
    '14,185,104': 12,
    '19,230,123': 13,
    '135,255,94': 14,
    '12,129,110': 15,
    '16,174,166': 16,
    '19,225,190': 17,
    '40,80,158': 18,
    '64,147,228': 19,
    '96,247,242': 20,
    '107,80,246': 21,
    '153,177,251': 22,
    '120,12,153': 23,
    '170,56,185': 24,
    '224,159,249': 25,
    '203,0,122': 26,
    '236,31,128': 27,
    '243,141,169': 28,
    '104,70,52': 29,
    '149,104,42': 30,
    '248,178,119': 31,
    '170,170,170': 32,
    '165,14,30': 33,
    '250,128,114': 34,
    '228,92,26': 35,
    '214,181,148': 36,
    '156,132,49': 37,
    '197,173,49': 38,
    '232,212,95': 39,
    '74,107,58': 40,
    '90,148,74': 41,
    '132,197,115': 42,
    '15,121,159': 43,
    '187,250,242': 44,
    '125,199,255': 45,
    '77,49,184': 46,
    '74,66,132': 47,
    '122,113,196': 48,
    '181,174,241': 49,
    '219,164,99': 50,
    '209,128,81': 51,
    '255,197,165': 52,
    '155,82,73': 53,
    '209,128,120': 54,
    '250,182,164': 55,
    '123,99,82': 56,
    '156,132,107': 57,
    '51,57,65': 58,
    '109,117,141': 59,
    '179,185,209': 60,
    '109,100,63': 61,
    '148,140,107': 62,
    '205,197,158': 63,
  };

  // Find nearest color in palette using Euclidean distance
  const findNearestColor = (r: number, g: number, b: number): number => {
    let minDistance = Infinity;
    let nearestId = 0; // 0 = transparent

    for (const [rgbStr, id] of Object.entries(colorPalette)) {
      const [pr, pg, pb] = rgbStr.split(',').map(Number);
      const distance = Math.sqrt(
        Math.pow(r - pr, 2) +
        Math.pow(g - pg, 2) +
        Math.pow(b - pb, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestId = id;
      }
    }

    return nearestId;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            showError('Processing Error', 'Failed to process image');
            setIsProcessing(false);
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data: number[][] = [];

          for (let y = 0; y < canvas.height; y++) {
            const row: number[] = [];
            for (let x = 0; x < canvas.width; x++) {
              const i = (y * canvas.width + x) * 4;
              const r = imageData.data[i];
              const g = imageData.data[i + 1];
              const b = imageData.data[i + 2];
              const a = imageData.data[i + 3];

              // Treat transparent pixels as 0
              if (a < 128) {
                row.push(0);
              } else {
                row.push(findNearestColor(r, g, b));
              }
            }
            data.push(row);
          }

          setTemplateData({ width: canvas.width, height: canvas.height, data });
          setUploadedImage(event.target?.result as string);
          setIsProcessing(false);
          success('Image Processed', `Successfully processed ${canvas.width}x${canvas.height} image`);
        };
        img.onerror = () => {
          showError('Processing Error', 'Failed to load image');
          setIsProcessing(false);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to process image:', error);
      showError('Processing Error', 'Failed to process image');
      setIsProcessing(false);
    }
  };

  const handleClearImage = () => {
    setUploadedImage(null);
    setTemplateData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-4">Add Template</h2>
      <div className="bg-secondary/20 border border-secondary rounded-lg p-4 mb-6">
        <b>Tip:</b> Upload an image and it will be automatically converted to wplace colors. For advanced color control, you can also use the{' '}
        <a href="https://pepoafonso.github.io/color_converter_wplace/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          wplace color converter
        </a>{' '}
        tool.
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-4 mb-4">
          <div className="p-4 space-y-2 bg-secondary/20 border border-secondary rounded-lg">
            <label htmlFor="templateName" className="text-sm font-medium">Template Name</label>
            <input
              type="text"
              id="templateName"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Insert a catchy name here"
              required
              className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring relative z-50"
            />
          </div>

          <div className="p-4 space-y-3 bg-secondary/20 border border-secondary rounded-lg">
            <label className="text-sm font-medium">Image Upload</label>

            {!uploadedImage ? (
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                />
                <div className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-muted-foreground/30 rounded-lg bg-card/50 hover:bg-accent/50 hover:border-primary/50 transition-all group">
                  <img
                    src="/icons/upload.svg"
                    alt=""
                    className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors"
                    style={{ filter: 'invert(1)' }}
                  />
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      Click to upload image
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG, GIF up to 10MB
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative group">
                  <img
                    src={uploadedImage}
                    alt="Uploaded template"
                    className="max-w-full h-auto max-h-48 object-contain border border-border rounded-lg bg-card"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="flex items-center gap-2 px-3 py-1.5 bg-destructive text-destructive-foreground rounded-md text-sm font-medium hover:bg-destructive/90 transition-colors"
                    >
                      <img
                        src="/icons/remove.svg"
                        alt=""
                        className="w-4 h-4"
                        style={{ filter: 'invert(1)' }}
                      />
                      Remove
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  {templateData && (
                    <p className="text-muted-foreground">
                      Size: {templateData.width}x{templateData.height} pixels
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleClearImage}
                    className="text-destructive hover:text-destructive/80 font-medium"
                  >
                    Clear Image
                  </button>
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Processing image...
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 space-y-4">
            <Collapsible open={!collapsedSections.coordinates} onOpenChange={(open) => toggleSection('coordinates', open)}>
              <CollapsibleTrigger className="flex w-full items-center justify-between p-4 bg-secondary rounded-lg hover:bg-secondary/80">
                <h3 className="text-lg font-semibold">Coordinates</h3>
              </CollapsibleTrigger>
              <CollapsibleContent className="relative z-50">
                <div className="p-4 space-y-2">
                  <p className="text-sm text-muted-foreground mb-4">Ctrl-V anywhere to paste pin coordinates or a list of 4 numbers</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="tx" className="text-sm font-medium">Template X (tx)</label>
                      <input
                        type="number"
                        id="tx"
                        value={tx}
                        onChange={(e) => setTx(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring relative z-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="ty" className="text-sm font-medium">Template Y (ty)</label>
                      <input
                        type="number"
                        id="ty"
                        value={ty}
                        onChange={(e) => setTy(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring relative z-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="px" className="text-sm font-medium">Pixel X (px)</label>
                      <input
                        type="number"
                        id="px"
                        value={px}
                        onChange={(e) => setPx(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring relative z-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="py" className="text-sm font-medium">Pixel Y (py)</label>
                      <input
                        type="number"
                        id="py"
                        value={py}
                        onChange={(e) => setPy(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring relative z-50"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      onClick={fetchOverlayCoords}
                      className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      Fetch Overlay Coords
                    </button>
                    <button
                      type="button"
                      onClick={openWplace}
                      className="flex-1 px-3 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80 transition-colors"
                    >
                      Open wplace.live
                    </button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible open={!collapsedSections.charge} onOpenChange={(open) => toggleSection('charge', open)}>
              <CollapsibleTrigger className="flex w-full items-center justify-between p-4 bg-secondary rounded-lg hover:bg-secondary/80">
                <h3 className="text-lg font-semibold">Charge Settings</h3>
              </CollapsibleTrigger>
              <CollapsibleContent className="relative z-50">
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      id="canBuyMaxCharges"
                      type="checkbox"
                      checked={canBuyMaxCharges}
                      onChange={(e) => setCanBuyMaxCharges(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="canBuyMaxCharges" className="text-sm">Buy Max Charge Upgrades</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="canBuyCharges"
                      type="checkbox"
                      checked={canBuyCharges}
                      onChange={(e) => setCanBuyCharges(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="canBuyCharges" className="text-sm">Buy Paint Charges</label>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible open={!collapsedSections.protection} onOpenChange={(open) => toggleSection('protection', open)}>
              <CollapsibleTrigger className="flex w-full items-center justify-between p-4 bg-secondary rounded-lg hover:bg-secondary/80">
                <h3 className="text-lg font-semibold">Protection Settings</h3>
              </CollapsibleTrigger>
              <CollapsibleContent className="relative z-50">
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <input
                      id="antiGriefMode"
                      type="checkbox"
                      checked={antiGriefMode}
                      onChange={(e) => setAntiGriefMode(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="antiGriefMode" className="text-sm">Enable Anti-Grief Mode</label>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="flex-1 space-y-4">
            <Collapsible open={!collapsedSections.users} onOpenChange={(open) => toggleSection('users', open)}>
              <CollapsibleTrigger className="flex w-full items-center justify-between p-4 bg-secondary rounded-lg hover:bg-secondary/80">
                <h3 className="text-lg font-semibold">Users</h3>
              </CollapsibleTrigger>
              <CollapsibleContent className="relative z-50">
                <div className="p-4 space-y-4">
                  <div id="userSelectList" className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-md p-3">
                    {Object.entries(users).map(([id, user]) => (
                      <div key={id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`user-${id}`}
                          checked={selectedUsers.has(id)}
                          onChange={() => handleUserToggle(id)}
                          className="w-4 h-4"
                        />
                        <label htmlFor={`user-${id}`} className="text-sm cursor-pointer">{user.name}#{id}</label>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={handleSelectAllUsers} className="flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 text-sm">
                    <img src="/icons/manageUsers.svg" alt="" className="w-4 h-4" />
                    Select All
                  </button>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible open={!collapsedSections.paint} onOpenChange={(open) => toggleSection('paint', open)}>
              <CollapsibleTrigger className="flex w-full items-center justify-between p-4 bg-secondary rounded-lg hover:bg-secondary/80">
                <h3 className="text-lg font-semibold">Paint Settings</h3>
              </CollapsibleTrigger>
              <CollapsibleContent className="relative z-50">
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      id="eraseMode"
                      type="checkbox"
                      checked={eraseMode}
                      onChange={(e) => setEraseMode(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="eraseMode" className="text-sm">Paint Transparent Pixels</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="templateOutlineMode"
                      type="checkbox"
                      checked={templateOutlineMode}
                      onChange={(e) => setTemplateOutlineMode(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="templateOutlineMode" className="text-sm">Enable Outline Mode</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="templateSkipPaintedPixels"
                      type="checkbox"
                      checked={templateSkipPaintedPixels}
                      onChange={(e) => setTemplateSkipPaintedPixels(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="templateSkipPaintedPixels" className="text-sm">Skip Others' Painted Pixels</label>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible open={!collapsedSections.automation} onOpenChange={(open) => toggleSection('automation', open)}>
              <CollapsibleTrigger className="flex w-full items-center justify-between p-4 bg-secondary rounded-lg hover:bg-secondary/80">
                <h3 className="text-lg font-semibold">Automation Settings</h3>
              </CollapsibleTrigger>
              <CollapsibleContent className="relative z-50">
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <input
                      id="enableAutostart"
                      type="checkbox"
                      checked={enableAutostart}
                      onChange={(e) => setEnableAutostart(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="enableAutostart" className="text-sm">Enable Autostart</label>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        <div className="flex gap-2 pt-4 justify-center">
          <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90">
            Add Template
          </button>
          <button type="button" className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/80" onClick={() => navigate('/templates')}>
            Return
          </button>
        </div>
      </form>
    </div>
  );
}

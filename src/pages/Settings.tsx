import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Church,
  Bell,
  Palette,
  Database,
  Upload,
  Download,
  Link,
  ExternalLink,
  CheckCircle,
} from "lucide-react";
import { useThemeMode } from "@/context/ThemeContext";

const Settings = () => {
  const { theme, setTheme } = useThemeMode();
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-description">
          Configure the DawaSom vulnerability dashboard preferences
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Alerts</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          {/* Organization Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Church className="h-5 w-5" />
                Organization Details
              </CardTitle>
              <CardDescription>Basic information about the Nabad Mobile Hub deployment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Organization Name</Label>
                  <Input defaultValue="DawaSom" />
                </div>
                <div className="space-y-2">
                  <Label>Program Name</Label>
                  <Input defaultValue="Nabad Mobile Hub" />
                </div>
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input defaultValue="info@dawasom.org" type="email" />
                </div>
                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  <Input defaultValue="+252 xx xxx xxxx" type="tel" />
                </div>
              </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input defaultValue="Somalia" />
                </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>Align the UI to DawaSom branding and map style</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium">Theme</p>
                  <p className="text-sm text-muted-foreground">Light / Dark / follow system</p>
                </div>
                <Select defaultValue={theme} onValueChange={(val) => setTheme(val as "light" | "dark" | "system")}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="font-medium">Primary color</p>
                  <div className="flex items-center gap-3">
                    <Input type="color" defaultValue="#4CAF50" className="w-24 h-10 p-1" />
                    <p className="text-sm text-muted-foreground">Used for buttons, highlights, and CVI emphasis</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="font-medium">Accent color</p>
                  <div className="flex items-center gap-3">
                    <Input type="color" defaultValue="#F1A93C" className="w-24 h-10 p-1" />
                    <p className="text-sm text-muted-foreground">Used for alerts and CTA chips</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium">Map base style</p>
                  <p className="text-sm text-muted-foreground">Choose the MapLibre basemap the CVI uses</p>
                </div>
                <Select defaultValue="positron">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positron">Light (CARTO Positron)</SelectItem>
                    <SelectItem value="dark-matter">Dark (CARTO Dark Matter)</SelectItem>
                    <SelectItem value="osm">OSM Standard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium">Compact Mode</p>
                  <p className="text-sm text-muted-foreground">Reduce padding for field laptops</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Configure when and how you receive alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium">Displacement Surge Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Notify when IOM-DTM reports &gt;15% new arrivals in 14 days
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium">Penta3 Coverage Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Alert when Penta3 drops below 50% in any district
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium">Community SMS (CDMC)</p>
                  <p className="text-sm text-muted-foreground">
                    Ping when critical protection alerts arrive
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium">Weekly Summary Email</p>
                  <p className="text-sm text-muted-foreground">
                    Receive a weekly digest of CVI, arrivals, and safety overrides
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                External Integrations
              </CardTitle>
              <CardDescription>Connect with other church systems</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  name: "DHIS2 (MoH)",
                  description: "Pull Penta3 coverage and GAM prevalence every 14 days",
                  connected: true,
                },
                {
                  name: "IOM-DTM ETT",
                  description: "Ingest displacement arrivals (14d) for CVI",
                  connected: true,
                },
                {
                  name: "CDMC SMS (DAWA CFRM)",
                  description: "Stream community protection alerts for ground-truthing",
                  connected: true,
                },
                {
                  name: "MapLibre / CARTO",
                  description: "Basemap tiles for CVI choropleth",
                  connected: true,
                },
              ].map((integration) => (
                <div
                  key={integration.name}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{integration.name}</p>
                      {integration.connected && (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{integration.description}</p>
                  </div>
                  <Button variant={integration.connected ? "outline" : "default"} size="sm">
                    {integration.connected ? "Configure" : "Connect"}
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Management
              </CardTitle>
              <CardDescription>Import, export, and manage your data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg border space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Upload className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Import Data</p>
                    <p className="text-sm text-muted-foreground">
                      Upload operational datasets from CSV or Excel files
                    </p>
                  </div>
                </div>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
              </div>

              <div className="p-4 rounded-lg border space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <Download className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="font-medium">Export All Data</p>
                    <p className="text-sm text-muted-foreground">
                      Download a complete backup of all records
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">Export as CSV</Button>
                  <Button variant="outline">Export as Excel</Button>
                </div>
              </div>

              <Separator />

              <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5 space-y-3">
                <p className="font-medium text-destructive">Danger Zone</p>
                <p className="text-sm text-muted-foreground">
                  These actions are irreversible. Please proceed with caution.
                </p>
                <Button variant="destructive" size="sm">
                  Clear All Test Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;

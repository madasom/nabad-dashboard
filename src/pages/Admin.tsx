import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  UserPlus,
  Lock,
  FileText,
  Eye,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Info,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Link as LinkIcon, FilePlus, Plus } from "lucide-react";
import { useImportsData } from "@/hooks/useImportsData";
import { Card as UICard, CardContent as UICardContent } from "@/components/ui/card";
import { useForms, useCreateForm, useUpdateForm } from "@/hooks/useForms";
import { useDeleteForm } from "@/hooks/useDeleteForm";
import { useUsers } from "@/hooks/useUsers";
import { useSitesData } from "@/hooks/useSitesData";
import { useAlertsData } from "@/hooks/useAlertsData";

const Admin = () => {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadPhase, setUploadPhase] = useState<string | null>(null);
  const importsQuery = useImportsData();
  const formsQuery = useForms();
  const createForm = useCreateForm();
  const updateForm = useUpdateForm();
  const deleteForm = useDeleteForm();
  const usersQuery = useUsers();
  const sitesQuery = useSitesData();
  const alertsQuery = useAlertsData();
  const [formTitle, setFormTitle] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formHeaderImage, setFormHeaderImage] = useState("");
  const [formFields, setFormFields] = useState<{ name: string; label: string; type?: string; required?: boolean; hidden?: boolean; defaultValue?: string; section?: string; options?: string[] }[]>([
    { name: "site", label: "site", type: "text", required: true, hidden: false, section: undefined },
    { name: "message", label: "message", type: "textarea", required: true, hidden: false, section: undefined },
  ]);
  const [sections, setSections] = useState<string[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragSection, setDragSection] = useState<string>("__nosection");
  const [exporting, setExporting] = useState(false);

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const downloadBlob = (content: string, filename: string, type = "text/csv") => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    setFormSlug(slugify(formTitle));
  }, [formTitle]);

  const handleDrop = (targetSection: string, targetIdx?: number) => {
    if (dragIndex === null) return;
    const sectionKey = targetSection || "__nosection";
    setFormFields((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(dragIndex, 1);
      moved.section = sectionKey === "__nosection" ? undefined : sectionKey;

      // insert after last item of that section, or at end
      let insertAt = copy.length;
      copy.forEach((f, idx) => {
        const s = f.section ?? "__nosection";
        if (s === sectionKey) insertAt = idx + 1;
      });
      if (typeof targetIdx === "number") insertAt = targetIdx;
      copy.splice(insertAt, 0, moved);
      return copy;
    });
    setDragIndex(null);
    setDragSection("__nosection");
  };

  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [previewForm, setPreviewForm] = useState<any | null>(null);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
      const form = new FormData();
      form.append("file", file);
      return await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${apiUrl}/api/sites/import`);
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.timeout = 600000; // 10 minutes for large XLSX
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(pct);
            setUploadPhase("Uploading file");
          }
        };
        xhr.upload.onload = () => {
          // upload finished, now server is processing
            setUploadPhase("Processing on server");
            setUploadProgress(null);
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const json = JSON.parse(xhr.responseText);
              resolve(json);
            } catch (e) {
              reject(new Error("Invalid server response"));
            }
          } else {
            reject(new Error(xhr.responseText || "Import failed"));
          }
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.ontimeout = () => reject(new Error("Request timed out"));
        xhr.send(form);
      });
    },
    onSuccess: (data: any) => {
      // Queue-based flow: backend returns { jobId } immediately. If a synchronous
      // import count ever comes back, use it; otherwise show the queued message.
      queryClient.invalidateQueries({ queryKey: ["imports"] });
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      const description = typeof data?.imported === "number"
        ? `Imported ${data.imported} rows and refreshed dashboard.`
        : data?.jobId
          ? `Import queued (job ${data.jobId}). Processing will update the dashboard automatically.`
          : "Import queued. Processing will update the dashboard automatically.";
      toast({ title: "Import queued", description });
      setUploadProgress(null);
      setUploadPhase(null);
      importsQuery.refetch();
    },
    onError: (err: any) => {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
      setUploadProgress(null);
      setUploadPhase(null);
      importsQuery.refetch();
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">DawaSom — Admin & Access Control</h1>
        <p className="page-description">
          Manage DawaSom team access, roles, and data privacy for the Nabad Mobile Hub
        </p>
      </div>

      <Tabs defaultValue="team" className="space-y-6">
        <TabsList>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            Team Members
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-2">
            <Lock className="h-4 w-4" />
            Data Privacy
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2">
            <Upload className="h-4 w-4" />
            Data Import
          </TabsTrigger>
          <TabsTrigger value="forms" className="gap-2">
            <FilePlus className="h-4 w-4" />
            Community Forms
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <FileText className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{usersQuery.data?.length ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Total Members</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-success/10">
                    <CheckCircle className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{usersQuery.data?.length ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Active Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-muted/50">
                    <Info className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">1</p>
                    <p className="text-sm text-muted-foreground">Role tier</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Manage who has access to the dashboard</CardDescription>
              </div>
              <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>Send an invitation to join the dashboard</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input placeholder="name@oxfam.org" type="email" />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select defaultValue="field">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Platform Admin</SelectItem>
                          <SelectItem value="ops">Operations Lead</SelectItem>
                          <SelectItem value="analyst">Data Analyst</SelectItem>
                          <SelectItem value="field">Field Team</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => setInviteDialogOpen(false)}>Send Invite</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(usersQuery.data ?? []).map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>{member.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{member.email}</TableCell>
                      <TableCell>
                        <Badge variant="success">
                          active
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Exports</CardTitle>
              <CardDescription>Download live data snapshots (no static placeholders).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  disabled={exporting || sitesQuery.isLoading}
                  onClick={() => {
                    if (!sitesQuery.data) return;
                    setExporting(true);
                    const rows = sitesQuery.data.map((s) => ({
                      name: s.name,
                      district: s.district,
                      households: s.households,
                      lat: s.lat,
                      lon: s.lon,
                      penta3: s.penta3Coverage,
                      gam: s.gam,
                      arrivals14d: s.newArrivals14d,
                    }));
                    const csv =
                      "name,district,households,lat,lon,penta3,gam,arrivals14d\n" +
                      rows
                        .map((r) =>
                          [
                            r.name,
                            r.district,
                            r.households,
                            r.lat,
                            r.lon,
                            r.penta3,
                            r.gam,
                            r.arrivals14d,
                          ]
                            .map((v) => `"${v ?? ""}"`)
                            .join(",")
                        )
                        .join("\n");
                    downloadBlob(csv, `sites_${Date.now()}.csv`);
                    setExporting(false);
                  }}
                >
                  Export Sites (CSV)
                </Button>

                <Button
                  variant="outline"
                  disabled={exporting || alertsQuery.isLoading}
                  onClick={() => {
                    if (!alertsQuery.data) return;
                    setExporting(true);
                    const csv =
                      "id,siteName,district,category,severity,message,reportedAt\n" +
                      alertsQuery.data
                        .map((a) =>
                          [a.id, a.siteName ?? a.site, a.district, a.category, a.severity, a.message, a.reportedAt]
                            .map((v) => `"${(v ?? "").toString().replace(/\"/g, '""')}"`)
                            .join(",")
                        )
                        .join("\n");
                    downloadBlob(csv, `alerts_${Date.now()}.csv`);
                    setExporting(false);
                  }}
                >
                  Export Alerts (CSV)
                </Button>

                <Button
                  variant="outline"
                  disabled={exporting || !formsQuery.data}
                  onClick={async () => {
                    if (!formsQuery.data) return;
                    setExporting(true);
                    const json = JSON.stringify(formsQuery.data, null, 2);
                    downloadBlob(json, `forms_${Date.now()}.json`, "application/json");
                    setExporting(false);
                  }}
                >
                  Export Forms (JSON)
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Exports use live API data only; nothing renders from static files.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Data Privacy & Audit
              </CardTitle>
              <CardDescription>Controls for PII, field redactions, and donor audit readiness</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Redact beneficiary PII</p>
                  <p className="text-sm text-muted-foreground">Masks names/contacts in exports and screenshots.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Geo-blur sensitive sites</p>
                  <p className="text-sm text-muted-foreground">Offsets GPS for protection risks (CDMC alerts).</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Require 2FA for deployments</p>
                  <p className="text-sm text-muted-foreground">Deployment approvals must be verified.</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Audit log retention (days)</p>
                  <p className="text-sm text-muted-foreground">Keep decision logs for donor review.</p>
                </div>
                <Input defaultValue={90} className="w-24" />
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 mt-0.5" />
                <div>
                  <p className="font-semibold">Note</p>
                  <p>PII redaction must be enabled before exporting any field-level datasets.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
                <Info className="h-4 w-4 mt-0.5" />
                <div>
                  <p className="font-semibold">Data precedence</p>
                  <p>CDMC alerts override IOM “empty” flags for 48 hours pending verification.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import Latest XLSX
              </CardTitle>
              <CardDescription>
                Upload the IOM_DTM_ETT_SOM_Tracker_sinceFeb2025_w49.xlsx (or newer). Imported data will be used across all tabs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select .xlsx file</Label>
                <Input
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">
                  Expected structure: IOM ETT displacement (14d arrivals), sites, GPS, households. The ingest job will regenerate
                  `src/data/nabad.generated.ts`.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => {
                    if (!selectedFile) {
                      toast({ title: "No file selected", description: "Choose an .xlsx file first." });
                      return;
                    }
                    importMutation.mutate(selectedFile);
                  }}
                  disabled={importMutation.isPending}
                >
                  {importMutation.isPending ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {uploadPhase === "Processing on server"
                        ? "Processing..."
                        : uploadProgress !== null
                        ? `${uploadProgress}%`
                        : "Importing..."}
                    </span>
                  ) : (
                    "Import and refresh"
                  )}
                </Button>
                {selectedFile && <Badge variant="outline">{selectedFile.name}</Badge>}
              </div>
              {importMutation.isPending && (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>
                    {uploadPhase ?? "Uploading"}{" "}
                    {uploadPhase === "Processing on server"
                      ? ""
                      : uploadProgress !== null
                      ? `• ${uploadProgress}%`
                      : ""}
                  </span>
                </div>
              )}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
                Uploading will store all columns in the database and refresh the dashboard automatically.
              </div>

              <div className="space-y-2 pt-2">
                <p className="text-sm font-semibold">Recent imports</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {importsQuery.data?.map((job) => {
                    const pct = job.totalRows && job.totalRows > 0
                      ? Math.min(100, Math.round(((job.importedRows ?? 0) / job.totalRows) * 100))
                      : null;
                    return (
                      <div key={job.id} className="flex items-center justify-between border rounded-md px-2 py-1">
                        <span className="truncate max-w-[180px]" title={job.filename}>{job.filename}</span>
                        <span className="flex items-center gap-2 text-xs">
                          {pct !== null && <span>{pct}%</span>}
                          <Badge variant={job.status === "done" ? "secondary" : job.status === "failed" ? "destructive" : "outline"}>
                            {job.status}
                          </Badge>
                          {job.status === "pending" && <Loader2 className="h-3 w-3 animate-spin" />}
                        </span>
                      </div>
                    );
                  }) || <span>No imports yet.</span>}
                </div>
              </div>
            </CardContent>
          </Card>

          <UICard>
            <UICardContent className="p-4 space-y-3">
              <p className="text-sm font-semibold">Recent imports</p>
              <div className="divide-y rounded-md border text-xs">
                {importsQuery.data?.length ? (
                  importsQuery.data.map((job) => {
                    const pct = job.totalRows && job.totalRows > 0
                      ? Math.min(100, Math.round(((job.importedRows ?? 0) / job.totalRows) * 100))
                      : null;
                    return (
                      <div key={job.id} className="flex items-center gap-3 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate" title={job.filename}>{job.filename}</span>
                            {pct !== null && (
                              <span className="text-[10px] text-muted-foreground">
                                {job.importedRows ?? 0}/{job.totalRows} ({pct}%)
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(job.createdAt).toLocaleDateString()} • {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {job.finishedAt ? ` • done ${new Date(job.finishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ""}
                            {job.message ? ` • ${job.message}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {pct !== null && (
                            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                          <Badge variant={
                            job.status === "done" ? "secondary" :
                            job.status === "failed" ? "destructive" : "outline"
                          }>
                            {job.status}
                          </Badge>
                          {job.status === "pending" && <Loader2 className="h-3 w-3 animate-spin" />}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <span className="px-3 py-2 text-muted-foreground">No imports yet.</span>
                )}
              </div>
            </UICardContent>
          </UICard>
        </TabsContent>

        <TabsContent value="forms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create community alert form</CardTitle>
              <CardDescription>Generate a public link respondents can use without logging in.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Community Alert Form" />
                </div>
                <div className="space-y-2">
                  <Label>Slug (auto-generated)</Label>
                  <Input
                    value={formSlug}
                    readOnly
                    className="bg-muted text-muted-foreground"
                    placeholder="auto-generated"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Short instructions" />
              </div>
              <div className="space-y-2">
                <Label>Header image URL</Label>
                <Input value={formHeaderImage} onChange={(e) => setFormHeaderImage(e.target.value)} placeholder="https://…" />
              </div>
              <div className="space-y-2">
                <Label>Sections</Label>
                <div className="space-y-2">
                  {sections.map((sec, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={sec}
                        onChange={(e) =>
                          setSections((prev) => {
                            const copy = [...prev];
                            copy[idx] = e.target.value;
                            return copy;
                          })
                        }
                        placeholder={`Section ${idx + 1}`}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setSections((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setSections((prev) => [...prev, `Section ${prev.length + 1}`])}
                  >
                    Add section
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Fields</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setFormFields((prev) => [
                        ...prev,
                        { name: `field${prev.length + 1}`, label: `Field ${prev.length + 1}`, type: "text", required: false },
                      ])
                    }
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add field
                  </Button>
                </div>
                <div className="space-y-2">
                  {formFields.map((f, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 md:grid-cols-7 gap-2 items-center border rounded-md p-2 bg-muted/40 cursor-move"
                      draggable
                      onDragStart={() => setDragIndex(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(idx)}
                    >
                      <Input
                        value={f.name}
                        onChange={(e) =>
                          setFormFields((prev) => {
                            const copy = [...prev];
                            const name = e.target.value;
                            const label = slugify(name);
                            copy[idx] = { ...copy[idx], name, label: label || name };
                            return copy;
                          })
                        }
                        placeholder="Field Name"
                      />
                      <Input
                        value={f.label}
                        disabled
                        className="md:col-span-2 bg-muted text-muted-foreground"
                      />
                      <Select
                        value={f.type ?? "text"}
                        onValueChange={(val) =>
                          setFormFields((prev) => {
                            const copy = [...prev];
                            copy[idx] = {
                              ...copy[idx],
                              type: val,
                              options:
                                val === "radio" || val === "checkbox"
                                  ? (copy[idx] as any).options ?? ["Option 1"]
                                  : undefined,
                            };
                            return copy;
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Short text</SelectItem>
                          <SelectItem value="textarea">Paragraph</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="radio">Single choice</SelectItem>
                          <SelectItem value="checkbox">Multiple choice</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!!f.required}
                          onCheckedChange={(val) =>
                            setFormFields((prev) => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], required: val };
                              return copy;
                            })
                          }
                        />
                        <span className="text-xs">Required</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!!f.hidden}
                          onCheckedChange={(val) =>
                            setFormFields((prev) => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], hidden: val };
                              return copy;
                            })
                          }
                        />
                        <span className="text-xs">Admin prefill</span>
                      </div>
                      {f.hidden && (
                        <Input
                          value={f.defaultValue ?? ""}
                          onChange={(e) =>
                            setFormFields((prev) => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], defaultValue: e.target.value };
                              return copy;
                            })
                          }
                          placeholder="Prefilled value (kept hidden)"
                          className="md:col-span-2"
                        />
                      )}
                      {(f.type === "radio" || f.type === "checkbox") && (
                        <div className="md:col-span-2 space-y-2">
                          {((f as any).options ?? ["Option 1"]).map((opt: string, optIdx: number) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <Input
                                value={opt}
                                onChange={(e) =>
                                  setFormFields((prev) => {
                                    const copy = [...prev];
                                    const opts = [...((copy[idx] as any).options ?? [])];
                                    opts[optIdx] = e.target.value;
                                    copy[idx] = { ...copy[idx], options: opts };
                                    return copy;
                                  })
                                }
                                placeholder={`Choice ${optIdx + 1}`}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setFormFields((prev) => {
                                    const copy = [...prev];
                                    const opts = [...((copy[idx] as any).options ?? [])];
                                    opts.splice(optIdx, 1);
                                    copy[idx] = { ...copy[idx], options: opts.length ? opts : ["Option 1"] };
                                    return copy;
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setFormFields((prev) => {
                                const copy = [...prev];
                                const opts = [...((copy[idx] as any).options ?? [])];
                                opts.push(`Option ${opts.length + 1}`);
                                copy[idx] = { ...copy[idx], options: opts };
                                return copy;
                              })
                            }
                          >
                            Add choice
                          </Button>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setFormFields((prev) => {
                              if (idx === 0) return prev;
                              const copy = [...prev];
                              [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
                              return copy;
                            })
                          }
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setFormFields((prev) => {
                              if (idx === prev.length - 1) return prev;
                              const copy = [...prev];
                              [copy[idx + 1], copy[idx]] = [copy[idx], copy[idx + 1]];
                              return copy;
                            })
                          }
                        >
                          ↓
                        </Button>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setFormFields((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {!formFields.length && <p className="text-sm text-muted-foreground">Add at least one field.</p>}
                </div>
              </div>
              <Button
                onClick={() => {
                  const slug = slugify(formTitle);
                  setFormSlug(slug);
                  if (!formTitle || !slug || formFields.length === 0) {
                    toast({ title: "Missing info", description: "Title and at least one field are required.", variant: "destructive" });
                    return;
                  }
                  const payload = { title: formTitle, slug, description: formDescription, headerImage: formHeaderImage, fields: formFields, sections };
                  const onSuccess = () => {
                    toast({ title: editingFormId ? "Form updated" : "Form created", description: `Share link: /forms/${slug}` });
                    formsQuery.refetch();
                    setEditingFormId(null);
                    setFormTitle("");
                    setFormSlug("");
                    setFormDescription("");
                    setFormHeaderImage("");
                    setFormFields([
                      { name: "site", label: "site", type: "text", required: true, hidden: false },
                      { name: "message", label: "message", type: "textarea", required: true, hidden: false },
                    ]);
                    setSections([]);
                  };
                  if (editingFormId) {
                    updateForm.mutate(
                      { id: editingFormId, ...payload },
                      { onSuccess, onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }) },
                    );
                  } else {
                    createForm.mutate(payload, {
                      onSuccess,
                      onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
                    });
                  }
                }}
                disabled={createForm.isPending || updateForm.isPending}
              >
                {createForm.isPending || updateForm.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus className="h-4 w-4" />}
                <span className="ml-2">{editingFormId ? "Save changes" : "Create & copy link"}</span>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Existing forms</CardTitle>
              <CardDescription>Share the links with community respondents.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {formsQuery.data?.map((f) => (
                <div key={f.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border rounded-md px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{f.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{f.description}</p>
                    <p className="text-[11px] text-muted-foreground">/{`forms/${f.slug}`}</p>
                    <p className="text-[11px] text-muted-foreground">Responses: {f._count?.responses ?? 0}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(`${window.location.origin}/forms/${f.slug}`)}
                      className="flex items-center gap-1"
                    >
                      <LinkIcon className="h-4 w-4" />
                      Copy link
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setFormTitle(f.title);
                        setFormSlug(f.slug);
                        setFormDescription(f.description ?? "");
                        setFormHeaderImage(f.headerImage ?? "");
                        setFormFields(f.fields as any);
                        setSections(f.sections ?? []);
                        setEditingFormId(f.id);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPreviewForm(f);
                      }}
                    >
                      Preview
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        deleteForm.mutate(f.id, {
                          onSuccess: () => toast({ title: "Form deleted" }),
                          onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
                        })
                      }
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )) || <p className="text-sm text-muted-foreground">No forms yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {/* Preview dialog */}
      <Dialog open={!!previewForm} onOpenChange={(open) => !open && setPreviewForm(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewForm?.title}</DialogTitle>
            <DialogDescription>Public view (no login required)</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            <p className="text-xs text-muted-foreground">Link: {window.location.origin}/forms/{previewForm?.slug}</p>
            {(previewForm?.fields ?? []).filter((f: any) => !f.hidden).map((f: any) => {
              const label =
                (f.label || f.name || "")
                  .replace(/_/g, " ")
                  .replace(/\s+/g, " ")
                  .replace(/\b\w/g, (c: string) => c.toUpperCase()) || "Question";
              const options = Array.isArray(f.options) ? f.options : [];
              return (
                <div key={f.name} className="space-y-1">
                  <label className="text-sm font-medium">{label}{f.required ? " *" : ""}</label>
                  {f.type === "textarea" ? (
                    <Textarea disabled placeholder="Response" />
                  ) : f.type === "radio" || f.type === "checkbox" ? (
                    <div className="space-y-1">
                      {options.map((opt: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="h-4 w-4 rounded-full border" />
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Input disabled placeholder="Response" />
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewForm(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;

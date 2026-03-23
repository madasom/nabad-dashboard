import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Download,
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
import { useCreateUser, useDeleteUser, useUpdateUser, useUsers } from "@/hooks/useUsers";
import { useSitesData } from "@/hooks/useSitesData";
import { useAlertsData } from "@/hooks/useAlertsData";
import { API_BASE } from "@/config/api";
import { ReportsPanel } from "@/components/reports/ReportsPanel";
import * as XLSX from "xlsx";

type ImportDataset = "IOM_ETT" | "MOH_ETT" | "MOH_PENTA3_YEARLY" | "MOH_PENTA3_MONTHLY" | "IDP_SITE_REGISTRY";

const importDatasetMeta: Record<ImportDataset, { label: string; description: string }> = {
  IOM_ETT: {
    label: "IOM ETT import",
    description: "Expected structure: IOM ETT health and displacement signals, sites, GPS, and households.",
  },
  MOH_ETT: {
    label: "MOH ETT import",
    description: "Expected structure: MOH health and displacement signals using the current ETT mapping.",
  },
  MOH_PENTA3_YEARLY: {
    label: "MOH Penta3 yearly workbook",
    description: "Expected structure: annual immunization workbook with period/year rows and Penta 1/Penta 3 dose columns.",
  },
  MOH_PENTA3_MONTHLY: {
    label: "MOH Penta3 monthly workbook",
    description: "Expected structure: monthly immunization workbook with month rows and Pentavale/Penta 1 and 3 dose columns.",
  },
  IDP_SITE_REGISTRY: {
    label: "IDP site registry workbook",
    description: "Expected structure: site registry with IDP Site Name, Households, Latitude, and Longitude columns.",
  },
};

const importTemplateFiles: Record<ImportDataset, string> = {
  IOM_ETT: "iom_ett_template.xlsx",
  MOH_ETT: "moh_ett_template.xlsx",
  MOH_PENTA3_YEARLY: "moh_penta3_yearly_template.xlsx",
  MOH_PENTA3_MONTHLY: "moh_penta3_monthly_template.xlsx",
  IDP_SITE_REGISTRY: "idp_site_registry_template.xlsx",
};

const ettTemplateRows = [
  {
    "Settlement ID": "SET-001",
    "Settlement Name": "Example Site",
    "District Name": "Gubadley",
    "Region Name": "Banadir",
    "OCHA Region Pcode": "SO22",
    "OCHA District Pcode": "SO2201",
    "Operational Zone": "OPZ 001",
    Catchment: "Catchment A",
    "Settlement Classification": "IDP site (camp or camp like setting)",
    "Location Type": "Urban (Waah/Neighborhood)",
    Latitude: 2.0843,
    Longitude: 45.4018,
    "Total HH": 520,
    "Total new arrivals since last week": 42,
    "Number of Males (18 and above) since last week": 10,
    "Number of Females (18 and above) since last week": 12,
    "Number of Children under 18 since last week": 20,
    "Total number of departures since last week": 5,
    "Main Cause of Displacement": "Drought",
    "Main Cause of Displacement (type of Natural hazard)": "Drought",
    "Main Cause of Displacement (type of conflict)": "",
    "Main need for the majority of IDPs in settlement": "Drinking Water",
    "Needs - General Protection Services": "No",
    "Needs - GBV Services": "No",
    "Needs - Child Protection Services": "No",
    "Needs - General Food distribution": "Yes",
    "Needs - Health Services": "Yes",
    "Needs - Water Services": "Yes",
    "Needs - Sanitation Services (latrines etc)": "No",
    "Needs - Hygiene services (soap, hygiene kits, etc)": "No",
    "New arrivals since last week": "Yes",
    "Response - General food distribution to new arrivals": "Yes",
    "Response - Shelter Materials": "No",
    "Response - NFIs": "No",
    "Response - Health Services": "Yes",
    "Response - Nutrition Services": "No",
    "Response - Water Services": "Yes",
    "Response - Sanitation Services (latrines etc)": "No",
    "Response - Hygiene Services (soap, hygiene kits, etc)": "No",
    "Response - General Protection Services": "No",
    "Response - GBV Services": "No",
    "Response - CCCM Site Improvement": "No",
    "Response - CCCM Site Decongestion": "No",
    "Response - CCCM Complaints and Feedback Mechanism": "No",
    "Response - CCCM Plot Allocation": "No",
    "Type of movement of the majority of the new arrivals": "Spontaneous",
    "How many times was the majority displaced since they left place of origin": "First displacement",
    "How long did the whole journey take for the majority": "Less than 1 day",
    "Somalia Region of Origin": "Bay",
    "Somalia District of Origin": "Baidoa",
    "Somalia Location of Origin": "Example Village",
    "Data Collection Week": "Week 12 (20 - 24 March, 2026)",
    "Penta3 coverage": 71.2,
    "GAM prevalence": 13.4,
    "Safety Index": 62.5,
  },
];

const registryTemplateRows = [
  {
    "IDP Site Name": "Example Site",
    District: "Gubadley",
    Region: "Banadir",
    Latitude: 2.0843,
    Longitude: 45.4018,
    Households: 520,
  },
];

const pentaYearlyTemplateRows = [
  ["Example Health Facility"],
  ["PeriodName", "Penta 1", "Penta 3"],
  ["2024", 1200, 1080],
  ["2025", 1320, 1215],
];

const pentaMonthlyTemplateRows = [
  ["Example Health Facility"],
  ["PeriodName", "Pentavale 1st dose", "Pentavale 3rd dose"],
  ["2026-01", 120, 110],
  ["2026-02", 130, 122],
];

const Admin = () => {
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importDataset, setImportDataset] = useState<ImportDataset>("IOM_ETT");
  const [gamSeason, setGamSeason] = useState("2025/gu");
  const { toast } = useToast();
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadPhase, setUploadPhase] = useState<string | null>(null);
  const importsQuery = useImportsData();
  const formsQuery = useForms();
  const createForm = useCreateForm();
  const updateForm = useUpdateForm();
  const deleteForm = useDeleteForm();
  const usersQuery = useUsers();
  const createUser = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const sitesQuery = useSitesData();
  const alertsQuery = useAlertsData();
  const [memberForm, setMemberForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
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

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

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

  const resetMemberForm = () => {
    setMemberForm({ name: "", email: "", password: "" });
    setEditingUserId(null);
  };

  const openCreateUserDialog = () => {
    resetMemberForm();
    setCreateUserDialogOpen(true);
  };

  const openEditUserDialog = (member: { id: string; name: string; email: string }) => {
    setEditingUserId(member.id);
    setMemberForm({
      name: member.name,
      email: member.email,
      password: "",
    });
    setEditUserDialogOpen(true);
  };

  const handleCreateUser = async () => {
    if (!memberForm.name.trim() || !memberForm.email.trim() || !memberForm.password.trim()) {
      toast({
        title: "Missing fields",
        description: "Name, email, and password are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createUser.mutateAsync({
        name: memberForm.name.trim(),
        email: memberForm.email.trim().toLowerCase(),
        password: memberForm.password,
      });
      toast({ title: "User created", description: `${memberForm.name.trim()} can now sign in.` });
      setCreateUserDialogOpen(false);
      resetMemberForm();
    } catch (err: any) {
      toast({ title: "Failed to create user", description: err.message, variant: "destructive" });
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUserId || !memberForm.name.trim() || !memberForm.email.trim()) {
      toast({
        title: "Missing fields",
        description: "Name and email are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateUserMutation.mutateAsync({
        id: editingUserId,
        name: memberForm.name.trim(),
        email: memberForm.email.trim().toLowerCase(),
        password: memberForm.password.trim() ? memberForm.password : undefined,
      });
      toast({ title: "User updated", description: `${memberForm.name.trim()} was updated.` });
      setEditUserDialogOpen(false);
      resetMemberForm();
    } catch (err: any) {
      toast({ title: "Failed to update user", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteUser = async (member: { id: string; name: string }) => {
    const confirmed = window.confirm(`Delete ${member.name}? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteUserMutation.mutateAsync(member.id);
      toast({ title: "User deleted", description: `${member.name} was removed.` });
    } catch (err: any) {
      toast({ title: "Failed to delete user", description: err.message, variant: "destructive" });
    }
  };

  const getImportBadgeVariant = (status: string) => {
    if (status === "done") return "secondary" as const;
    if (status === "failed") return "destructive" as const;
    if (status === "partial") return "outline" as const;
    return "outline" as const;
  };

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const apiUrl = API_BASE;
      const form = new FormData();
      form.append("file", file);
      form.append("dataset", importDataset);
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

  const gamSyncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/sites/sync-gam`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ season: gamSeason }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ message: "GAM sync failed" }));
        throw new Error(payload.message ?? "GAM sync failed");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      toast({
        title: "FSNAU GAM synced",
        description: `Imported ${data.imported ?? 0} GAM observations for ${data.season ?? gamSeason}.`,
      });
    },
    onError: (err: any) => {
      toast({ title: "GAM sync failed", description: err.message, variant: "destructive" });
    },
  });

  const downloadImportTemplate = () => {
    const workbook = XLSX.utils.book_new();

    if (importDataset === "IOM_ETT" || importDataset === "MOH_ETT") {
      const sheet = XLSX.utils.json_to_sheet(ettTemplateRows);
      XLSX.utils.book_append_sheet(workbook, sheet, "ETT Import");
    } else if (importDataset === "IDP_SITE_REGISTRY") {
      const sheet = XLSX.utils.json_to_sheet(registryTemplateRows);
      XLSX.utils.book_append_sheet(workbook, sheet, "Registry");
    } else if (importDataset === "MOH_PENTA3_YEARLY") {
      const sheet = XLSX.utils.aoa_to_sheet(pentaYearlyTemplateRows);
      XLSX.utils.book_append_sheet(workbook, sheet, "Penta3 Yearly");
    } else if (importDataset === "MOH_PENTA3_MONTHLY") {
      const sheet = XLSX.utils.aoa_to_sheet(pentaMonthlyTemplateRows);
      XLSX.utils.book_append_sheet(workbook, sheet, "Penta3 Monthly");
    }

    XLSX.writeFile(workbook, importTemplateFiles[importDataset]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">DawaSom — Admin & Access Control</h1>
        <p className="page-description">
          Manage DawaSom team access and data privacy for the Nabad Mobile Hub
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
                    <p className="text-2xl font-bold">Admin</p>
                    <p className="text-sm text-muted-foreground">Access level</p>
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
              <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={openCreateUserDialog}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Team Member</DialogTitle>
                    <DialogDescription>Add an admin user with a password.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        placeholder="Amina Hassan"
                        value={memberForm.name}
                        onChange={(e) => setMemberForm((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input
                        placeholder="name@oxfam.org"
                        type="email"
                        value={memberForm.email}
                        onChange={(e) => setMemberForm((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Temporary Password</Label>
                      <Input
                        placeholder="At least 8 characters"
                        type="password"
                        value={memberForm.password}
                        onChange={(e) => setMemberForm((prev) => ({ ...prev, password: e.target.value }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateUser} disabled={createUser.isPending}>
                      {createUser.isPending ? "Creating..." : "Create User"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Dialog
                open={editUserDialogOpen}
                onOpenChange={(open) => {
                  setEditUserDialogOpen(open);
                  if (!open) resetMemberForm();
                }}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Team Member</DialogTitle>
                    <DialogDescription>Update the user profile or password.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={memberForm.name}
                        onChange={(e) => setMemberForm((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input
                        type="email"
                        value={memberForm.email}
                        onChange={(e) => setMemberForm((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>New Password</Label>
                      <Input
                        type="password"
                        placeholder="Leave blank to keep the current password"
                        value={memberForm.password}
                        onChange={(e) => setMemberForm((prev) => ({ ...prev, password: e.target.value }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleUpdateUser} disabled={updateUserMutation.isPending}>
                      {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
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
                    <TableHead className="text-right">Actions</TableHead>
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
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditUserDialog(member)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(member)}
                            disabled={deleteUserMutation.isPending || user?.id === member.id}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <ReportsPanel showHeader={false} />
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
                Import External Data
              </CardTitle>
              <CardDescription>
                Import IOM/MOH displacement sheets, MOH Penta3 workbooks, and sync GAM from FSNAU. Imported data will be used across dashboard scoring and reports.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select .xlsx file</Label>
                <Select value={importDataset} onValueChange={(value) => setImportDataset(value as ImportDataset)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IOM_ETT">IOM ETT import</SelectItem>
                    <SelectItem value="MOH_ETT">MOH ETT import</SelectItem>
                    <SelectItem value="MOH_PENTA3_YEARLY">MOH Penta3 yearly workbook</SelectItem>
                    <SelectItem value="MOH_PENTA3_MONTHLY">MOH Penta3 monthly workbook</SelectItem>
                    <SelectItem value="IDP_SITE_REGISTRY">IDP site registry workbook</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">
                  {importDatasetMeta[importDataset].description}
                </p>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={downloadImportTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Download template
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Downloads a sample workbook for {importDatasetMeta[importDataset].label.toLowerCase()}.
                  </span>
                </div>
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
                {selectedFile && <Badge variant="outline">{importDatasetMeta[importDataset].label} • {selectedFile.name}</Badge>}
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
                XLSX imports are tagged by dataset type. Penta3 workbooks are stored as health indicator observations; site registry workbooks update households and coordinates for mapped sites.
              </div>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-emerald-900">Sync GAM from FSNAU</p>
                  <p className="text-xs text-emerald-800">
                    Pulls the seasonal nutrition summary table from FSNAU and stores GAM observations for matching districts/regions.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Input
                    value={gamSeason}
                    onChange={(e) => setGamSeason(e.target.value)}
                    placeholder="2025/gu"
                    className="sm:w-40"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => gamSyncMutation.mutate()}
                    disabled={gamSyncMutation.isPending}
                  >
                    {gamSyncMutation.isPending ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Syncing...
                      </span>
                    ) : (
                      "Sync FSNAU GAM"
                    )}
                  </Button>
                </div>
              </div>

            </CardContent>
          </Card>

          <UICard>
            <UICardContent className="p-4 space-y-3">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                Community responses are not imported here. They flow directly from submitted public forms and are now used in reporting from the database.
              </div>
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
                          <Badge variant="outline">{job.dataset ?? job.source ?? "IOM_ETT"}</Badge>
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
                                className={`h-full transition-all ${
                                  job.status === "failed" ? "bg-destructive" : job.status === "partial" ? "bg-amber-500" : "bg-primary"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                          <Badge variant={getImportBadgeVariant(job.status)}>
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

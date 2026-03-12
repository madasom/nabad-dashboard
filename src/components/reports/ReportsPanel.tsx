import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  TriangleAlert,
  Siren,
  MoveUpRight,
  MessageSquareWarning,
  Activity,
  HeartPulse,
  Users,
  Clock,
  FileSpreadsheet,
  FilePlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  generateReportFile,
  getReportPreview,
  reportTemplates,
  type ExportFormat,
  type ReportId,
} from "@/lib/reporting";
import { useToast } from "@/components/ui/use-toast";
import { useSitesData } from "@/hooks/useSitesData";
import { useAlertsData } from "@/hooks/useAlertsData";
import { useCommunityResponses } from "@/hooks/useCommunityResponses";

const reportIcons = {
  "hotspot-identification": TriangleAlert,
  "early-warning-alert": Siren,
  "displacement-alert": MoveUpRight,
  "community-needs-summary": MessageSquareWarning,
  "malnutrition-alert": Activity,
  "health-service-gap": HeartPulse,
  sadd: Users,
} satisfies Record<ReportId, typeof TriangleAlert>;

type RecentExport = {
  name: string;
  date: string;
  size: string;
  url: string;
};

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function ReportsPanel({ showHeader = true }: { showHeader?: boolean }) {
  const [selectedReport, setSelectedReport] = useState<ReportId>("hotspot-identification");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");
  const [includeNarrative, setIncludeNarrative] = useState(true);
  const [includeMethodology, setIncludeMethodology] = useState(true);
  const [includeRawData, setIncludeRawData] = useState(false);
  const [recentExports, setRecentExports] = useState<RecentExport[]>([]);
  const { toast } = useToast();
  const sitesQuery = useSitesData();
  const alertsQuery = useAlertsData();
  const communityResponsesQuery = useCommunityResponses();

  const reportContext = {
    sites: sitesQuery.data,
    alerts: alertsQuery.data,
    communityResponses: communityResponsesQuery.data,
  };

  const preview = getReportPreview(selectedReport, reportContext);

  const registerExport = (name: string, size: number, url: string) => {
    setRecentExports((prev) => [
      {
        name,
        date: new Date().toISOString(),
        size: formatBytes(size),
        url,
      },
      ...prev,
    ].slice(0, 6));
  };

  const handleGenerate = () => {
    const generated = generateReportFile({
      reportId: selectedReport,
      format: exportFormat,
      includeNarrative,
      includeMethodology,
      includeRawData,
      context: reportContext,
    });

    registerExport(generated.filename, generated.size, generated.url);
    toast({
      title: "Report generated",
      description: `${preview.title} exported as ${exportFormat.toUpperCase()}.`,
    });
  };

  const handleQuickExport = (format: Extract<ExportFormat, "csv" | "xlsx">) => {
    const generated = generateReportFile({
      reportId: selectedReport,
      format,
      includeNarrative: true,
      includeMethodology: true,
      includeRawData: true,
      context: reportContext,
    });

    registerExport(generated.filename, generated.size, generated.url);
    toast({
      title: "Data export ready",
      description: `${preview.title} exported as ${format.toUpperCase()}.`,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {showHeader ? (
        <div className="page-header">
          <h1 className="page-title">Reports & Export</h1>
          <p className="page-description">
            Generate PDF documentation and data extracts for hotspot, alert, needs, health, and SADD reporting
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Report Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportTemplates.map((report) => {
              const Icon = reportIcons[report.id];
              return (
                <Card
                  key={report.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    selectedReport === report.id && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedReport(report.id)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold truncate">{report.name}</h3>
                          <Badge variant="outline" className="text-xs capitalize">
                            {report.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {report.description}
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Baseline: {new Date(report.lastGenerated).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Configure Report</h2>
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Export Format</label>
                <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF Document</SelectItem>
                    <SelectItem value="csv">CSV Spreadsheet</SelectItem>
                    <SelectItem value="xlsx">Excel Workbook</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Document Options</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="narrative"
                      checked={includeNarrative}
                      onCheckedChange={(checked) => setIncludeNarrative(Boolean(checked))}
                    />
                    <label htmlFor="narrative" className="text-sm">
                      Include key findings summary
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="methodology"
                      checked={includeMethodology}
                      onCheckedChange={(checked) => setIncludeMethodology(Boolean(checked))}
                    />
                    <label htmlFor="methodology" className="text-sm">
                      Include methodology notes
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="raw"
                      checked={includeRawData}
                      onCheckedChange={(checked) => setIncludeRawData(Boolean(checked))}
                    />
                    <label htmlFor="raw" className="text-sm">
                      Include raw data appendix
                    </label>
                  </div>
                </div>
              </div>

              <Button className="w-full" onClick={handleGenerate}>
                <Download className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Report Preview</CardTitle>
              <CardDescription>What will be included in this export</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium text-sm">{preview.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {preview.exportRows.length} rows ready for export across {preview.sections.length} section
                  {preview.sections.length === 1 ? "" : "s"}.
                </p>
              </div>
              <div className="space-y-2">
                {preview.summary.map((item) => (
                  <div key={item} className="text-xs text-muted-foreground rounded-md bg-muted/60 px-3 py-2">
                    {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Export</CardTitle>
              <CardDescription>Use the selected template as a data extract</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => handleQuickExport("csv")}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Selected Report (CSV)
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => handleQuickExport("xlsx")}>
                <FilePlus className="h-4 w-4 mr-2" />
                Export Selected Report (XLSX)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Exports</CardTitle>
          <CardDescription>Generated files from this session</CardDescription>
        </CardHeader>
        <CardContent>
          {recentExports.length ? (
            <div className="space-y-3">
              {recentExports.map((file) => (
                <div
                  key={`${file.name}-${file.date}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(file.date).toLocaleString()} • {file.size}
                      </p>
                    </div>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <a href={file.url} download={file.name}>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No files generated yet in this session.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

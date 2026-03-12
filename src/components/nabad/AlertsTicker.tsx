import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { normalizeCommunityResponse } from "@/lib/communityResponses";
import { useCommunityResponses } from "@/hooks/useCommunityResponses";
import { AlarmClock, ClipboardList, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { useAlertsData } from "@/hooks/useAlertsData";

const severityTone: Record<string, string> = {
  critical: "bg-red-500/15 text-red-600 border-red-500/20",
  high: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  medium: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  low: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
};

export const AlertsTicker = () => {
  const { data } = useAlertsData();
  const communityResponsesQuery = useCommunityResponses();
  const sorted = [...(data ?? [])].sort(
    (a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
  );
  const submissions = (communityResponsesQuery.data ?? [])
    .map(normalizeCommunityResponse)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, 5);

  if (sorted.length === 0 && submissions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Community Inputs</CardTitle>
            <p className="text-sm text-muted-foreground">Latest ground alerts and submitted form responses flowing into the hub</p>
          </div>
          <Badge variant="outline" className="gap-1">
            <MessageCircle className="h-4 w-4" />
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[550px] pr-3">
          <div className="space-y-4">
            {sorted.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  Alerts
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {sorted.map((alert) => (
                    <div
                      key={alert.id}
                      className="border border-border/70 rounded-lg p-3 bg-card/60 hover:border-primary/40 transition h-full"
                    >
                      <div className="flex items-start justify-between gap-2 h-full">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="capitalize">
                              {alert.siteName} • {alert.district}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {alert.category}
                            </Badge>
                          </div>
                          <p className="text-sm leading-snug">{alert.message}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <AlarmClock className="h-3.5 w-3.5" />
                            {format(new Date(alert.reportedAt), "dd MMM yyyy, HH:mm")}
                          </div>
                        </div>
                        <Badge className={severityTone[alert.severity ?? "low"] ?? severityTone.low}>{alert.severity ?? "low"}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {submissions.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  Form submissions
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {submissions.map((response) => (
                    <div key={response.id} className="border border-border/70 rounded-lg p-3 bg-card/60">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{response.formTitle}</Badge>
                            <Badge variant="outline">
                              {response.siteLabel}
                              {response.districtLabel !== "Unspecified area" ? ` • ${response.districtLabel}` : ""}
                            </Badge>
                          </div>
                          <p className="text-sm leading-snug">{response.summary}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <AlarmClock className="h-3.5 w-3.5" />
                            {format(new Date(response.submittedAt), "dd MMM yyyy, HH:mm")}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

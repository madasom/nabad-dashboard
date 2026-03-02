import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlarmClock, MessageCircle } from "lucide-react";
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
  if (!data || data.length === 0) return null;
  const sorted = [...data].sort(
    (a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Community Alerts (CDMC / SMS)</CardTitle>
            <p className="text-sm text-muted-foreground">Latest ground reports flowing into the hub</p>
          </div>
          <Badge variant="outline" className="gap-1">
            <MessageCircle className="h-4 w-4" />
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[550px] pr-3">
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
                        {alert.site} • {alert.district}
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
                  <Badge className={severityTone[alert.severity]}>{alert.severity}</Badge>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

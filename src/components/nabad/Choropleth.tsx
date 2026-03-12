import Map, { Layer, Source, NavigationControl, Marker, Popup } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { computeCompositeScore, siteProfiles } from "@/data/nabad";
import { ScoredSite } from "@/hooks/useSitesData";
import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

const STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const circleLayer: Layer = {
  id: "cvi-circles",
  type: "circle",
  paint: {
    "circle-color": [
      "interpolate",
      ["linear"],
      ["get", "score"],
      0,
      "#22c55e",
      50,
      "#eab308",
      65,
      "#f59e0b",
      80,
      "#ef4444"
    ],
    "circle-radius": [
      "interpolate",
      ["linear"],
      ["get", "households"],
      100,
      7,
      900,
      16,
      1500,
      22
    ],
    "circle-stroke-color": "#065f46",
    "circle-stroke-width": 1,
    "circle-opacity": 0.9
  }
};

const glowLayer: Layer = {
  id: "cvi-glow",
  type: "circle",
  paint: {
    "circle-radius": [
      "interpolate",
      ["linear"],
      ["get", "households"],
      100,
      14,
      900,
      22,
      1500,
      30
    ],
    "circle-color": [
      "interpolate",
      ["linear"],
      ["get", "score"],
      0,
      "rgba(34,197,94,0.0)",
      50,
      "rgba(234,179,8,0.25)",
      65,
      "rgba(245,158,11,0.35)",
      80,
      "rgba(239,68,68,0.45)"
    ],
    "circle-blur": 0.9,
    "circle-opacity": 0.9
  }
};

const heatLayer: Layer = {
  id: "cvi-heat",
  type: "heatmap",
  minzoom: 8,
  maxzoom: 16,
  paint: {
    "heatmap-weight": [
      "interpolate",
      ["linear"],
      ["get", "households"],
      100,
      0.2,
      1500,
      1.0
    ],
    "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 9, 0.5, 14, 1.2],
    "heatmap-color": [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0,
      "rgba(34,197,94,0)",
      0.25,
      "rgba(34,197,94,0.35)",
      0.45,
      "rgba(234,179,8,0.55)",
      0.7,
      "rgba(245,158,11,0.72)",
      1,
      "rgba(239,68,68,0.9)"
    ],
    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 9, 18, 12, 28, 14, 44],
    "heatmap-opacity": 0.78
  }
};

type Props = {
  sites?: (typeof siteProfiles | ScoredSite[]);
  onSelect?: (name: string) => void;
  selected?: string | null;
  isLoading?: boolean;
};

export const Choropleth = ({ sites = siteProfiles, onSelect, selected, isLoading = false }: Props) => {
  const [hover, setHover] = useState<{ name: string; lon: number; lat: number; score: number; arrivals: number; hh: number | null } | null>(null);
  const normalized = (sites as any[]).map((s) => ({ ...s, _score: (s as any)._score ?? computeCompositeScore(s as any) }));
  const mappedSites = useMemo(
    () =>
      normalized.filter(
        (site) => Number.isFinite(site.lat) && Number.isFinite(site.lon),
      ),
    [normalized],
  );
  const unmappedCount = normalized.length - mappedSites.length;

  const geojson = useMemo(() => {
    return {
      type: "FeatureCollection",
          features: mappedSites.map((s) => ({
            type: "Feature",
            properties: {
              name: s.name,
              district: s.district,
              households: s.households ?? 0,
              score: (s as any)._score?.composite ?? computeCompositeScore(s as any).composite,
            },
        geometry: {
          type: "Point",
          coordinates: [s.lon, s.lat],
        },
      })),
    } as const;
  }, [mappedSites]);

  const center = useMemo(() => {
    if (mappedSites.length === 0) return { lon: 45.4, lat: 2.08 };
    const lon = mappedSites.reduce((a, s) => a + s.lon, 0) / mappedSites.length;
    const lat = mappedSites.reduce((a, s) => a + s.lat, 0) / mappedSites.length;
    return { lon, lat };
  }, [mappedSites]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">CVI Choropleth (MapLibre)</CardTitle>
        <p className="text-sm text-muted-foreground">Circles colored by CVI, sized by households; heat layer underneath.</p>
      </CardHeader>
      <CardContent>
        <div className="relative h-[360px] w-full overflow-hidden rounded-lg border border-border/60">
          {isLoading ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-muted/40 backdrop-blur-sm">
              <div className="flex items-center gap-2 rounded-full border bg-background/90 px-3 py-2 text-sm font-medium text-foreground shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Retrieving site map and CVI layers...
              </div>
              <div className="w-[92%] space-y-3">
                <Skeleton className="h-[250px] w-full rounded-lg" />
                <div className="flex justify-between gap-3">
                  <Skeleton className="h-20 w-40 rounded-lg" />
                  <Skeleton className="h-10 w-24 rounded-lg" />
                </div>
              </div>
            </div>
          ) : null}
          {!isLoading && mappedSites.length === 0 ? (
            <div className="flex h-full items-center justify-center bg-muted/20 text-sm text-muted-foreground">
              No mapped site coordinates available yet.
            </div>
          ) : null}
          {!isLoading && mappedSites.length > 0 ? (
          <Map
            initialViewState={{ longitude: center.lon, latitude: center.lat, zoom: 12.2 }}
            style={{ width: "100%", height: "100%" }}
            mapStyle={STYLE_URL}
            attributionControl={false}
            interactiveLayerIds={["cvi-circles"]}
            onClick={(e) => {
              const feat = e.features?.find((f) => f.layer.id === "cvi-circles");
              const name = feat?.properties?.name as string | undefined;
              if (name && onSelect) onSelect(name);
            }}
          >
            <NavigationControl position="top-left" />
            <Source id="cvi-sites" type="geojson" data={geojson}>
              <Layer {...heatLayer} />
              <Layer {...glowLayer} />
              <Layer {...circleLayer} />
            </Source>
            {mappedSites.map((s) => {
              const score = (s as any)._score?.composite ?? computeCompositeScore(s as any).composite;
              const color =
                score >= 80 ? "#ef4444" : score >= 65 ? "#f59e0b" : score >= 50 ? "#eab308" : "#22c55e";
              return (
                <Marker
                  key={s.id ?? s.name}
                  longitude={s.lon}
                  latitude={s.lat}
                  anchor="center"
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    onSelect?.(s.name);
                  }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: color,
                      boxShadow: "0 0 10px 4px rgba(4,117,0,0.25)",
                      border: "2px solid #065f46",
                      opacity: 0.92,
                    }}
                    onMouseEnter={() =>
                      setHover({
                        name: s.name,
                        lon: s.lon,
                        lat: s.lat,
                        score,
                        arrivals: s.newArrivals14d ?? 0,
                        hh: s.households,
                      })
                    }
                    onMouseLeave={() => setHover(null)}
                  />
                </Marker>
              );
            })}
            {selected && (
              <Source
                id="selected-site"
                type="geojson"
                data={
                  geojson.features.find((f) => (f.properties as any).name === selected) ?? {
                    type: "FeatureCollection",
                    features: [],
                  }
                }
              >
                <Layer
                  id="selected-ring"
                  type="circle"
                  paint={{
                    "circle-radius": 22,
                    "circle-color": "transparent",
                    "circle-stroke-color": "#2563eb",
                    "circle-stroke-width": 3,
                  }}
                />
              </Source>
            )}
            {hover && (
              <Popup longitude={hover.lon} latitude={hover.lat} closeButton={false} closeOnClick={false} offset={12}>
                <div className="text-xs space-y-1">
                  <div className="font-semibold text-sm">{hover.name}</div>
                  <div>CVI: {hover.score}</div>
                  <div>HH: {hover.hh === null ? "Unknown" : hover.hh.toLocaleString()}</div>
                  <div>Arrivals (14d): {hover.arrivals}</div>
                </div>
              </Popup>
            )}
          </Map>
          ) : null}
          {!isLoading && mappedSites.length > 0 ? (
          <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur px-2 py-1 rounded-md border text-[11px] text-muted-foreground shadow">
            <div className="font-semibold text-xs text-foreground mb-1">Legend (CVI)</div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#22c55e" }} />{" "}
              <span>{"<50"} Stable</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#eab308" }} />{" "}
              <span>50–64 Monitor</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#f59e0b" }} />{" "}
              <span>65–79 Verify</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ef4444" }} />{" "}
              <span>{"≥80"} Deploy</span>
            </div>
          </div>
          ) : null}
          {!isLoading && mappedSites.length > 0 && unmappedCount > 0 ? (
            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-md border text-[11px] text-muted-foreground shadow">
              {unmappedCount.toLocaleString()} sites hidden: missing coordinates
            </div>
          ) : null}
          {/* <div className="absolute bottom-2 right-2 bg-white/85 backdrop-blur px-2 py-1 rounded-md border text-[10px] text-muted-foreground shadow">
            © OpenStreetMap · © CARTO
          </div> */}
        </div>
      </CardContent>
    </Card>
  );
};

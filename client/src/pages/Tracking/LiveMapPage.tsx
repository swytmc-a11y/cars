import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Vite bundles these as URLs; Leaflet's default icon otherwise points at
// broken relative paths once bundled.
const vehicleIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const DEFAULT_CENTER: [number, number] = [24.7136, 46.6753]; // الرياض
const REFRESH_INTERVAL_MS = 15_000;

export default function LiveMapPage() {
  const { data: locations, isLoading } = trpc.vehicleTracking.latest.useQuery(undefined, {
    refetchInterval: REFRESH_INTERVAL_MS,
  });
  const { data: vehicles } = trpc.vehicles.list.useQuery({});

  const vehicleById = useMemo(() => new Map((vehicles ?? []).map(v => [v.id, v])), [vehicles]);

  const center = useMemo<[number, number]>(() => {
    if (locations && locations.length > 0) {
      return [Number(locations[0].lat), Number(locations[0].lng)];
    }
    return DEFAULT_CENTER;
  }, [locations]);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-[600px]" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">تتبع السيارات المباشر</h1>
        <Badge variant="outline">{locations?.length ?? 0} سيارة نشطة</Badge>
      </div>

      {(!locations || locations.length === 0) && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            لا توجد بيانات موقع بعد. سيتم عرض السيارات هنا فور استقبال أول إحداثية عبر نقطة استقبال التتبع.
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <MapContainer center={center} zoom={12} style={{ height: "600px", width: "100%" }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {locations?.map(loc => {
            const vehicle = vehicleById.get(loc.vehicleId);
            return (
              <Marker key={loc.vehicleId} position={[Number(loc.lat), Number(loc.lng)]} icon={vehicleIcon}>
                <Popup>
                  <div className="space-y-1 text-sm">
                    <div className="font-bold">{vehicle ? `${vehicle.brand} ${vehicle.model}` : `سيارة #${loc.vehicleId}`}</div>
                    {vehicle && <div>{vehicle.plateNumber}</div>}
                    {loc.speed != null && <div>السرعة: {Number(loc.speed).toFixed(0)} كم/س</div>}
                    <div className="text-muted-foreground">آخر تحديث: {new Date(loc.recordedAt).toLocaleString("ar-SA")}</div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </Card>
    </div>
  );
}

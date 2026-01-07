import mapboxgl from "mapbox-gl";
import { useEffect, useRef, useState } from "react";
import "./CasualtyMap.css";
import UavLayer from "./UavLayer";

mapboxgl.accessToken =
  "pk.eyJ1IjoiYXl1c2gxMDIiLCJhIjoiY2xycTRtZW4xMDE0cTJtbno5dnU0dG12eCJ9.L9xmYztXX2yOahZoKDBr6g";

export default function CasualtyMap({
  casualties = [],
  triageFilter = "all",
  focusedId = null,

  uavs = [],
  focusedUavId = null,

  globalGeofence = [],
  uavGeofences = {},

  onAddPoint,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const sourcesReadyRef = useRef(false);
  const [ready, setReady] = useState(false);

  /* ================= MAP INIT ================= */
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [77.1175, 28.7488],
      zoom: 16,
      preserveDrawingBuffer: true,
    });

    mapRef.current = map;

    map.on("load", () => {
      setReady(true);
      map.resize();
    });

    map.on("webglcontextlost", (e) => e.preventDefault());

    return () => {
      try {
        map.remove();
      } catch {}
      mapRef.current = null;
      sourcesReadyRef.current = false;
    };
  }, []);

  /* ================= CREATE GEOFENCE SOURCES ONCE ================= */
  useEffect(() => {
    if (!ready || !mapRef.current || sourcesReadyRef.current) return;

    const map = mapRef.current;

    if (!map.getSource("global-geofence")) {
      map.addSource("global-geofence", {
        type: "geojson",
        data: emptyFeature(),
      });
      addFenceLayers(map, "global-geofence", "#9ca3af");
    }

    uavs.forEach((uav) => {
      const id = `uav-geofence-${uav.id}`;
      if (!map.getSource(id)) {
        map.addSource(id, {
          type: "geojson",
          data: emptyFeature(),
        });
        addFenceLayers(map, id, uav.idColor);
      }
    });

    sourcesReadyRef.current = true;
  }, [ready, uavs]);

  /* ================= UPDATE GLOBAL ================= */
  useEffect(() => {
    if (!ready || !sourcesReadyRef.current || !mapRef.current) return;

    mapRef.current
      .getSource("global-geofence")
      ?.setData(buildFeature(globalGeofence));
  }, [globalGeofence, ready]);

  /* ================= UPDATE UAVs ================= */
  useEffect(() => {
    if (!ready || !sourcesReadyRef.current || !mapRef.current) return;

    uavs.forEach((uav) => {
      mapRef.current
        .getSource(`uav-geofence-${uav.id}`)
        ?.setData(buildFeature(uavGeofences[uav.id]));
    });
  }, [uavGeofences, uavs, ready]);

  /* ================= MAP CLICK → ADD ================= */
  useEffect(() => {
    if (!ready || !onAddPoint || !mapRef.current) return;

    const map = mapRef.current;
    const handler = (e) =>
      onAddPoint({ lat: e.lngLat.lat, lng: e.lngLat.lng });

    map.on("click", handler);

    const canvas = map.getCanvas?.();
    if (canvas) canvas.style.cursor = "crosshair";

    return () => {
      try {
        map.off("click", handler);
        const canvas = map.getCanvas?.();
        if (canvas) canvas.style.cursor = "";
      } catch {}
    };
  }, [ready, onAddPoint]);

  /* ================= CASUALTY MARKERS ================= */
  useEffect(() => {
    if (!ready || !mapRef.current) return;

    casualties.forEach((c) => {
      if (markersRef.current[c.id]) return;

      const el = document.createElement("div");
      el.className = `casualty-marker triage-${c.triage}`;
      el.style.setProperty("--idColor", c.idColor);

      el.innerHTML = `
        <div class="marker-body">
          <div class="waves">
            <span class="wave"></span>
            <span class="wave"></span>
          </div>
          <div class="dot">${c.id.replace("C", "")}</div>
          <div class="focus-arrows">
            <span class="arrow up"></span>
            <span class="arrow right"></span>
            <span class="arrow down"></span>
            <span class="arrow left"></span>
          </div>
        </div>
      `;

      const marker = new mapboxgl.Marker(el)
        .setLngLat([c.lng, c.lat])
        .addTo(mapRef.current);

      markersRef.current[c.id] = { el, marker };
    });
  }, [casualties, ready]);

  /* ================= FILTER + FOCUS ================= */
  useEffect(() => {
    if (!ready) return;

    Object.entries(markersRef.current).forEach(([id, { el }]) => {
      el.classList.remove("hidden", "focused");

      const c = casualties.find((x) => x.id === id);
      if (!c) return;

      if (triageFilter !== "all" && c.triage !== triageFilter)
        el.classList.add("hidden");

      if (focusedId && focusedId !== id)
        el.classList.add("hidden");

      if (focusedId === id)
        el.classList.add("focused");
    });
  }, [triageFilter, focusedId, casualties, ready]);

  /* ================= CAMERA FOCUS ================= */
  useEffect(() => {
    if (!ready || !mapRef.current) return;

    if (!focusedId) {
      mapRef.current.flyTo({
        center: [77.1175, 28.7488],
        zoom: 16,
        speed: 1.1,
      });
      return;
    }

    const c = casualties.find((x) => x.id === focusedId);
    if (!c) return;

    mapRef.current.flyTo({
      center: [c.lng, c.lat],
      zoom: 19,
      speed: 0.9,
      curve: 1.3,
      essential: true,
    });
  }, [focusedId, casualties, ready]);

  return (
    <>
      <div ref={containerRef} className="map-container" />
      {ready && (
        <UavLayer
          map={mapRef.current}
          uavs={uavs}
          focusedUavId={focusedUavId}
        />
      )}
    </>
  );
}

/* ================= HELPERS ================= */

function emptyFeature() {
  return { type: "FeatureCollection", features: [] };
}

function buildFeature(points = []) {
  if (!points || points.length < 2) return emptyFeature();

  const closed = points.length >= 3 ? [...points, points[0]] : points;

  return {
    type: "Feature",
    geometry: {
      type: points.length >= 3 ? "Polygon" : "LineString",
      coordinates:
        points.length >= 3
          ? [closed.map((p) => [p.lng, p.lat])]
          : closed.map((p) => [p.lng, p.lat]),
    },
  };
}

function addFenceLayers(map, id, color) {
  if (!map.getLayer(`${id}-fill`)) {
    map.addLayer({
      id: `${id}-fill`,
      type: "fill",
      source: id,
      paint: {
        "fill-color": ["literal", color],
        "fill-opacity": 0.25,
      },
    });
  }

  if (!map.getLayer(`${id}-line`)) {
    map.addLayer({
      id: `${id}-line`,
      type: "line",
      source: id,
      paint: {
        "line-color": ["literal", color],
        "line-width": 2,
      },
    });
  }
}

import { useState } from "react";

import casualties from "../data/casualty.json";
import uavs from "../data/uavs.json";

import CasualtyMap from "../components/CasualtyMap";
import UavDrawer from "../components/UavDrawer";
import ControlPanel from "../components/ControlPanel";

import "./CasualtyPage.css";

export default function CasualtyPage({
  globalGeofence,
  setGlobalGeofence,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [triageFilter, setTriageFilter] = useState("all");
  const [focusedId, setFocusedId] = useState(null);

  const [uavCollapsed, setUavCollapsed] = useState(false);
  const [hoveredUavId, setHoveredUavId] = useState(null);
  const [lockedUavId, setLockedUavId] = useState(null);

  const hoveredUav = uavs.find((u) => u.id === hoveredUavId) || null;
  const lockedUav = uavs.find((u) => u.id === lockedUavId) || null;
  const activeUav = lockedUav || hoveredUav;

  const clearUavSelection = () => {
    setLockedUavId(null);
    setHoveredUavId(null);
  };

  const [uavGeofences, setUavGeofences] = useState({});

  const applyUavGeofence = (uavId, points) => {
    setUavGeofences((prev) => ({ ...prev, [uavId]: points }));
  };

  return (
    <div className="casualty-page">
      <div className="map-layer">
        <CasualtyMap
          casualties={casualties}
          triageFilter={triageFilter}
          focusedId={focusedId}
          uavs={uavs}
          focusedUavId={activeUav?.id || null}
          globalGeofence={globalGeofence}
          uavGeofences={uavGeofences}
        />
      </div>

      <div className="ui-layer">
        <UavDrawer
          uavs={uavs}
          collapsed={uavCollapsed}
          setCollapsed={setUavCollapsed}
          focusedUavId={hoveredUavId}
          setFocusedUavId={setHoveredUavId}
          lockedUavId={lockedUavId}
          setLockedUavId={setLockedUavId}
        />

        <div className={`right-ui ${collapsed ? "collapsed" : ""}`}>
          <div className="triage-filters">
            {["red", "yellow", "green", "black", "all"].map((t) => (
              <button
                key={t}
                className={`filter-btn ${triageFilter === t ? "active" : ""}`}
                onClick={() => setTriageFilter(t)}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="drawer">
            <button
              className="drawer-toggle"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? "‹" : "›"}
            </button>

            <div className="casualty-list">
              {casualties
                .filter(
                  (c) =>
                    triageFilter === "all" || c.triage === triageFilter
                )
                .map((c) => (
                  <button
                    key={c.id}
                    className={`casualty-btn triage-${c.triage}`}
                    style={{ "--idColor": c.idColor }}
                    onMouseEnter={() => setFocusedId(c.id)}
                    onMouseLeave={() => setFocusedId(null)}
                  >
                    <span className="pixel-fill" />
                    <span className="label">{c.id}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>

        <div className="bottom-safe-area">
          <ControlPanel
            uavs={uavs}
            activeUav={activeUav}
            onClearSelection={clearUavSelection}
            onApplyGlobalGeofence={setGlobalGeofence}
            onApplyUavGeofence={applyUavGeofence}
          />
        </div>
      </div>
    </div>
  );
}

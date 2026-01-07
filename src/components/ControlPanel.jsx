import { useEffect, useRef, useState } from "react";
import "./ControlPanel.css";

const FLIGHT_MODES = [
  "STABILIZE",
  "ALT_HOLD",
  "LOITER",
  "GUIDED",
  "AUTO",
  "RTL",
  "LAND",
];

export default function ControlPanel({
  uavs,
  activeUav,
  onClearSelection,
  onApplyGlobalGeofence,
  onApplyUavGeofence,
}) {
  const fileInputRef = useRef(null);

  /* 🔒 freeze target across file dialog */
  const [pendingTarget, setPendingTarget] = useState(null);

  const [selectedMode, setSelectedMode] = useState("");
  const [appliedMode, setAppliedMode] = useState("");

  /* ================= MODE SYNC ================= */
  useEffect(() => {
    if (activeUav) {
      const mode = activeUav.mode || "GUIDED";
      setSelectedMode(mode);
      setAppliedMode(mode);
    }
  }, [activeUav]);

  /* ================= LOAD CLICK ================= */
  const handleLoadClick = () => {
    setPendingTarget(activeUav ? activeUav.id : "GLOBAL");
    fileInputRef.current?.click();
  };

  /* ================= FILE LOAD ================= */
  const handleFileLoad = (e) => {
    const file = e.target.files?.[0];
    if (!file || !pendingTarget) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);

        if (
          !Array.isArray(data) ||
          !data.every(
            (p) =>
              typeof p.lat === "number" &&
              typeof p.lng === "number"
          )
        ) {
          alert("Expected format: [{ lat, lng }, ...]");
          return;
        }

        /* ✅ apply to frozen target */
        if (pendingTarget === "GLOBAL") {
          onApplyGlobalGeofence(data);
        } else {
          onApplyUavGeofence(pendingTarget, data);
        }
      } catch {
        alert("Invalid JSON");
      } finally {
        setPendingTarget(null);
      }
    };

    reader.readAsText(file);
    e.target.value = "";
  };

  /* ================= GLOBAL MODE ================= */
  if (!activeUav) {
    return (
      <div className="control-panel global">
        <div className="uav-group">
          {uavs.map((uav) => (
            <div key={uav.id} className="uav-chip">
              <span
                className="uav-dot"
                style={{ background: uav.idColor }}
              />
              <span>{uav.id}</span>
            </div>
          ))}
        </div>

        <div className="global-actions">
          <button className="action-btn primary" onClick={handleLoadClick}>
            LOAD GEOFENCE
          </button>
          <button className="action-btn primary">START MISSION</button>
          <button className="action-btn danger">LAND ALL UAVs</button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          hidden
          onChange={handleFileLoad}
        />
      </div>
    );
  }

  /* ================= UAV MODE ================= */
  return (
    <div
      className="control-panel active"
      style={{ "--uavColor": activeUav.idColor }}
    >
      <div className="uav-indicator">
        <span className="uav-dot" />
        <span>{activeUav.id}</span>
      </div>

      <div className="mode-control">
        <span className="section-label">Flight Mode</span>
        <select
          className="mode-select"
          value={selectedMode}
          onChange={(e) => setSelectedMode(e.target.value)}
        >
          {FLIGHT_MODES.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <button
          className={`mode-set-btn ${
            selectedMode !== appliedMode ? "pending" : "applied"
          }`}
          disabled={selectedMode === appliedMode}
          onClick={() => setAppliedMode(selectedMode)}
        >
          SET
        </button>
      </div>

      <div className="action-section">
        <span className="section-label">Arming</span>
        <div className="action-row">
          <button className="action-btn blue">ARM</button>
          <button className="action-btn orange">DISARM</button>
          <button className="action-btn red">FORCE ARM</button>
        </div>
      </div>

      <div className="action-section">
        <span className="section-label">System</span>
        <div className="action-row">
          <button className="action-btn orange">PRELAUNCH REBOOT</button>
          <button className="action-btn orange">AUTOPILOT REBOOT</button>
          <button className="action-btn red">KILL MOTORS</button>
        </div>
      </div>

      <button
        className="action-btn primary load-geofence"
        onClick={handleLoadClick}
      >
        LOAD GEOFENCE
      </button>

      <button className="action-btn ghost" onClick={onClearSelection}>
        ← ALL UAVs
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        hidden
        onChange={handleFileLoad}
      />
    </div>
  );
}

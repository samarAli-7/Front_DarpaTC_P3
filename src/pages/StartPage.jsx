import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import PixelTransition from "../components/PixelTransition";
import CasualtyMap from "../components/CasualtyMap";
import status from "../data/status.json";
import "./StartPage.css";

export default function StartPage({
  globalGeofence,
  setGlobalGeofence,
}) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const gateOpen = status.gate === "1" || status.gate === "OPEN";
  const missionReady = status.mission_ready === true;

  const [overrideHeld, setOverrideHeld] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [geofencing, setGeofencing] = useState(false);

  /* ================= SHIFT OVERRIDE ================= */
  useEffect(() => {
    const down = (e) => e.key === "Shift" && setOverrideHeld(true);
    const up = (e) => e.key === "Shift" && setOverrideHeld(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const canEnterNormally = gateOpen && missionReady;
  const canOverride = gateOpen && !missionReady && overrideHeld;
  const canEnter = canEnterNormally || canOverride;

  /* ================= SAFE ENTER ================= */
  const handleEnter = () => {
    if (!canEnter) return;

    // 🔒 HARD STOP geofencing BEFORE navigation
    setGeofencing(false);

    setTransitioning(true);
    setTimeout(() => {
      navigate("/casualty");
    }, 650);
  };

  /* ================= MAP CLICK ================= */
  const handleAddPoint = ({ lat, lng }) => {
    setGlobalGeofence((prev) => [...prev, { lat, lng }]);
  };

  /* ================= LOAD ================= */
  const handleLoad = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);

        if (Array.isArray(data)) {
          setGlobalGeofence(data);
        } else if (Array.isArray(data.points)) {
          setGlobalGeofence(data.points);
        } else if (Array.isArray(data.global)) {
          setGlobalGeofence(data.global);
        } else {
          alert("Invalid geofence format");
        }
      } catch {
        alert("Invalid JSON");
      }
    };
    reader.readAsText(file);
  };

  /* ================= SAVE ================= */
  const handleSave = () => {
    const blob = new Blob(
      [JSON.stringify(globalGeofence, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "global_geofence.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PixelTransition active={transitioning} />

      <div className={`start-shell ${geofencing ? "geofencing" : ""}`}>
        {/* LEFT PANEL */}
        <div className="start-container">
          <img src="/logo.png" alt="Mission Logo" className="logo" />
          <h1>DTC – PHASE 3</h1>

          <div className="status-panel">
            <div>
              <span className="label">Gate:</span>
              <span className={`value ${gateOpen ? "open" : "closed"}`}>
                {status.gate}
              </span>
            </div>
            <div>
              <span className="label">Telemetry:</span>
              <span className="value">{status.telemetry_connected}</span>
            </div>
            <div>
              <span className="label">Mission Ready:</span>
              <span className={`value ${missionReady ? "open" : "closed"}`}>
                {missionReady ? "YES" : "NO"}
              </span>
            </div>
          </div>

          <button
            className="enter-btn"
            disabled={!canEnter}
            onClick={handleEnter}
          >
            {canOverride ? "OVERRIDE" : "ENTER MISSION"}
          </button>

          <button
            className="geofence-btn"
            onClick={() => setGeofencing((v) => !v)}
          >
            {geofencing ? "CLOSE GEOFENCING" : "GEOFENCING"}
          </button>
        </div>

        {/* RIGHT PANEL */}
        {geofencing && (
          <div className="geofence-panel">
            <div className="geofence-header">
              <span>GLOBAL GEOFENCE</span>
              <div className="geo-actions">
                <button onClick={() => fileInputRef.current.click()}>
                  LOAD
                </button>
                <button onClick={handleSave}>SAVE</button>
                <button
                  className="danger"
                  onClick={() => setGlobalGeofence([])}
                >
                  CLEAR
                </button>
              </div>
            </div>

            <div className="geofence-map">
              <CasualtyMap
                casualties={[]}
                triageFilter="all"
                focusedId={null}
                uavs={[]}
                focusedUavId={null}
                globalGeofence={globalGeofence}
                uavGeofences={{}}

                // ✅ ONLY pass onAddPoint when geofencing is active
                onAddPoint={geofencing ? handleAddPoint : null}
              />
            </div>

            <div className="geofence-footer">
              Click on map to add points • {globalGeofence.length} points
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              hidden
              onChange={handleLoad}
            />
          </div>
        )}
      </div>
    </>
  );
}

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";

import StartPage from "./pages/StartPage";
import CasualtyPage from "./pages/CasualtyPage";

import "./App.css";

export default function App() {
  // 🔴 ONE global geofence state for entire app
  const [globalGeofence, setGlobalGeofence] = useState([]);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <StartPage
              globalGeofence={globalGeofence}
              setGlobalGeofence={setGlobalGeofence}
            />
          }
        />

        <Route
          path="/casualty"
          element={
            <CasualtyPage
              globalGeofence={globalGeofence}
              setGlobalGeofence={setGlobalGeofence}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

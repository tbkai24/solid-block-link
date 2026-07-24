import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";
import { MaintenancePage } from "./pages/MaintenancePage";

const maintenanceMode = import.meta.env.VITE_MAINTENANCE_MODE === "true";
const allowAdminDuringMaintenance =
  import.meta.env.VITE_MAINTENANCE_ALLOW_ADMIN === "true";
const isAdminRoute = window.location.pathname.startsWith("/admin");
const showMaintenance =
  maintenanceMode && (!allowAdminDuringMaintenance || !isAdminRoute);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {showMaintenance ? <MaintenancePage /> : <RouterProvider router={router} />}
  </React.StrictMode>
);

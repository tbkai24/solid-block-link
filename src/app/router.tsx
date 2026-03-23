import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./AppShell";
import { AboutPage } from "../pages/AboutPage";
import { CampaignsPage } from "../pages/CampaignsPage";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { PastCampaignsPage } from "../pages/PastCampaignsPage";
import { UpdatesPage } from "../pages/UpdatesPage";
import { AdminLoginPage } from "../pages/admin/AdminLoginPage";
import { AdminPage } from "../pages/admin/AdminPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "campaigns", element: <CampaignsPage /> },
      { path: "updates", element: <UpdatesPage /> },
      { path: "past-campaigns", element: <PastCampaignsPage /> },
      { path: "about", element: <AboutPage /> },
      { path: "admin/login", element: <AdminLoginPage /> },
      { path: "admin", element: <AdminPage /> },
      { path: "*", element: <NotFoundPage /> }
    ]
  }
]);

// src/app/router.tsx
import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./AppShell";
import { AboutPage } from "../pages/AboutPage";
import { AccountPage } from "../pages/AccountPage";
import { AnnouncementsPage } from "../pages/AnnouncementsPage";
import { CampaignsPage } from "../pages/CampaignsPage";
import { ContactPage } from "../pages/ContactPage";
import { DonationLookupPage } from "../pages/DonationLookupPage";
import { FanProjectsPage } from "../pages/FanProjectsPage";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { PastCampaignsPage } from "../pages/PastCampaignsPage";
import { TransparencyReportPage } from "../pages/TransparencyReportPage";
import { UpdatesPage } from "../pages/UpdatesPage";
import { LoginPage } from "../pages/LoginPage";
import { SignupPage } from "../pages/SignupPage";
import { AdminLoginPage } from "../pages/admin/AdminLoginPage";
import { AdminPage } from "../pages/admin/AdminPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "fan-projects", element: <FanProjectsPage /> },
      { path: "announcements", element: <AnnouncementsPage /> },
      { path: "lookup", element: <DonationLookupPage /> },
      { path: "campaigns", element: <CampaignsPage /> },
      { path: "contact", element: <ContactPage /> },
      { path: "updates", element: <UpdatesPage /> },
      { path: "past-campaigns", element: <PastCampaignsPage /> },
      { path: "transparency-report", element: <TransparencyReportPage /> },
      { path: "about", element: <AboutPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "signup", element: <SignupPage /> },
      { path: "account", element: <AccountPage /> },
      { path: "admin/login", element: <AdminLoginPage /> },
      { path: "admin", element: <AdminPage /> },
      { path: "*", element: <NotFoundPage /> }
    ]
  }
]);

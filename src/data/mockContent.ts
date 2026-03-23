import { SiteContent } from "../types/content";

export const siteContent: SiteContent = {
  logoUrl: "",
  heroTitle: "Power the Global Rise of SB19",
  heroSummary:
    "Solid Block Link brings together donation drives, campaign visibility, and curated updates that help promote SB19 worldwide.",
  donateCta: { label: "Donate Now", href: "#" },
  lookupCta: { label: "SBL Donation Lookup", href: "#" },
  about: {
    title: "About Solid Block Link",
    introTitle: "Introduction",
    intro:
      "Solid Block Link is a fan-powered marketing and donation platform focused on promoting SB19 worldwide through transparent drives, curated updates, and organized campaign action.",
    storyTitle: "Story",
    story:
      "The platform is built to turn support into visible movement by combining campaigns, donation drives, curated updates, and a clear record of what the community is building together.",
    missionTitle: "Mission",
    mission:
      "Its mission is to keep supporters informed, make contribution pathways clear, and help every campaign feel measurable, credible, and worth joining."
  },
  milestone: {
    title: "",
    nextAmount: 0,
    isVisible: false
  },
  campaignMilestones: [
    {
      id: "milestone-1",
      title: "Milestone 1",
      targetAmount: 650000,
      rowStart: 2,
      rowEnd: 100,
      status: "Active",
      displayOrder: 1,
      raisedAmount: 388309,
      donorCount: 92,
      percent: 59.74,
      note: "First funding bucket for the campaign launch window."
    },
    {
      id: "milestone-2",
      title: "Milestone 2",
      targetAmount: 350000,
      rowStart: 101,
      rowEnd: 180,
      status: "Active",
      displayOrder: 2,
      raisedAmount: 0,
      donorCount: 0,
      percent: 0,
      note: "Second funding bucket that starts after the first row cutoff."
    }
  ],
  footer: {
    title: "Connect with Solid Block Link",
    summary: "Fan-powered marketing and donation campaigns helping promote SB19 worldwide."
  },
  currentCampaign: {
    id: "campaign-1",
    title: "Current Campaign: Worldwide Promo Push",
    status: "Active",
    summary:
      "The active drive supports fan-powered marketing, promo content rollout, and high-impact visibility efforts for SB19.",
    outcome: "Live now"
  },
  progress: {
    totalRaised: 0,
    publicRaised: 0,
    donorCount: 0,
    internalDonorCount: 0,
    goal: 0,
    internalRaised: 0,
    percent: 0,
    lastUpdated: "Waiting for live data"
  },
  updates: [
    {
      id: "update-1",
      title: "Donation milestone reached",
      summary: "Solid Block Link passed the 60% mark and unlocked the next rollout phase.",
      label: "Latest Update",
      platform: "Facebook",
      date: "March 18, 2026",
      href: "/updates",
      featured: true
    },
    {
      id: "update-2",
      title: "Promo materials refreshed",
      summary: "The current campaign toolkit was updated with cleaner copy and wider global-use graphics.",
      label: "Latest Update",
      platform: "Instagram",
      date: "March 16, 2026",
      href: "/updates",
      featured: false
    },
    {
      id: "update-3",
      title: "New campaign wave launched",
      summary: "A fresh round of donation and awareness pushes is now active across core channels.",
      label: "Past Campaign",
      platform: "X",
      date: "March 14, 2026",
      href: "/updates",
      featured: false
    }
  ],
  embeds: [
    { id: "embed-1", title: "Facebook campaign highlight", platform: "Facebook", embedNote: "Featured admin-curated embed." },
    { id: "embed-2", title: "X milestone announcement", platform: "X", embedNote: "Featured admin-curated embed." }
  ],
  pastCampaigns: [
    {
      id: "past-1",
      title: "Holiday visibility drive",
      status: "Completed",
      summary: "A coordinated year-end promotional campaign backed by fans and partners.",
      outcome: "Completed with strong engagement"
    },
    {
      id: "past-2",
      title: "Fan-funded release push",
      status: "Completed",
      summary: "A donation-backed push focused on widening reach around key release windows.",
      outcome: "Goal surpassed"
    }
  ]
};

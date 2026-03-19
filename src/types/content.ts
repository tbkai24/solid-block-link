export type CtaLink = {
  label: string;
  href: string;
};

export type ProgressStats = {
  totalRaised: number;
  publicRaised: number;
  donorCount: number;
  goal: number;
  internalRaised: number;
  percent: number;
  lastUpdated: string;
};

export type UpdateItem = {
  id: string;
  title: string;
  summary: string;
  label: string;
  platform: string;
  date: string;
  href: string;
  featured: boolean;
};

export type EmbedItem = {
  id: string;
  title: string;
  platform: string;
  embedNote: string;
};

export type CampaignItem = {
  id: string;
  title: string;
  status: "Active" | "Completed";
  summary: string;
  outcome: string;
};

export type AboutContent = {
  title: string;
  introTitle: string;
  intro: string;
  storyTitle: string;
  story: string;
  missionTitle: string;
  mission: string;
};

export type FooterContent = {
  title: string;
  summary: string;
};

export type MilestoneContent = {
  title: string;
  nextAmount: number;
  isVisible: boolean;
};

export type SiteContent = {
  logoUrl: string;
  heroTitle: string;
  heroSummary: string;
  donateCta: CtaLink;
  lookupCta: CtaLink;
  about: AboutContent;
  footer: FooterContent;
  milestone: MilestoneContent;
  currentCampaign: CampaignItem;
  progress: ProgressStats;
  updates: UpdateItem[];
  embeds: EmbedItem[];
  pastCampaigns: CampaignItem[];
};

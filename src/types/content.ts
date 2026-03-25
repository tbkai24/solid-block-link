export type CtaLink = {
  label: string;
  href: string;
};

export type ProgressStats = {
  totalRaised: number;
  publicRaised: number;
  donorCount: number;
  internalDonorCount: number;
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

export type CampaignMilestoneItem = {
  id: string;
  title: string;
  targetAmount: number;
  rowStart: number;
  rowEnd: number;
  status: "Active" | "Completed";
  displayOrder: number;
  raisedAmount: number;
  donorCount: number;
  percent: number;
  note: string;
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
  campaignMilestones: CampaignMilestoneItem[];
  currentCampaign: CampaignItem;
  progress: ProgressStats;
  updates: UpdateItem[];
  embeds: EmbedItem[];
  pastCampaigns: CampaignItem[];
};

export type SiteMetricsPayload = {
  progress: ProgressStats;
  campaignMilestones: Array<Pick<CampaignMilestoneItem, "id" | "raisedAmount" | "donorCount" | "percent">>;
  milestone: MilestoneContent;
};

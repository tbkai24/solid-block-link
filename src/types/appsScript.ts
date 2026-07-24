export type DonationSummaryMilestoneInput = {
  milestoneId: string;
  title: string;
  rowStart: number;
  rowEnd: number;
};

export type DonationSummaryMilestoneResponse = {
  milestoneId: string;
  title: string;
  rowStart: number;
  rowEnd: number;
  totalDonations: number;
  donorCount: number;
  donationEntries: number;
};

export type DonationSummaryResponse = {
  ok: boolean;
  message: string;
  totalDonations: number;
  donorCount: number;
  donationEntries: number;
  milestones?: DonationSummaryMilestoneResponse[];
};

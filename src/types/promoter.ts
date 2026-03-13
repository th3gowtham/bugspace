export type ReferralValidationStatus = "valid" | "suspicious" | "rejected";

export interface PromoterRecord {
  promoterId: string;
  username: string;
  email: string;
  passwordHash: string;
  promoCode: string;
  createdAt: Date;
  totalSignups: number;
  premiumConversions: number;
  commissionEarned: number;
  rewardPremiumMonths: number;
  deviceFingerprint?: string | null;
}

export interface PromoterReferralRecord {
  referralId: string;
  promoCode: string;
  userId: string;
  userEmail: string;
  signupTimestamp: Date;
  ipAddress: string | null;
  deviceFingerprint: string;
  status: ReferralValidationStatus;
  premiumStatus: boolean;
  premiumPurchaseDate: Date | null;
  premiumAmount: number | null;
  commissionAmount: number | null;
  reviewNote: string | null;
}

export interface PromoterSession {
  promoterId: string;
  username: string;
  email: string;
  promoCode: string;
}

export interface PromoterDashboardSummary {
  promoter: PromoterRecord;
  referralLink: string;
  rewardProgress: {
    validReferralsTowardReward: number;
    requiredForNextReward: number;
    nextRewardMonths: number;
  };
}

export interface PromoterListItem {
  promoterId: string;
  username: string;
  email: string;
  promoCode: string;
  totalSignups: number;
  premiumConversions: number;
  commissionEarned: number;
  rewardPremiumMonths: number;
  createdAt: Date;
}

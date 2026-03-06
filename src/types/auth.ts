export type UserRole = "user" | "employer" | "admin";

export interface UserData {
  uid: string;
  fullName: string;
  email: string;
  createdAt: Date;
  provider: "password" | "google";
  emailVerified: boolean;
  // Referral system
  referralCode:  string;
  referralCount: number;
  referredBy:    string | null;
  premiumUntil:  Date | null;
}

export interface AdminData {
  uid: string;
  addedBy: string;
  createdAt: Date;
}

export interface EmployerData {
  uid: string;
  approvedBy: string;
  createdAt: Date;
  status: "active" | "inactive";
}

export interface AuthUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  role: UserRole;
  userData: UserData | null;
}

export type UserRole = "user" | "employer" | "admin";

export interface UserData {
  uid: string;
  fullName: string;
  email: string;
  createdAt: Date;
  provider: "password" | "google";
  emailVerified: boolean;
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

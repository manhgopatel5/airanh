import { Timestamp } from "firebase/firestore";

export type UserData = {
  uid: string;
  displayName: string;
  email: string | null;
  phone?: string;
  userId: string;
  photoURL: string | null;
  bio?: string;
  online?: boolean;
  lastSeen?: Timestamp;
  createdAt?: Timestamp;
  emailVerified?: boolean;
  verified: boolean;
  hidePhone?: boolean;
  stats?: { tasks: number; plans: number; completed: number; rating: number };
  nameLower: string;
  username?: string;
  status: "active" | "banned" | "deleted" | "deactivated";
  lastNameChangeAt?: Timestamp;
  lastAvatarChangeAt?: Timestamp;
};
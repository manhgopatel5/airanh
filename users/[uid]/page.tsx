import { Timestamp } from "firebase/firestore";
type User = {
  uid: string;
  name: string;
  email: string;
  avatar: string;
  friends: string[];
  isOnline: boolean;
  lastSeen: Timestamp;
};
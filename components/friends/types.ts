export type UserSuggestion = {
  uid: string;
  username: string;
  name: string;
  avatarUrl?: string | undefined;
  status?: "none" | "friend" | "sent" | "received";
  distance?: number;
  age?: number | undefined;
  gender?: "male" | "female" | "other" | undefined;
  mutualFriends?: number;
};

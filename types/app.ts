export type AppMode = "task" | "plan";

export type Task = {
  id: string;
  title: string;
  price: number;
  desc: string;
  location: string;
  deadline: string;
  category: "ship" | "mua_ho" | "don_dep" | "other";
  authorId: string;
  status: "open" | "taken" | "done";
  createdAt: string;
};

export type Plan = {
  id: string;
  title: string;
  category: "food" | "nightlife" | "outdoor" | "social" | "other";
  desc: string;
  location: string;
  time: string;
  privacy: "open" | "private";
  ageRange: [number, number];
  maxMember: number;
  members: string[];
  authorId: string;
  createdAt: string;
};
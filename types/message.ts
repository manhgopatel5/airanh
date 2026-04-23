export type Message = {
  id: string;
  chatId: string;
  senderId: string;
  text?: string;
  image?: string;
  file?: string;
  fileName?: string;
  location?: { lat: number; lng: number };
  type: "text" | "image" | "file" | "location";
  createdAt: any;
  seenBy: string[];
  replyTo?: { id: string; text: string; userName: string };
  reactions?: Record<string, string>;
};
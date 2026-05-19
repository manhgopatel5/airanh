export type Message = {
  id: string;
  chatId: string;
  senderId: string;

  // content
  text?: string;
  image?: string;
  file?: string;
  fileName?: string;
  location?: { lat: number; lng: number };

  type:
    | "text"
    | "image"
    | "file"
    | "location"
    | "video"
    | "task_share";

  // task share
  taskId?: string;
  taskTitle?: string;
  taskType?: "task" | "plan";
  price?: number;

  // time
  createdAt: any;

  // read / seen
  seenBy: string[];

  status?: "sending" | "sent" | "read";

  // reply
  replyTo?: {
    id: string;
    text: string;
    userName: string;
  };

  // reactions
  reactions?: Record<string, string>;
};

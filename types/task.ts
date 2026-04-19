export type Task = {
  id: string;
  title?: string;
  price?: number;
  likes?: number;
  joined?: number;
  totalSlots?: number;
  createdAt?: {
    seconds: number;
  };

  user?: string;
  userId?: string;
  avatar?: string;
  description?: string;
  deadline?: number;

  images?: string[]; // 👈 thêm dòng này
};
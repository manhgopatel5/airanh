import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTaskSnapshot,
} from "firebase/storage";
import { storage } from "./firebase";
import { nanoid } from "nanoid";

export class UploadError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "UploadError";
  }
}

/* ================= CONFIG ================= */
// ✅ FIX 1: Sửa MAX_IMAGE_SIZE từ 5KB thành 5MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILE_SIZE = 20 * 1024; // 20MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export type UploadProgress = {
  bytesTransferred: number;
  totalBytes: number;
  progress: number; // 0-100
};

export type UploadResult = {
  url: string;
  path: string;
  name: string;
  size: number;
  type: string;
};

/* ================= COMPRESS IMAGE ================= */
const compressImage = async (file: File, maxWidth = 1920, quality = 0.8): Promise<File> => {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const objectUrl = URL.createObjectURL(file); // ✅ FIX 2: Tạo biến để revoke

    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl); // ✅ FIX 2: Revoke tránh leak memory
          if (!blob) return reject(new UploadError("Compress thất bại"));
          const compressed = new File([blob], file.name, { type: "image/jpeg" });
          resolve(compressed);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl); // ✅ FIX 2: Revoke khi lỗi
      reject(new UploadError("Đọc ảnh thất bại"));
    };
    img.src = objectUrl;
  });
};

/* ================= VALIDATE FILE ================= */
const validateFile = (file: File, type: "image" | "file") => {
  const isImage = type === "image";
  const maxSize = isImage? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
  const allowedTypes = isImage? ALLOWED_IMAGE_TYPES : [...ALLOWED_IMAGE_TYPES,...ALLOWED_FILE_TYPES];

  if (file.size > maxSize) {
    throw new UploadError(
      `File quá lớn. Tối đa ${maxSize / 1024 / 1024}MB`,
      "FILE_TOO_LARGE"
    );
  }

  if (!allowedTypes.includes(file.type)) {
    throw new UploadError(
      isImage? "Chỉ chấp nhận JPG, PNG, WebP, GIF" : "File không được hỗ trợ",
      "INVALID_TYPE"
    );
  }
};

/* ================= UPLOAD SINGLE FILE ================= */
export const uploadFile = async (
  file: File,
  path: "posts" | "tasks" | "avatars" | "chat" | "attachments",
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  const isImage = file.type.startsWith("image/");
  validateFile(file, isImage? "image" : "file");

  // Compress nếu là ảnh
  const fileToUpload = isImage? await compressImage(file) : file;

  const ext = file.name.split(".").pop() || "bin";
  const fileName = `${nanoid(16)}.${ext}`;
  const filePath = `${path}/${userId}/${fileName}`;
  const storageRef = ref(storage, filePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

    uploadTask.on(
      "state_changed",
      (snapshot: UploadTaskSnapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.({
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
          progress,
        });
      },
      (error) => {
        console.error("Upload error:", error);
        reject(new UploadError("Upload thất bại", error.code));
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            url,
            path: filePath,
            name: file.name,
            size: fileToUpload.size,
            type: fileToUpload.type,
          });
        } catch (err) {
          reject(new UploadError("Lấy URL thất bại"));
        }
      }
    );
  });
};

/* ================= UPLOAD MULTIPLE FILES ================= */
export const uploadMultipleFiles = async (
  files: File[],
  path: "posts" | "tasks" | "avatars" | "chat" | "attachments",
  userId: string,
  onProgress?: (index: number, progress: UploadProgress) => void
): Promise<UploadResult[]> => {
  if (files.length > 10) throw new UploadError("Tối đa 10 file", "TOO_MANY_FILES");

  // ✅ FIX 3: Upload song song thay vì tuần tự cho nhanh
  const uploadPromises = files.map((file, i) =>
    uploadFile(file, path, userId, (p) => onProgress?.(i, p))
  );
  return Promise.all(uploadPromises);
};

/* ================= DELETE FILE ================= */
export const deleteFile = async (path: string): Promise<void> => {
  if (!path) return;
  try {
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
  } catch (err: any) {
    // Bỏ qua lỗi file không tồn tại
    if (err.code!== "storage/object-not-found") {
      console.error("Delete file error:", err);
      throw new UploadError("Xóa file thất bại");
    }
  }
};

/* ================= GET FILE INFO ================= */
export const getFileType = (file: File): "image" | "file" => {
  return file.type.startsWith("image/")? "image" : "file";
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

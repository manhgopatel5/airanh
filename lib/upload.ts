"use client"; // ✅ THÊM DÒNG NÀY

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTaskSnapshot,
} from "firebase/storage";
import { getFirebaseStorage } from "./firebase";
import { nanoid } from "nanoid";

export class UploadError extends Error {
  const storage = getFirebaseStorage();
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "UploadError";
  }
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
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
  progress: number;
};

export type UploadResult = {
  url: string;
  path: string;
  name: string;
  size: number;
  type: string;
};

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

export const uploadFile = async (
  file: File,
  path: "posts" | "tasks" | "avatars" | "chat" | "attachments",
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  const isImage = file.type.startsWith("image/");
  validateFile(file, isImage? "image" : "file");

  // Dynamic import chỉ chạy ở client
  let fileToUpload = file;
  if (isImage && typeof window!== 'undefined') {
    const { compressImageClient } = await import('./upload.client');
    fileToUpload = await compressImageClient(file);
  }

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

export const uploadMultipleFiles = async (
  files: File[],
  path: "posts" | "tasks" | "avatars" | "chat" | "attachments",
  userId: string,
  onProgress?: (index: number, progress: UploadProgress) => void
): Promise<UploadResult[]> => {
  if (files.length > 10) throw new UploadError("Tối đa 10 file", "TOO_MANY_FILES");

  const uploadPromises = files.map((file, i) =>
    uploadFile(file, path, userId, (p) => onProgress?.(i, p))
  );
  return Promise.all(uploadPromises);
};

export const deleteFile = async (path: string): Promise<void> => {
  if (!path) return;
  try {
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
  } catch (err: any) {
    if (err.code!== "storage/object-not-found") {
      console.error("Delete file error:", err);
      throw new UploadError("Xóa file thất bại");
    }
  }
};

export const getFileType = (file: File): "image" | "file" => {
  return file.type.startsWith("image/")? "image" : "file";
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024).toFixed(1)} MB`;
};
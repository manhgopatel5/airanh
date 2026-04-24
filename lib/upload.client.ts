"use client";

export const compressImageClient = async (
  file: File,
  maxWidth = 1920,
  quality = 0.8
): Promise<File> => {
  // Bỏ qua GIF và file không phải ảnh
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }

  // Nếu file < 500KB và width < maxWidth thì khỏi nén
  if (file.size < 500 * 1024) {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    try {
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = objectUrl;
      });
      if (img.width <= maxWidth) {
        URL.revokeObjectURL(objectUrl);
        return file;
      }
    } catch {
      URL.revokeObjectURL(objectUrl);
      return file;
    }
    URL.revokeObjectURL(objectUrl);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Canvas context không khả dụng"));
      return;
    }

    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      let { width, height } = img;

      // Chỉ resize nếu > maxWidth
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Tăng chất lượng render
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error("Compress thất bại"));
            return;
          }

          // Nếu file nén to hơn file gốc thì dùng file gốc
          if (blob.size >= file.size) {
            resolve(file);
            return;
          }

          const compressed = new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
            type: "image/jpeg",
            lastModified: Date.now()
          });
          resolve(compressed);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Đọc ảnh thất bại"));
    };

    img.src = objectUrl;
  });
};
import type { Timestamp } from "firebase/firestore";

const NAME_CHANGE_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;

export function validateDisplayName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 2) return "Tên tối thiểu 2 ký tự";
  if (trimmed.length > 50) return "Tên tối đa 50 ký tự";

  const regex =
    /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂẾưăạảấầẩẫậắằẳẵặẹẻẽềểếỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ\s\d]+$/;

  if (!regex.test(trimmed)) return "Tên chỉ được chứa chữ cái, số và dấu cách";
  if (/\s{2,}/.test(trimmed)) return "Không được có 2 dấu cách liên tiếp";
  return null;
}

export function canChangeName(lastNameChangeAt?: Timestamp | null): {
  allowed: boolean;
  nextDate?: string;
} {
  if (!lastNameChangeAt?.toDate) return { allowed: true };

  const lastChange = lastNameChangeAt.toDate();
  const nextChange = new Date(lastChange.getTime() + NAME_CHANGE_COOLDOWN_MS);
  if (Date.now() < nextChange.getTime()) {
    return {
      allowed: false,
      nextDate: nextChange.toLocaleDateString("vi-VN"),
    };
  }
  return { allowed: true };
}

export type GeoPosition = {
  lat: number;
  lng: number;
  accuracy?: number;
};

export const GEO_PERMISSION_DENIED_MESSAGE =
  "Bạn đã từ chối quyền định vị. Thoát trang rồi vào lại để cho phép truy cập vị trí.";

export function getGeolocationErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return GEO_PERMISSION_DENIED_MESSAGE;
    case 2:
      return "Không xác định được vị trí. Kiểm tra GPS và thử lại.";
    case 3:
      return "Hết thời gian chờ định vị. Thử lại.";
    default:
      return "Không lấy được vị trí. Hãy bật GPS và thử lại.";
  }
}

export function getCurrentPosition(options?: PositionOptions): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Trình duyệt không hỗ trợ định vị"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        reject(Object.assign(new Error(getGeolocationErrorMessage(err.code)), { code: err.code }));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
        ...options,
      }
    );
  });
}

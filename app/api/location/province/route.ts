import { NextResponse } from "next/server";

export const revalidate = 31536000; // 1 năm

const FALLBACK_PROVINCES = [
  { id: 1, name: "Thành phố Hà Nội", code: "ha_noi" },
  { id: 2, name: "Tỉnh Hà Giang", code: "ha_giang" },
  { id: 4, name: "Tỉnh Cao Bằng", code: "cao_bang" },
  { id: 6, name: "Tỉnh Bắc Kạn", code: "bac_kan" },
  { id: 8, name: "Tỉnh Tuyên Quang", code: "tuyen_quang" },
  { id: 10, name: "Tỉnh Lào Cai", code: "lao_cai" },
  { id: 11, name: "Tỉnh Điện Biên", code: "dien_bien" },
  { id: 12, name: "Tỉnh Lai Châu", code: "lai_chau" },
  { id: 14, name: "Tỉnh Sơn La", code: "son_la" },
  { id: 15, name: "Tỉnh Yên Bái", code: "yen_bai" },
  { id: 17, name: "Tỉnh Hoà Bình", code: "hoa_binh" },
  { id: 19, name: "Tỉnh Thái Nguyên", code: "thai_nguyen" },
  { id: 20, name: "Tỉnh Lạng Sơn", code: "lang_son" },
  { id: 22, name: "Tỉnh Quảng Ninh", code: "quang_ninh" },
  { id: 24, name: "Tỉnh Bắc Giang", code: "bac_giang" },
  { id: 25, name: "Tỉnh Phú Thọ", code: "phu_tho" },
  { id: 26, name: "Tỉnh Vĩnh Phúc", code: "vinh_phuc" },
  { id: 27, name: "Tỉnh Bắc Ninh", code: "bac_ninh" },
  { id: 30, name: "Tỉnh Hải Dương", code: "hai_duong" },
  { id: 31, name: "Thành phố Hải Phòng", code: "hai_phong" },
  { id: 33, name: "Tỉnh Hưng Yên", code: "hung_yen" },
  { id: 34, name: "Tỉnh Thái Bình", code: "thai_binh" },
  { id: 35, name: "Tỉnh Hà Nam", code: "ha_nam" },
  { id: 36, name: "Tỉnh Nam Định", code: "nam_dinh" },
  { id: 37, name: "Tỉnh Ninh Bình", code: "ninh_binh" },
  { id: 38, name: "Tỉnh Thanh Hóa", code: "thanh_hoa" },
  { id: 40, name: "Tỉnh Nghệ An", code: "nghe_an" },
  { id: 42, name: "Tỉnh Hà Tĩnh", code: "ha_tinh" },
  { id: 44, name: "Tỉnh Quảng Bình", code: "quang_binh" },
  { id: 45, name: "Tỉnh Quảng Trị", code: "quang_tri" },
  { id: 46, name: "Tỉnh Thừa Thiên Huế", code: "thua_thien_hue" },
  { id: 48, name: "Thành phố Đà Nẵng", code: "da_nang" },
  { id: 49, name: "Tỉnh Quảng Nam", code: "quang_nam" },
  { id: 51, name: "Tỉnh Quảng Ngãi", code: "quang_ngai" },
  { id: 52, name: "Tỉnh Bình Định", code: "binh_dinh" },
  { id: 54, name: "Tỉnh Phú Yên", code: "phu_yen" },
  { id: 56, name: "Tỉnh Khánh Hòa", code: "khanh_hoa" },
  { id: 58, name: "Tỉnh Ninh Thuận", code: "ninh_thuan" },
  { id: 60, name: "Tỉnh Bình Thuận", code: "binh_thuan" },
  { id: 62, name: "Tỉnh Kon Tum", code: "kon_tum" },
  { id: 64, name: "Tỉnh Gia Lai", code: "gia_lai" },
  { id: 66, name: "Tỉnh Đắk Lắk", code: "dak_lak" },
  { id: 67, name: "Tỉnh Đắk Nông", code: "dak_nong" },
  { id: 68, name: "Tỉnh Lâm Đồng", code: "lam_dong" },
  { id: 70, name: "Tỉnh Bình Phước", code: "binh_phuoc" },
  { id: 72, name: "Tỉnh Tây Ninh", code: "tay_ninh" },
  { id: 74, name: "Tỉnh Bình Dương", code: "binh_duong" },
  { id: 75, name: "Tỉnh Đồng Nai", code: "dong_nai" },
  { id: 77, name: "Tỉnh Bà Rịa - Vũng Tàu", code: "ba_ria_vung_tau" },
  { id: 79, name: "Thành phố Hồ Chí Minh", code: "ho_chi_minh" },
  { id: 80, name: "Tỉnh Long An", code: "long_an" },
  { id: 82, name: "Tỉnh Tiền Giang", code: "tien_giang" },
  { id: 83, name: "Tỉnh Bến Tre", code: "ben_tre" },
  { id: 84, name: "Tỉnh Trà Vinh", code: "tra_vinh" },
  { id: 86, name: "Tỉnh Vĩnh Long", code: "vinh_long" },
  { id: 87, name: "Tỉnh Đồng Tháp", code: "dong_thap" },
  { id: 89, name: "Tỉnh An Giang", code: "an_giang" },
  { id: 91, name: "Tỉnh Kiên Giang", code: "kien_giang" },
  { id: 92, name: "Thành phố Cần Thơ", code: "can_tho" },
  { id: 93, name: "Tỉnh Hậu Giang", code: "hau_giang" },
  { id: 94, name: "Tỉnh Sóc Trăng", code: "soc_trang" },
  { id: 95, name: "Tỉnh Bạc Liêu", code: "bac_lieu" },
  { id: 96, name: "Tỉnh Cà Mau", code: "ca_mau" },
];

export async function GET() {
  try {
    const res = await fetch("https://provinces.open-api.vn/api/p/", {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 31536000 }
    });
    
    if (!res.ok) throw new Error("API bad");
    const data = await res.json();
    
    return NextResponse.json(data.map((p: any) => ({
      id: Number(p.code),
      name: p.name,
      code: p.codename,
    })));
  } catch (e) {
    console.log("Build-time fetch failed, using FALLBACK");
    return NextResponse.json(FALLBACK_PROVINCES);
  }
}
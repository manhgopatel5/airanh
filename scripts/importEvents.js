const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const EVENTS_DATA = [
  {
    id: "1",
    title: "Phượt Núi Bà Đen",
    tag: "TRENDING",
    tagColor: "from-red-500 to-orange-500",
    desc: "Check-in cáp treo mới, săn mây sáng sớm, chùa Bà linh thiêng",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    joined: 128,
    distance: "Cách bạn 95km",
    icon: "⛰️",
    category: "phuot",
    address: "Khu du lịch Núi Bà Đen, Tây Ninh",
    openTime: "6:00 - 18:00 hàng ngày",
    price: "Cáp treo: 250K/người khứ hồi",
    tips: [
      "Đi sáng sớm 5h30 để săn mây đẹp nhất, tránh đông",
      "Mang áo khoác vì trên đỉnh lạnh 18-20°C",
      "Cáp treo chuyến cuối 17:30, đừng để lỡ",
      "Ăn sáng bánh canh Trảng Bàng trước khi leo"
    ],
    gallery: [
      "https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=400",
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400",
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400"
    ],
    mapUrl: "https://maps.app.goo.gl/abc123",
    lat: 11.3732,
    lng: 106.1761,
    rating: 4.8,
    reviews: 2341,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    id: "2",
    title: "Rooftop Bar Landmark 81",
    tag: "HOT",
    tagColor: "from-purple-500 to-pink-500",
    desc: "View toàn SG, cocktail signature 99K, DJ mỗi tối T6-T7",
    image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&q=80",
    joined: 67,
    distance: "Cách bạn 3.2km",
    icon: "🍸",
    category: "bar",
    address: "Tầng 75-76 Landmark 81, Bình Thạnh",
    openTime: "17:00 - 02:00 | Happy Hour: 17-19h",
    price: "Cocktail từ 99K, Mocktail từ 79K",
    tips: [
      "Đặt bàn trước qua hotline để có view đẹp",
      "Dresscode: Smart casual, không dép lào",
      "Happy Hour giảm 30% tất cả đồ uống",
      "Chụp ảnh đẹp nhất lúc 18:30 hoàng hôn"
    ],
    gallery: [
      "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400",
      "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=400",
      "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=400"
    ],
    mapUrl: "https://maps.app.goo.gl/xyz789",
    lat: 10.7946,
    lng: 106.7218,
    rating: 4.7,
    reviews: 1523,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    id: "3",
    title: "Workshop Vẽ Tranh Tối",
    tag: "CUỐI TUẦN",
    tagColor: "from-blue-500 to-cyan-500",
    desc: "Tự vẽ tranh canvas, có hướng dẫn, mang về làm quà",
    image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&q=80",
    joined: 24,
    distance: "Cách bạn 5.8km",
    icon: "🎨",
    category: "workshop",
    address: "42 Nguyễn Huệ, Q1 - Tầng 3",
    openTime: "T7-CN: 14:00, 16:00, 19:00",
    price: "150K/người bao gồm canvas + màu + nước",
    tips: [
      "Không cần biết vẽ, có mẫu sẵn để tô",
      "Nên đặt lịch trước vì mỗi ca chỉ 15 người",
      "Mặc đồ thoải mái, có tạp dề cho mượn",
      "Tranh khô sau 2h, có thể mang về ngay"
    ],
    gallery: [
      "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400",
      "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?w=400",
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400"
    ],
    mapUrl: "https://maps.app.goo.gl/workshop123",
    rating: 4.8,
    reviews: 567,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    id: "4",
    title: "Chợ Đêm Hồ Thị Kỷ",
    tag: "ĂN UỐNG",
    tagColor: "from-amber-500 to-orange-500",
    desc: "Thiên đường ăn vặt 100+ món, mở tới 2h sáng",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80",
    joined: 342,
    distance: "Cách bạn 4.1km",
    icon: "🍜",
    category: "anuong",
    address: "Hẻm 57 Hồ Thị Kỷ, Q10",
    openTime: "16:00 - 02:00 hàng ngày",
    price: "Trung bình 20-50K/món",
    tips: [
      "Must-try: Bánh tráng nướng, ốc len xào dừa, chè khúc bạch",
      "Đi sau 20h đỡ đông, đồ ăn mới ra lò",
      "Mang tiền mặt, ít chỗ quẹt thẻ",
      "Gửi xe đầu hẻm 5K, đi bộ vào 200m"
    ],
    gallery: [
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400",
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400",
      "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400"
    ],
    mapUrl: "https://maps.app.goo.gl/food456",
    rating: 4.5,
    reviews: 3421,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    id: "5",
    title: "Acoustic Đêm Đà Lạt",
    tag: "MUSIC",
    tagColor: "from-emerald-500 to-teal-500",
    desc: "Live acoustic mỗi tối, view thung lũng, trà nóng free",
    image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&q=80",
    joined: 89,
    distance: "Cách bạn 310km",
    icon: "🎵",
    category: "music",
    address: "12 Yersin, P10, Đà Lạt",
    openTime: "19:00 - 23:00 hàng ngày",
    price: "Vé vào: 50K/người + đồ uống",
    tips: [
      "Nên đi tối T6-T7 có band xịn",
      "Mang áo ấm, Đà Lạt tối lạnh 15°C",
      "Đặt chỗ ngồi gần sân khấu trước 1 ngày",
      "Có chỗ đậu xe máy miễn phí"
    ],
    gallery: [
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400",
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400",
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400"
    ],
    mapUrl: "https://maps.app.goo.gl/music789",
    rating: 4.8,
    reviews: 743,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    id: "6",
    title: "Camping Hồ Trị An",
    tag: "WEEKEND",
    tagColor: "from-emerald-500 to-teal-500",
    desc: "Cắm trại qua đêm, BBQ, chèo SUP ngắm bình minh",
    image: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80",
    joined: 89,
    distance: "Cách bạn 70km",
    icon: "🏕️",
    category: "phuot",
    address: "Hồ Trị An, Vĩnh Cửu, Đồng Nai",
    openTime: "Cắm trại 24/7, check-in 14:00",
    price: "Thuê lều: 150K/đêm | SUP: 100K/h",
    tips: [
      "Mang thuốc chống muỗi, tối nhiều muỗi",
      "Đặt lều trước T6-CN vì hết sớm",
      "BBQ tự mang đồ hoặc thuê set 200K/4 người",
      "Bình minh 5h30 đẹp nhất, nhớ dậy sớm"
    ],
    gallery: [
      "https://images.unsplash.com/photo-1478131143081-80f7edca84ca?w=400",
      "https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=400",
      "https://images.unsplash.com/photo-1537565266759-34bb45279328?w=400"
    ],
    mapUrl: "https://maps.app.goo.gl/camp123",
    rating: 4.6,
    reviews: 892,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    id: "7",
    title: "Speakeasy Bar Quận 1",
    tag: "HIDDEN",
    tagColor: "from-zinc-700 to-zinc-900",
    desc: "Bar ẩn trong hẻm, phong cách 1920s, cocktail thủ công",
    image: "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800&q=80",
    joined: 34,
    distance: "Cách bạn 2.1km",
    icon: "🥃",
    category: "nightlife",
    address: "Hẻm 15 Lê Thánh Tôn, Q1 - Không biển hiệu",
    openTime: "19:00 - 01:00 | Đóng cửa T2",
    price: "Cocktail từ 180K, không phụ thu",
    tips: [
      "Gõ cửa 3 lần, mật khẩu: 'Gatsby'",
      "Không nhận khách walk-in sau 22h",
      "Bartender làm cocktail theo mood của bạn",
      "Chụp ảnh không flash, tôn trọng không gian"
    ],
    gallery: [
      "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400",
      "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400",
      "https://images.unsplash.com/photo-1575444752615-96b69f437c6c?w=400"
    ],
    mapUrl: "https://maps.app.goo.gl/speak123",
    rating: 4.9,
    reviews: 412,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    id: "8",
    title: "Làm Nến Thơm DIY",
    tag: "NEW",
    tagColor: "from-pink-500 to-rose-500",
    desc: "Tự mix mùi hương, đổ nến, khắc tên lên hũ",
    image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&q=80",
    joined: 18,
    distance: "Cách bạn 4.5km",
    icon: "🕯️",
    category: "workshop",
    address: "88 Pasteur, Q1 - Lầu 2",
    openTime: "T3-CN: 10:00 - 20:00",
    price: "180K/hũ 200ml, 250K/hũ 350ml",
    tips: [
      "Chọn tối đa 3 mùi mix, nhiều quá bị nồng",
      "Nến đông sau 1h, có thể ngồi cafe chờ",
      "Khắc tên free, tối đa 10 ký tự",
      "Mùi lavender + vanilla được chuộng nhất"
    ],
    gallery: [
      "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400",
      "https://images.unsplash.com/photo-1602874801007-bd458bb1b8b6?w=400",
      "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=400"
    ],
    mapUrl: "https://maps.app.goo.gl/candle123",
    rating: 4.9,
    reviews: 234,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    id: "9",
    title: "Cafe Sách Yên Tĩnh",
    tag: "CHILL",
    tagColor: "from-teal-500 to-green-500",
    desc: "2000+ đầu sách, không gian yên tĩnh, làm việc ok",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
    joined: 78,
    distance: "Cách bạn 3.5km",
    icon: "📚",
    category: "coffee",
    address: "18A Ngô Thời Nhiệm, Q3",
    openTime: "8:00 - 22:00 hàng ngày",
    price: "Đồ uống từ 35K, không phụ thu",
    tips: [
      "Tầng 2 yên tĩnh nhất, có ổ cắm mỗi bàn",
      "Wifi mạnh, password: sachhay2024",
      "Đọc sách tại chỗ free, mượn về 10K/cuốn",
      "Tránh giờ 14-16h học sinh đông"
    ],
    gallery: [
      "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=400",
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400",
      "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400"
    ],
    mapUrl: "https://maps.app.goo.gl/book123",
    rating: 4.8,
    reviews: 634,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    id: "10",
    title: "Chạy Bộ Hồ Tây 5AM",
    tag: "HEALTHY",
    tagColor: "from-lime-500 to-green-500",
    desc: "Cộng đồng chạy bộ sáng, free, có PT hướng dẫn",
    image: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80",
    joined: 67,
    distance: "Cách bạn 1.2km",
    icon: "🏃",
    category: "sports",
    address: "Tập trung tại Vườn hoa Lý Tự Trọng, Hồ Tây",
    openTime: "T3-T5-T7: 5:00 - 6:30 sáng",
    price: "Miễn phí, tự mang nước",
    tips: [
      "Có 2 cự ly: 3km cho newbie, 5km cho advance",
      "Mang giày chạy, không mang dép",
      "Sau chạy có cafe sáng cùng nhóm",
      "Mưa nhỏ vẫn chạy, mưa to thì hủy"
    ],
    gallery: [
      "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400",
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400",
      "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400"
    ],
    mapUrl: "https://maps.app.goo.gl/run123",
    rating: 4.9,
    reviews: 234,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    id: "11",
    title: "Chợ Đồ Si Sài Gòn",
    tag: "VINTAGE",
    tagColor: "from-violet-500 to-purple-500",
    desc: "Đồ si Nhật-Hàn, 10K-50K/món, săn hàng hiệu",
    image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80",
    joined: 234,
    distance: "Cách bạn 6.3km",
    icon: "👗",
    category: "shopping",
    address: "Chợ Bàn Cờ, Q3 - Khu đồ si tầng 2",
    openTime: "8:00 - 18:00 | Nghỉ T2",
    price: "10K-200K tùy món, mặc cả được",
    tips: [
      "Đi sáng T7 hàng mới về, nhiều đồ đẹp",
      "Mang tiền mặt, không quẹt thẻ",
      "Kiểm tra kỹ đường chỉ, khuy áo",
      "Mặc cả 20-30% là bình thường"
    ],
    gallery: [
      "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400",
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400",
      "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=400"
    ],
    mapUrl: "https://maps.app.goo.gl/shop123",
    rating: 4.4,
    reviews: 1876,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    id: "12",
    title: "Phố Lồng Đèn Quận 5",
    tag: "CHECKIN",
    tagColor: "from-rose-500 to-pink-500",
    desc: "1000+ lồng đèn, chụp ảnh Tết/Halloween đẹp",
    image: "https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=800&q=80",
    joined: 445,
    distance: "Cách bạn 5.1km",
    icon: "📸",
    category: "photo",
    address: "Đường Hải Thượng Lãn Ông, Q5",
    openTime: "Cả ngày, đẹp nhất 18:00-21:00",
    price: "Miễn phí, chụp ảnh 10K/tấm nếu thuê",
    tips: [
      "Đi 18h-19h đèn vừa lên, chưa đông",
      "Mang lens 35mm hoặc 50mm chụp đẹp",
      "Mặc áo dài/đồ đỏ lên hình nổi",
      "Cuối tuần có cho thuê trang phục 50K/bộ"
    ],
    gallery: [
      "https://images.unsplash.com/photo-1528360354680-f8de465c56e4?w=400",
      "https://images.unsplash.com/photo-1532635241-17e8206cceab?w=400",
      "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400"
    ],
    mapUrl: "https://maps.app.goo.gl/photo123",
    rating: 4.6,
    reviews: 2987,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    id: "13",
    title: "Rạp Phim Ngoài Trời",
    tag: "DATING",
    tagColor: "from-indigo-500 to-blue-500",
    desc: "Chiếu phim dưới sao, gối ôm + bắp rang free",
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3b8?w=800&q=80",
    joined: 56,
    distance: "Cách bạn 8.2km",
    icon: "🎬",
    category: "movie",
    address: "Saigon Outcast, 188 Nguyễn Văn Hưởng, Q2",
    openTime: "T6-T7-CN: 19:30",
    price: "Vé 80K/người, combo 2 người 150K",
    tips: [
      "Mang áo khoác, tối ngoài trời hơi lạnh",
      "Đặt vé online trước, hết chỗ nhanh",
      "Phim chiếu 2 suất: 19:30 và 21:30",
      "Có bán bia thủ công 50K/chai"
    ],
    gallery: [
      "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400",
      "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400",
      "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=400"
    ],
    mapUrl: "https://maps.app.goo.gl/movie123",
    rating: 4.7,
    reviews: 456,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    id: "14",
    title: "Lễ Hội Ánh Sáng",
    tag: "LIMITED",
    tagColor: "from-cyan-500 to-blue-500",
    desc: "Trình diễn mapping 3D, chỉ 3 ngày 15-17/12",
    image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80",
    joined: 892,
    distance: "Cách bạn 2.8km",
    icon: "✨",
    category: "festival",
    address: "Phố đi bộ Nguyễn Huệ, Q1",
    openTime: "18:00 - 22:00 | 15-17/12/2026",
    price: "Miễn phí vào cửa",
    tips: [
      "Đến sớm 17h30 để có chỗ đứng đẹp",
      "Mang sạc dự phòng, chụp nhiều hết pin",
      "Show diễn mỗi 30 phút, mỗi lần 15 phút",
      "Gửi xe ở Vincom Đồng Khởi 10K"
    ],
    gallery: [
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400",
      "https://images.unsplash.com/photo-1496337589254-7e19d01cec44?w=400",
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400"
    ],
    mapUrl: "https://maps.app.goo.gl/light123",
    rating: 4.9,
    reviews: 3421,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    id: "15",
    title: "Triển Lãm Nghệ Thuật Đương Đại",
    tag: "ART",
    tagColor: "from-fuchsia-500 to-pink-500",
    desc: "50+ tác phẩm từ 20 nghệ sĩ trẻ, miễn phí vào cửa",
    image: "https://images.unsplash.com/photo-1577720643272-265f09367456?w=800&q=80",
    joined: 112,
    distance: "Cách bạn 4.8km",
    icon: "🖼️",
    category: "exhibition",
    address: "The Factory Contemporary Arts Centre, Q2",
    openTime: "9:00 - 18:00 | Đóng cửa T2",
    price: "Miễn phí, donate tùy tâm",
    tips: [
      "Nên đi sáng T7-CN vắng, ngắm tranh thoải mái",
      "Có audio guide free qua QR code",
      "Chụp ảnh không flash, không chạm tranh",
      "Cafe trong gallery view sông đẹp"
    ],
    gallery: [
      "https://images.unsplash.com/photo-1577083557806-38922796d045?w=400",
      "https://images.unsplash.com/photo-1547826039-b467650e39e5?w=400",
      "https://images.unsplash.com/photo-1501084817091-a4f3d1d19e07?w=400"
    ],
    mapUrl: "https://maps.app.goo.gl/art123",
    rating: 4.7,
    reviews: 523,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }
];

async function importData() {
  console.log('Starting import...');
  const batch = db.batch();
  
  EVENTS_DATA.forEach(event => {
    const ref = db.collection('events').doc(event.id);
    batch.set(ref, event);
  });
  
  await batch.commit();
  console.log(`✅ Imported ${EVENTS_DATA.length} events successfully!`);
}

importData().catch(console.error);
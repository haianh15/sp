import { useState, useRef, useEffect, type ReactNode } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type EyeRx = { sph: string; cyl: string; axis: string; add: string }
type PrescriptionData = { od: EyeRx; os: EyeRx }
type LensOption = { id: string; name: string; desc: string; surcharge: number }
type PurchaseType = 'frame_only' | 'with_lens'
type ModalStep =
  | 'purchase_type'
  | 'lens_select'
  | 'rx_has_profile'
  | 'rx_no_profile'
  | 'rx_form'
  | 'summary'

type CartItem = {
  product: Product
  qty: number
  purchaseType: PurchaseType
  lensOption?: LensOption
  prescription?: PrescriptionData
}

type ShippingMethod = {
  id: string; name: string; desc: string; fee: number; eta: string
}

type PromoCode = {
  code: string; label: string; discountType: 'percent' | 'fixed'
  discountValue: number; minOrder: number; validUntil: string
  maxUses: number; usedCount: number
}

type OrderInfo = {
  name: string; phone: string
  province: string; district: string; ward: string; streetAddress: string
  note: string
}

type PaymentMethod = 'cod' | 'online'

type OnlinePaymentMethod = {
  id: string; name: string; desc: string; icon: string
}

type PaymentStatus =
  | 'pending'
  | 'deposited'
  | 'paid'
  | 'cancelled'
  | 'failed'
  | 'verifying'
  | 'mismatch'
  | 'success'

type Transaction = {
  txnId: string
  orderId: string
  amount: number
  expectedAmount: number
  method: string
  status: PaymentStatus
  paidAt: string
  isDeposit: boolean
  depositAmount: number
  remainingAmount: number
}

type PlacedOrder = {
  id: string
  items: CartItem[]
  info: OrderInfo
  shipping: ShippingMethod
  promo: PromoCode | null
  subtotal: number
  discount: number
  shippingFee: number
  total: number
  payment: PaymentMethod
  createdAt: string
}

type Product = {
  id: number; brand: string; sku: string; name: string; material: string
  size: string | null; style: string; gender: string; rating: number; reviews: number
  price: number; originalPrice: number | null; discount: number; inStock: boolean; stock: number
  image: string; tag: string; description: string; frameColors: string[]; lensTypes: string[]
  specs: Record<string, string>; reviewList: { name: string; date: string; stars: number; comment: string }[]
  supportsLensCutting: boolean
}

type AppView = 'list' | 'detail' | 'cart' | 'checkout' | 'success' | 'payment' | 'payment_result'


// ─── Data ─────────────────────────────────────────────────────────────────────

const LENS_OPTIONS: LensOption[] = [
  { id: 'clear_150', name: "Tròng trắng 1.50", desc: "Phù hợp độ cận/viễn nhẹ đến trung bình (dưới -4.00)", surcharge: 500000 },
  { id: 'clear_156', name: "Tròng trắng 1.56", desc: "Mỏng hơn, phù hợp cận trung bình (-4.00 → -6.00)", surcharge: 700000 },
  { id: 'blue_161', name: "Chống sáng xanh 1.61", desc: "Bảo vệ mắt khi làm việc máy tính nhiều giờ", surcharge: 1200000 },
  { id: 'blue_167', name: "Chống sáng xanh 1.67", desc: "Siêu mỏng, thẩm mỹ cao, cận nặng (trên -6.00)", surcharge: 1800000 },
  { id: 'photo', name: "Đổi màu Photochromic 1.56", desc: "Tự điều chỉnh theo ánh sáng, tiện dùng trong/ngoài trời", surcharge: 2500000 },
]

const MOCK_PROFILES: Record<number, PrescriptionData> = {
  3: { od: { sph: '-2.00', cyl: '-0.50', axis: '180', add: '' }, os: { sph: '-1.75', cyl: '-0.25', axis: '175', add: '' } },
  5: { od: { sph: '-3.00', cyl: '-0.75', axis: '90', add: '' }, os: { sph: '-2.75', cyl: '-0.50', axis: '85', add: '' } },
}

// Mock hồ sơ cá nhân khách hàng
const MOCK_USER_PROFILE = {
  name:    'Nguyễn Văn A',
  email:   'nguyenvana@gmail.com',
  address: '46 Hoàng Hoa Thám, Ba Đình, Hà Nội',
}

type InvoiceRequest = {
  reqId:       string
  orderId:     string
  name:        string
  taxCode:     string
  address:     string
  email:       string
  txnType:     string
  totalAmount: number
  paidAmount:  number
  status:      'pending'
}

const emptyEye = (): EyeRx => ({ sph: '', cyl: '', axis: '', add: '' })

const SHIPPING_METHODS: ShippingMethod[] = [
  { id: 'home',        name: "Giao hàng tận nhà", desc: "Shipper giao đến địa chỉ của bạn",           fee: 30000, eta: "2–4 ngày" },
  { id: 'store_taytho', name: "Nhận tại cơ sở Tây Hồ", desc: "46 Hoàng Hoa Thám, phường Tây Hồ, Hà Nội", fee: 0,     eta: "Ngay hôm nay" },
  { id: 'store_longbien', name: "Nhận tại cơ sở Long Biên", desc: "261 Ngọc Lâm, phường Bồ Đề, Long Biên, Hà Nội", fee: 0, eta: "Ngay hôm nay" },
]

const PROMO_CODES: PromoCode[] = [
  { code: 'VINEYEWEAR10',  label: "Giảm 10% toàn bộ đơn hàng",               discountType: 'percent', discountValue: 10,     minOrder: 500000,  validUntil: '2026-12-31', maxUses: 1000, usedCount: 120 },
  { code: 'GIAM200K',      label: "Giảm 200.000đ cho đơn từ 2 triệu",         discountType: 'fixed',   discountValue: 200000, minOrder: 2000000, validUntil: '2026-12-31', maxUses: 500,  usedCount: 98  },
  { code: 'FREESHIP',      label: "Miễn phí vận chuyển",                      discountType: 'fixed',   discountValue: 999999, minOrder: 0,       validUntil: '2026-09-30', maxUses: 200,  usedCount: 199 },
  { code: 'FULL_GIAM7',    label: "Thanh toán full online — giảm 7%",          discountType: 'percent', discountValue: 7,      minOrder: 0,       validUntil: '2026-12-31', maxUses: 9999, usedCount: 0   },
  { code: 'FULL_150K',     label: "Thanh toán full online — giảm 150.000đ",    discountType: 'fixed',   discountValue: 150000, minOrder: 1500000, validUntil: '2026-12-31', maxUses: 9999, usedCount: 0   },
  { code: 'EXPIRED',       label: "Mã đã hết hạn",                            discountType: 'percent', discountValue: 5,      minOrder: 0,       validUntil: '2025-01-01', maxUses: 100,  usedCount: 50  },
]

// Mã giảm giá tặng khi thanh toán full online
const FULL_PAYMENT_PROMOS = ['FULL_GIAM7', 'FULL_150K']

const ONLINE_PAYMENT_METHODS: OnlinePaymentMethod[] = [
  { id: 'momo',      name: "Ví MoMo",          desc: "Thanh toán qua ví điện tử MoMo",               icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z' },
  { id: 'zalopay',   name: "ZaloPay",           desc: "Thanh toán qua ví ZaloPay",                    icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  { id: 'vnpay',     name: "VNPay",             desc: "Cổng thanh toán VNPay – thẻ ATM/Visa/Master",  icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  { id: 'bank_card', name: "Thẻ ngân hàng",     desc: "Thẻ ATM nội địa, Visa, Mastercard, JCB",      icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  { id: 'qr',        name: "QR Chuyển khoản",   desc: "Quét mã QR — tất cả ngân hàng hỗ trợ VietQR", icon: 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M11 3H9a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2zm0 10H9a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2z' },
]

const DEPOSIT_BONUS_RATE = 3
const FULL_BONUS_RATE    = 7

function generateOrderId(): string {
  return 'VEW-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 5).toUpperCase()
}


// ─── Address Data ─────────────────────────────────────────────────────────────

const ADDRESS_DATA: Record<string, { districts: Record<string, string[]> }> = {
  "Hà Nội": {
    districts: {
      "Ba Đình": ["Phúc Xá", "Trúc Bạch", "Vĩnh Phúc", "Cống Vị", "Liễu Giai", "Nguyễn Trung Trực", "Quán Thánh", "Ngọc Hà", "Điện Biên", "Đội Cấn", "Ngọc Khánh", "Kim Mã", "Giảng Võ", "Thành Công"],
      "Hoàn Kiếm": ["Phúc Tân", "Đồng Xuân", "Hàng Mã", "Hàng Buồm", "Hàng Đào", "Hàng Bồ", "Cửa Đông", "Lý Thái Tổ", "Hàng Bạc", "Hàng Gai", "Chương Dương", "Hàng Trống", "Cửa Nam", "Hàng Bông", "Tràng Tiền", "Trần Hưng Đạo", "Phan Chu Trinh"],
      "Đống Đa": ["Cát Linh", "Văn Miếu", "Quốc Tử Giám", "Láng Thượng", "Ô Chợ Dừa", "Văn Chương", "Hàng Bột", "Nam Đồng", "Trung Phụng", "Khâm Thiên", "Thổ Quan", "Phú Lương", "Kim Liên", "Phương Liên", "Trung Tự", "Kim Hoa", "Phương Mai", "Ngã Tư Sở", "Khương Thượng"],
      "Hai Bà Trưng": ["Nguyễn Du", "Bạch Đằng", "Phạm Đình Hổ", "Lê Đại Hành", "Đồng Nhân", "Phố Huế", "Thanh Nhàn", "Cầu Dền", "Bách Khoa", "Đồng Tâm", "Vĩnh Tuy", "Bạch Mai", "Trương Định", "Đội Cấn", "Quỳnh Mai", "Quỳnh Lôi", "Minh Khai", "Tương Mai"],
      "Cầu Giấy": ["Nghĩa Đô", "Nghĩa Tân", "Mai Dịch", "Dịch Vọng", "Dịch Vọng Hậu", "Quan Hoa", "Yên Hòa", "Trung Hòa"],
      "Thanh Xuân": ["Nhân Chính", "Thượng Đình", "Khương Trung", "Khương Mai", "Thanh Xuân Trung", "Phương Liệt", "Hạ Đình", "Khương Đình", "Thanh Xuân Bắc", "Thanh Xuân Nam", "Kim Giang"],
    }
  },
  "TP. Hồ Chí Minh": {
    districts: {
      "Quận 1": ["Bến Nghé", "Bến Thành", "Cầu Kho", "Cầu Ông Lãnh", "Cô Giang", "Đa Kao", "Nguyễn Cư Trinh", "Nguyễn Thái Bình", "Phạm Ngũ Lão", "Tân Định"],
      "Quận 3": ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 7", "Phường 8", "Phường 9", "Phường 10", "Phường 11", "Phường 12", "Phường 13", "Phường 14"],
      "Quận 7": ["Bình Thuận", "Phú Mỹ", "Phú Thuận", "Tân Hưng", "Tân Kiểng", "Tân Phong", "Tân Phú", "Tân Quy", "Tân Thuận Đông", "Tân Thuận Tây"],
      "Bình Thạnh": ["Phường 1", "Phường 2", "Phường 3", "Phường 5", "Phường 6", "Phường 7", "Phường 11", "Phường 12", "Phường 13", "Phường 14", "Phường 15", "Phường 17", "Phường 19", "Phường 21", "Phường 22", "Phường 24", "Phường 25", "Phường 26", "Phường 27", "Phường 28"],
      "Thủ Đức": ["Bình Chiểu", "Bình Thọ", "Hiệp Bình Chánh", "Hiệp Bình Phước", "Hiệp Phú", "Linh Chiểu", "Linh Đông", "Linh Tây", "Linh Trung", "Linh Xuân", "Long Bình", "Long Phước", "Long Thạnh Mỹ", "Long Trường", "Phú Hữu", "Tam Bình", "Tam Phú", "Tân Phú", "Tăng Nhơn Phú A", "Tăng Nhơn Phú B", "Trường Thạnh"],
    }
  },
  "Đà Nẵng": {
    districts: {
      "Hải Châu": ["Hải Châu 1", "Hải Châu 2", "Thạch Thang", "Thanh Bình", "Thuận Phước", "Nam Dương", "Phước Ninh", "Bình Hiên", "Bình Thuận", "Hòa Thuận Tây", "Hòa Thuận Đông"],
      "Thanh Khê": ["Thanh Khê Đông", "Thanh Khê Tây", "Xuân Hà", "Tân Chính", "Chính Gián", "Vĩnh Trung", "Thạc Gián", "An Khê", "Hòa Khê"],
      "Sơn Trà": ["Thọ Quang", "Nại Hiên Đông", "Mân Thái", "An Hải Bắc", "Phước Mỹ", "An Hải Tây", "An Hải Đông"],
      "Ngũ Hành Sơn": ["Mỹ An", "Khuê Mỹ", "Hòa Hải", "Hòa Quý"],
      "Cẩm Lệ": ["Khuê Trung", "Hòa Thọ Tây", "Hòa Thọ Đông", "Hòa Xuân", "Hòa An", "Hòa Phát"],
    }
  },
  "Hải Phòng": {
    districts: {
      "Hồng Bàng": ["Quán Toan", "Hùng Vương", "Sở Dầu", "Thượng Lý", "Hạ Lý", "Minh Khai", "Trại Chuối", "Hoàng Văn Thụ", "Phan Bội Châu", "Trần Phú"],
      "Lê Chân": ["An Biên", "An Dương", "Trần Nguyên Hãn", "Hồ Nam", "Lê Lợi", "Vĩnh Niệm", "Dư Hàng Kênh", "Kênh Dương", "Đông Hải 1", "Đông Hải 2", "Cát Dài", "Hàng Kênh", "Đằng Giang", "Niệm Nghĩa", "Trại Cau"],
      "Ngô Quyền": ["Máy Chai", "Máy Tơ", "Vạn Mỹ", "Cầu Tre", "Lạc Viên", "Gia Viên", "Đông Khê", "Cầu Đất", "Lê Lợi", "Đằng Giang", "Lạch Tray", "Đổng Quốc Bình"],
    }
  },
  "Cần Thơ": {
    districts: {
      "Ninh Kiều": ["An Hòa", "An Khánh", "An Nghiệp", "An Phú", "Cái Khế", "Hưng Lợi", "Tân An", "Thới Bình", "Xuân Khánh", "An Bình", "An Cư", "Hưng Thạnh"],
      "Bình Thủy": ["An Thới", "Bình Thủy", "Long Hòa", "Long Tuyền", "Thới An Đông", "Trà An", "Trà Nóc"],
      "Cái Răng": ["Ba Láng", "Hưng Phú", "Hưng Thạnh", "Lê Bình", "Phú Thứ", "Tân Phú", "Thường Thạnh"],
    }
  },
  "Bình Dương": {
    districts: {
      "Thủ Dầu Một": ["Chánh Nghĩa", "Hiệp Thành", "Phú Cường", "Phú Hòa", "Phú Lợi", "Phú Thọ", "Tân An", "Tương Bình Hiệp", "Chánh Mỹ"],
      "Dĩ An": ["An Bình", "Bình An", "Bình Thắng", "Đông Hòa", "Tân Bình", "Tân Đông Hiệp"],
      "Thuận An": ["An Phú", "An Thạnh", "Bình Chuẩn", "Bình Hòa", "Bình Nhâm", "Hưng Định", "Lái Thiêu", "Thuận Giao", "Vĩnh Phú"],
    }
  },
  "Đồng Nai": {
    districts: {
      "Biên Hòa": ["An Bình", "An Hòa", "Bình Đa", "Bửu Hòa", "Hố Nai", "Hòa Bình", "Tân Biên", "Tân Hiệp", "Tân Mai", "Tân Phong", "Thống Nhất", "Trung Dũng"],
      "Long Khánh": ["Bảo Quang", "Bảo Vinh", "Bình Lộc", "Hàng Gòn", "Nhân Nghĩa", "Suối Tre", "Xuân An", "Xuân Bình", "Xuân Hiệp", "Xuân Hòa", "Xuân Lập", "Xuân Tân", "Xuân Thanh"],
    }
  },
  "Khánh Hòa": {
    districts: {
      "Nha Trang": ["Lộc Thọ", "Ngọc Hiệp", "Phương Sài", "Phương Sơn", "Phước Hải", "Phước Tân", "Tân Lập", "Vạn Thắng", "Vạn Thạnh", "Vĩnh Hải", "Vĩnh Hòa", "Vĩnh Nguyên", "Vĩnh Phước", "Vĩnh Thọ", "Xương Huân"],
      "Cam Ranh": ["Ba Ngòi", "Cam Lộc", "Cam Lợi", "Cam Nghĩa", "Cam Phú", "Cam Phúc Bắc", "Cam Phúc Nam", "Cam Thuận", "Cam Thịnh Đông", "Cam Thịnh Tây"],
    }
  },
}


// ─── Products ─────────────────────────────────────────────────────────────────

const PRODUCTS: Product[] = [
  {
    id: 1,
    brand: "Ray-Ban",
    sku: "RB2132-902",
    name: "Ray-Ban New Wayfarer Classic",
    material: "Acetate",
    size: "55-18-145",
    style: "Wayfarer",
    gender: "Unisex",
    rating: 4.8,
    reviews: 234,
    price: 3200000,
    originalPrice: 4000000,
    discount: 20,
    inStock: true,
    stock: 12,
    image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&q=80",
    tag: "Bestseller",
    description: "Gọng kính Ray-Ban New Wayfarer Classic với thiết kế iconic, chất liệu acetate cao cấp. Phù hợp với nhiều kiểu mặt, dễ phối đồ hàng ngày.",
    frameColors: ["Đen bóng", "Đồi mồi", "Nâu trong"],
    lensTypes: ["Tròng đổi màu", "Tròng phân cực", "Tròng trắng"],
    specs: { "Chất liệu gọng": "Acetate cao cấp", "Kích thước mắt kính": "55mm", "Cầu mũi": "18mm", "Gọng đuôi": "145mm", "Xuất xứ": "Ý", "Bảo hành": "12 tháng" },
    reviewList: [
      { name: "Nguyễn Văn A", date: "15/05/2025", stars: 5, comment: "Gọng rất đẹp, chất lượng tốt, đúng hàng chính hãng. Nhân viên tư vấn nhiệt tình." },
      { name: "Trần Thị B", date: "02/04/2025", stars: 5, comment: "Mình đã mua ở đây lần 2, lần nào cũng hài lòng. Giao hàng nhanh, đóng gói cẩn thận." },
      { name: "Lê Hoàng C", date: "20/03/2025", stars: 4, comment: "Kính đẹp, nhưng hộp đựng hơi đơn giản so với kỳ vọng. Tổng thể vẫn ổn." },
    ],
    supportsLensCutting: true,
  },
  {
    id: 2,
    brand: "Oakley",
    sku: "OO9102-36",
    name: "Oakley Holbrook Metal",
    material: "Kim loại",
    size: "55-18-137",
    style: "Square",
    gender: "Nam",
    rating: 4.7,
    reviews: 189,
    price: 4500000,
    originalPrice: null,
    discount: 0,
    inStock: true,
    stock: 8,
    image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&q=80",
    tag: "New",
    description: "Oakley Holbrook Metal kết hợp giữa phong cách retro và công nghệ hiện đại. Gọng kim loại siêu nhẹ, tròng Prizm cho màu sắc sắc nét.",
    frameColors: ["Bạc", "Vàng đồng", "Xanh dương matte"],
    lensTypes: ["Prizm Black", "Prizm Ruby", "Tròng trắng"],
    specs: { "Chất liệu gọng": "O-Matter & kim loại", "Kích thước mắt kính": "55mm", "Cầu mũi": "18mm", "Gọng đuôi": "137mm", "Công nghệ tròng": "Prizm", "Bảo hành": "24 tháng" },
    reviewList: [
      { name: "Phạm Minh D", date: "10/05/2025", stars: 5, comment: "Kính rất nhẹ và bền. Đeo cả ngày không mỏi tai. Tròng Prizm nhìn rõ và sắc nét." },
      { name: "Hoàng Thị E", date: "28/04/2025", stars: 4, comment: "Chất lượng tốt, giá hợp lý. Giao hàng đúng hẹn." },
    ],
    supportsLensCutting: false,
  },
  {
    id: 3,
    brand: "Vin Eyewear",
    sku: "VE-TR-001",
    name: "Vin Titanium Round",
    material: "Titanium",
    size: "50-20-140",
    style: "Round",
    gender: "Unisex",
    rating: 4.9,
    reviews: 312,
    price: 2800000,
    originalPrice: 3500000,
    discount: 20,
    inStock: true,
    stock: 20,
    image: "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=600&q=80",
    tag: "Hot",
    description: "Gọng kính titanium siêu nhẹ thương hiệu Vin Eyewear, thiết kế tròn cổ điển. Khung titanium nguyên chất 100%, bền bỉ, chống ăn mòn, phù hợp với mọi loại tròng.",
    frameColors: ["Vàng", "Bạc", "Đen matte", "Rose gold"],
    lensTypes: ["Tròng trắng", "Chống sáng xanh", "Đổi màu"],
    specs: { "Chất liệu gọng": "Titanium nguyên chất", "Kích thước mắt kính": "50mm", "Cầu mũi": "20mm", "Gọng đuôi": "140mm", "Trọng lượng": "12g", "Bảo hành": "24 tháng" },
    reviewList: [
      { name: "Vũ Thị F", date: "12/05/2025", stars: 5, comment: "Siêu nhẹ, đeo cả ngày không cảm giác gì. Cắt tròng chống sáng xanh rất tốt." },
      { name: "Đặng Văn G", date: "05/05/2025", stars: 5, comment: "Mua cho vợ, vợ rất thích. Gọng đẹp, nhẹ, chất lượng xuất sắc." },
      { name: "Ngô Thị H", date: "25/04/2025", stars: 5, comment: "Đây là lần thứ 3 tôi mua tại Vin Eyewear. Luôn hài lòng với chất lượng sản phẩm." },
    ],
    supportsLensCutting: true,
  },
  {
    id: 4,
    brand: "Gucci",
    sku: "GG0061S-002",
    name: "Gucci Square Acetate",
    material: "Acetate",
    size: "53-17-145",
    style: "Square",
    gender: "Nữ",
    rating: 4.6,
    reviews: 97,
    price: 8900000,
    originalPrice: 10500000,
    discount: 15,
    inStock: true,
    stock: 5,
    image: "https://images.unsplash.com/photo-1508296695146-257a814070b4?w=600&q=80",
    tag: "Luxury",
    description: "Kính mắt Gucci thiết kế vuông cổ điển, chất liệu acetate cao cấp với logo GG được khắc nổi trên gọng. Biểu tượng thời trang đỉnh cao.",
    frameColors: ["Đen", "Nâu đồi mồi", "Xanh navy"],
    lensTypes: ["Tròng đổi màu", "Tròng phân cực", "Tròng gradient"],
    specs: { "Chất liệu gọng": "Acetate Mazzucchelli", "Kích thước mắt kính": "53mm", "Cầu mũi": "17mm", "Gọng đuôi": "145mm", "Xuất xứ": "Ý", "Bảo hành": "12 tháng" },
    reviewList: [
      { name: "Lý Thị I", date: "08/05/2025", stars: 5, comment: "Kính rất đẹp và sang trọng. Xứng đáng với giá tiền." },
      { name: "Trương Văn J", date: "15/04/2025", stars: 4, comment: "Đẹp nhưng cần cẩn thận khi bảo quản. Hàng chính hãng, có tem xác nhận." },
    ],
    supportsLensCutting: true,
  },
  {
    id: 5,
    brand: "Vin Eyewear",
    sku: "VE-SP-002",
    name: "Vin Sport Shield",
    material: "TR90",
    size: "62-14-130",
    style: "Shield",
    gender: "Nam",
    rating: 4.5,
    reviews: 156,
    price: 1800000,
    originalPrice: 2200000,
    discount: 18,
    inStock: true,
    stock: 15,
    image: "https://images.unsplash.com/photo-1556306535-0f09a537f0a3?w=600&q=80",
    tag: "Sport",
    description: "Gọng kính thể thao Vin Sport Shield chất liệu TR90 siêu nhẹ và đàn hồi. Thiết kế ôm sát mặt, phù hợp vận động ngoài trời, chạy bộ, đạp xe.",
    frameColors: ["Đen matte", "Xanh neon", "Đỏ trắng"],
    lensTypes: ["Tròng phân cực", "Tròng đổi màu", "Tròng trắng"],
    specs: { "Chất liệu gọng": "TR90", "Kích thước mắt kính": "62mm", "Cầu mũi": "14mm", "Gọng đuôi": "130mm", "Chống UV": "UV400", "Bảo hành": "12 tháng" },
    reviewList: [
      { name: "Bùi Văn K", date: "11/05/2025", stars: 5, comment: "Dùng để chạy marathon, rất tốt. Không bị rơi, nhẹ và chắc." },
      { name: "Đinh Thị L", date: "29/04/2025", stars: 4, comment: "Kính đẹp, giá hợp lý. Mua thêm tròng cận, nhân viên tư vấn rất tận tình." },
    ],
    supportsLensCutting: true,
  },
  {
    id: 6,
    brand: "Lindberg",
    sku: "LB-AIR-1849",
    name: "Lindberg Air Titanium",
    material: "Titanium",
    size: "48-22-130",
    style: "Rimless",
    gender: "Unisex",
    rating: 4.9,
    reviews: 78,
    price: 12500000,
    originalPrice: null,
    discount: 0,
    inStock: false,
    stock: 0,
    image: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&q=80",
    tag: "Premium",
    description: "Lindberg Air Titanium Rim — gọng kính không vành tinh tế nhất thế giới. Trọng lượng chỉ 1.5g, hoàn toàn không dùng vít, thiết kế Đan Mạch thuần khiết.",
    frameColors: ["Titanium tự nhiên", "Vàng 18k", "Đen PVD"],
    lensTypes: ["Tròng trắng cao cấp", "Chống sáng xanh premium"],
    specs: { "Chất liệu gọng": "Titanium beta nguyên chất", "Kích thước mắt kính": "48mm", "Cầu mũi": "22mm", "Gọng đuôi": "130mm", "Trọng lượng": "1.5g", "Xuất xứ": "Đan Mạch", "Bảo hành": "Trọn đời" },
    reviewList: [
      { name: "Phan Thị M", date: "20/04/2025", stars: 5, comment: "Đẳng cấp thực sự. Nhẹ đến mức quên đang đeo kính. Đáng từng đồng." },
    ],
    supportsLensCutting: true,
  },
]


// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('vi-VN') + 'đ'
}

function StarRating({ rating, reviews, size = 'sm' }: { rating: number; reviews?: number; size?: 'sm' | 'md' }) {
  const stars = []
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <svg key={i} className={size === 'md' ? 'w-5 h-5' : 'w-4 h-4'} fill={i <= Math.round(rating) ? '#f59e0b' : '#e5e7eb'} viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    )
  }
  return (
    <div className="flex items-center gap-1">
      {stars}
      <span className={`text-gray-500 ${size === 'md' ? 'text-sm ml-1' : 'text-xs'}`}>
        {rating.toFixed(1)}{reviews !== undefined ? ` (${reviews})` : ''}
      </span>
    </div>
  )
}

function FilterDropdown({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] cursor-pointer"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

// ─── Prescription Form ───────────────────────────────────────────────────────

type RxType = 'myopia' | 'hyperopia' | 'astigmatism' | 'presbyopia'

const RX_TYPES: { id: RxType; label: string; desc: string; icon: string }[] = [
  { id: 'myopia',      label: 'Cận thị',  desc: 'Nhìn xa mờ, nhìn gần rõ',              icon: '👓' },
  { id: 'hyperopia',   label: 'Viễn thị', desc: 'Nhìn gần mờ, nhìn xa rõ hơn',          icon: '🔭' },
  { id: 'astigmatism', label: 'Loạn thị', desc: 'Nhìn mờ hoặc méo ở mọi khoảng cách',   icon: '🌀' },
  { id: 'presbyopia',  label: 'Lão thị',  desc: 'Khó nhìn gần, thường trên 40 tuổi',    icon: '📖' },
]

const SPH_OPTIONS: Record<RxType, string[]> = {
  myopia:      ['0.00','-0.25','-0.50','-0.75','-1.00','-1.25','-1.50','-1.75','-2.00','-2.25','-2.50','-2.75','-3.00','-3.50','-4.00','-4.50','-5.00','-5.50','-6.00','-7.00','-8.00','-9.00','-10.00'],
  hyperopia:   ['0.00','+0.25','+0.50','+0.75','+1.00','+1.25','+1.50','+1.75','+2.00','+2.50','+3.00','+3.50','+4.00','+4.50','+5.00','+6.00'],
  astigmatism: ['0.00','-0.25','-0.50','-0.75','-1.00','-1.25','-1.50','-2.00','-2.50','-3.00','-3.50','-4.00','-5.00','-6.00'],
  presbyopia:  ['+0.75','+1.00','+1.25','+1.50','+1.75','+2.00','+2.25','+2.50','+2.75','+3.00','+3.25','+3.50'],
}
const CYL_OPTIONS  = ['0.00','-0.25','-0.50','-0.75','-1.00','-1.25','-1.50','-1.75','-2.00','-2.50','-3.00']
const AXIS_OPTIONS = ['0','10','20','30','40','50','60','70','80','90','100','110','120','130','140','150','160','170','180']

function SimpleRxForm({ rxType, rx, onChange, showCyl }: {
  rxType: RxType; rx: PrescriptionData
  onChange: (rx: PrescriptionData) => void; showCyl: boolean
}) {
  const sphOpts = SPH_OPTIONS[rxType]
  const setOd = (f: keyof EyeRx, v: string) => onChange({ ...rx, od: { ...rx.od, [f]: v } })
  const setOs = (f: keyof EyeRx, v: string) => onChange({ ...rx, os: { ...rx.os, [f]: v } })

  const EyeRow = ({ label, eye, set }: { label: string; eye: EyeRx; set: (f: keyof EyeRx, v: string) => void }) => (
    <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}>
      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--primary)' }}>{label}</p>
      <div className={`grid gap-3 ${showCyl ? 'grid-cols-3' : 'grid-cols-1'}`}>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--caption)' }}>
            {rxType === 'presbyopia' ? 'Độ thêm (ADD)' : 'Độ cầu (SPH)'}
          </label>
          <div className="relative">
            <select value={eye.sph} onChange={e => set('sph', e.target.value)}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none appearance-none bg-white"
              style={{ borderColor: eye.sph ? 'var(--primary)' : 'var(--border)', color: 'var(--foreground)' }}>
              <option value="">-- Chọn độ --</option>
              {sphOpts.map(v => <option key={v} value={v}>{v === '0.00' ? 'Không có (0.00)' : v}</option>)}
            </select>
            <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--caption)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
        {showCyl && <>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--caption)' }}>Độ trụ (CYL)</label>
            <div className="relative">
              <select value={eye.cyl} onChange={e => set('cyl', e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none appearance-none bg-white"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                <option value="">-- Chọn --</option>
                {CYL_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--caption)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--caption)' }}>Trục (AXIS °)</label>
            <div className="relative">
              <select value={eye.axis} onChange={e => set('axis', e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none appearance-none bg-white"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                <option value="">-- Chọn --</option>
                {AXIS_OPTIONS.map(v => <option key={v} value={v}>{v}°</option>)}
              </select>
              <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--caption)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </>}
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      <EyeRow label="👁 Mắt phải (OD)" eye={rx.od} set={setOd} />
      <EyeRow label="👁 Mắt trái (OS)"  eye={rx.os} set={setOs} />
    </div>
  )
}

function validateSimpleRx(rx: PrescriptionData, showCyl: boolean): string | null {
  for (const [name, eye] of [['Mắt phải', rx.od], ['Mắt trái', rx.os]] as [string, EyeRx][]) {
    if (!eye.sph) return `${name}: vui lòng chọn độ`
    if (showCyl && eye.cyl && !eye.axis) return `${name}: vui lòng chọn trục (AXIS) khi có độ trụ`
  }
  return null
}

function RxField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--caption)' }}>{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder="—"
        className="w-full px-2 py-1.5 border rounded-md text-sm text-center focus:outline-none"
        style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }} />
    </div>
  )
}

function EyeForm({ label, data, onChange }: { label: string; data: EyeRx; onChange: (d: EyeRx) => void }) {
  const update = (k: keyof EyeRx) => (v: string) => onChange({ ...data, [k]: v })
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--muted)' }}>
      <div className="text-sm font-bold mb-3" style={{ color: 'var(--foreground)' }}>{label}</div>
      <div className="grid grid-cols-4 gap-2">
        <RxField label="SPH" value={data.sph} onChange={update('sph')} />
        <RxField label="CYL" value={data.cyl} onChange={update('cyl')} />
        <RxField label="AXIS" value={data.axis} onChange={update('axis')} />
        <RxField label="ADD" value={data.add} onChange={update('add')} />
      </div>
    </div>
  )
}

function validateRx(rx: PrescriptionData): string | null {
  const numRe = /^[-+]?\d+(\.\d+)?$/
  for (const eye of [rx.od, rx.os]) {
    if (!eye.sph || !numRe.test(eye.sph)) return "Vui lòng nhập SPH hợp lệ (VD: -2.00)"
    if (eye.cyl && !numRe.test(eye.cyl)) return "CYL không hợp lệ"
    if (eye.axis && (isNaN(Number(eye.axis)) || Number(eye.axis) < 0 || Number(eye.axis) > 180)) return "AXIS phải từ 0–180"
  }
  return null
}


// ─── ModalOverlay ─────────────────────────────────────────────────────────────

function ModalOverlay({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

// ─── CartModal ────────────────────────────────────────────────────────────────

interface CartModalProps {
  product: Product
  onClose: () => void
  onConfirm: (item: CartItem) => void
  userId?: number
  buyNow?: boolean
}

function CartModal({ product, onClose, onConfirm, userId, buyNow = false }: CartModalProps) {
  const [step, setStep] = useState<ModalStep>('purchase_type')
  const [purchaseType, setPurchaseType] = useState<PurchaseType>('frame_only')
  const [selectedLens, setSelectedLens] = useState<LensOption | null>(null)
  const [rx, setRx] = useState<PrescriptionData>({ od: emptyEye(), os: emptyEye() })
  const [rxError, setRxError] = useState<string | null>(null)
  const [qty, setQty] = useState(1)
  // Loại tật khúc xạ — người dùng chọn trước khi nhập độ
  const [rxType, setRxType] = useState<RxType>('myopia')

  const profileRx = userId ? MOCK_PROFILES[userId] : null

  const totalPrice = (product.price + (selectedLens?.surcharge ?? 0)) * qty

  function handlePurchaseType(type: PurchaseType) {
    setPurchaseType(type)
    if (type === 'frame_only') {
      setStep('summary')
    } else {
      if (!product.supportsLensCutting) {
        setStep('summary')
      } else {
        setStep('lens_select')
      }
    }
  }

  function handleLensSelect(lens: LensOption) {
    setSelectedLens(lens)
    setStep('rx_has_profile')
  }

  function handleRxChoice(hasProfile: boolean) {
    if (hasProfile && profileRx) {
      setRx(profileRx)
      setStep('summary')
    } else {
      setStep('rx_form')
    }
  }

  function handleRxSubmit() {
    const showCyl = rxType === 'astigmatism'
    const err = validateSimpleRx(rx, showCyl)
    if (err) { setRxError(err); return }
    setRxError(null)
    setStep('summary')
  }

  function handleConfirm() {
    onConfirm({
      product,
      qty,
      purchaseType,
      lensOption: purchaseType === 'with_lens' ? selectedLens ?? undefined : undefined,
      prescription: purchaseType === 'with_lens' ? rx : undefined,
    })
  }

  const stepTitle: Record<ModalStep, string> = {
    purchase_type: "Chọn hình thức mua",
    lens_select: "Chọn loại tròng kính",
    rx_has_profile: "Số đo khúc xạ",
    rx_no_profile: "Nhập số đo",
    rx_form: "Nhập số đo khúc xạ",
    summary: "Xác nhận sản phẩm",
  }

  function goBack() {
    if (step === 'lens_select') setStep('purchase_type')
    else if (step === 'rx_has_profile') setStep('lens_select')
    else if (step === 'rx_form') setStep(profileRx ? 'rx_has_profile' : 'lens_select')
    else if (step === 'summary') {
      if (purchaseType === 'frame_only') setStep('purchase_type')
      else if (!product.supportsLensCutting) setStep('purchase_type')
      else setStep(profileRx ? 'rx_has_profile' : 'rx_form')
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            {step !== 'purchase_type' && (
              <button onClick={goBack} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h3 className="text-lg font-bold text-gray-900">{stepTitle[step]}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Product mini-card */}
        <div className="flex gap-3 mb-5 p-3 bg-gray-50 rounded-xl">
          <img src={product.image} alt={product.name} className="w-16 h-16 object-cover rounded-lg" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 truncate">{product.name}</div>
            <div className="text-xs text-gray-500">{product.brand} · {product.sku}</div>
            <div className="text-[var(--primary)] font-bold mt-1">{fmt(product.price)}</div>
          </div>
        </div>

        {/* Step: purchase_type */}
        {step === 'purchase_type' && (
          <div className="space-y-3">
            <button
              onClick={() => handlePurchaseType('frame_only')}
              className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-[var(--primary-light)] hover:bg-[var(--primary-soft)] transition-all text-left"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Chỉ mua gọng</div>
                <div className="text-sm text-gray-500">Mua gọng không kèm tròng kính</div>
              </div>
            </button>
            {product.supportsLensCutting && (
              <button
                onClick={() => handlePurchaseType('with_lens')}
                className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-[var(--primary-light)] hover:bg-[var(--primary-soft)] transition-all text-left"
              >
                <div className="w-10 h-10 rounded-full bg-[var(--primary-soft)] flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Mua gọng + cắt tròng</div>
                  <div className="text-sm text-gray-500">Chọn tròng kính theo số đo của bạn</div>
                </div>
              </button>
            )}
          </div>
        )}

        {/* Step: lens_select */}
        {step === 'lens_select' && (
          <div className="space-y-2">
            {LENS_OPTIONS.map(lens => (
              <button
                key={lens.id}
                onClick={() => handleLensSelect(lens)}
                className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl hover:border-[var(--primary-light)] hover:bg-[var(--primary-soft)] transition-all text-left"
              >
                <div>
                  <div className="font-semibold text-gray-900">{lens.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{lens.desc}</div>
                </div>
                <div className="text-[var(--primary)] font-bold text-sm ml-3 flex-shrink-0">+{fmt(lens.surcharge)}</div>
              </button>
            ))}
          </div>
        )}

        {/* Step: rx_has_profile — có hồ sơ: hiện hồ sơ + hỏi xác nhận */}
        {step === 'rx_has_profile' && (
          <div className="space-y-4">
            {profileRx ? (
              <>
                {/* Banner hồ sơ */}
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: 'var(--primary-soft)' }}>
                    <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>Hồ sơ khúc xạ đã lưu</p>
                  </div>
                  <div className="p-4 space-y-3" style={{ backgroundColor: 'var(--card)' }}>
                    {[
                      { label: '👁 Mắt phải (OD)', eye: profileRx.od },
                      { label: '👁 Mắt trái (OS)',  eye: profileRx.os },
                    ].map(({ label, eye }) => (
                      <div key={label} className="rounded-xl p-3" style={{ backgroundColor: 'var(--muted)' }}>
                        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--primary)' }}>{label}</p>
                        <div className="grid grid-cols-4 gap-2 text-center">
                          {[['SPH', eye.sph], ['CYL', eye.cyl || '—'], ['AXIS', eye.axis || '—'], ['ADD', eye.add || '—']].map(([k, v]) => (
                            <div key={k}>
                              <p className="text-[9px] uppercase font-medium" style={{ color: 'var(--caption)' }}>{k}</p>
                              <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--foreground)' }}>{v}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-sm text-center font-medium" style={{ color: 'var(--caption)' }}>Số đo này có còn chính xác không?</p>

                {/* Đúng → tiếp tục */}
                <button onClick={() => handleRxChoice(true)}
                  className="w-full py-3 rounded-xl font-semibold text-white transition-colors"
                  style={{ backgroundColor: 'var(--primary)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--primary-dark)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--primary)')}>
                  ✓ Đúng, dùng số đo này
                </button>

                {/* Không đúng → nhập lại */}
                <button onClick={() => handleRxChoice(false)}
                  className="w-full py-3 rounded-xl font-semibold border-2 transition-all hover:bg-gray-50"
                  style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                  Nhập số đo mới
                </button>

                {/* Đặt lịch đo mắt */}
                <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--caption)' }}>Lâu không đo hoặc không chắc số đo cũ?</p>
                  <button
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-2 underline"
                    style={{ color: 'var(--primary)' }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Đặt lịch đo mắt miễn phí
                  </button>
                </div>
              </>
            ) : (
              /* Không có hồ sơ — đến rx_form */
              <button onClick={() => handleRxChoice(false)}
                className="w-full py-3 rounded-xl font-semibold text-white"
                style={{ backgroundColor: 'var(--primary)' }}>
                Nhập số đo khúc xạ
              </button>
            )}
          </div>
        )}

        {/* Step: rx_form — chưa có hồ sơ: nhập hoặc đặt lịch */}
        {step === 'rx_form' && (
          <div className="space-y-4">
            {/* Banner chưa có hồ sơ */}
            {!profileRx && (
              <div className="flex items-start gap-3 p-4 rounded-xl" style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}>
                <svg className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--caption)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Bạn chưa có hồ sơ khúc xạ</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--caption)' }}>Nhập số đo từ đơn thuốc khúc xạ gần nhất, hoặc đặt lịch đo mắt miễn phí tại cửa hàng.</p>
                </div>
              </div>
            )}

            {/* Chọn loại tật */}
            <div>
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Loại tật khúc xạ</p>
              <div className="grid grid-cols-2 gap-2">
                {RX_TYPES.map(t => (
                  <button key={t.id} onClick={() => { setRxType(t.id); setRx({ od: emptyEye(), os: emptyEye() }); setRxError(null) }}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left transition-all"
                    style={{
                      borderColor: rxType === t.id ? 'var(--primary)' : 'var(--border)',
                      backgroundColor: rxType === t.id ? 'var(--primary-soft)' : 'var(--card)',
                    }}>
                    <span className="text-xl leading-none">{t.icon}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight" style={{ color: rxType === t.id ? 'var(--primary)' : 'var(--foreground)' }}>{t.label}</p>
                      <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--caption)' }}>{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Form chọn độ */}
            <SimpleRxForm rxType={rxType} rx={rx} onChange={setRx} showCyl={rxType === 'astigmatism'} />

            {rxError && (
              <div className="text-sm rounded-lg p-3" style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--destructive)' }}>
                {rxError}
              </div>
            )}

            <button onClick={handleRxSubmit}
              className="w-full py-3 rounded-xl font-semibold text-white transition-colors"
              style={{ backgroundColor: 'var(--primary)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--primary-dark)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--primary)')}>
              Xác nhận độ kính
            </button>

            {/* Nút đặt lịch */}
            <button onClick={onClose}
              className="w-full py-3 rounded-xl font-semibold border-2 flex items-center justify-center gap-2 transition-all hover:bg-gray-50"
              style={{ borderColor: 'var(--border)', color: 'var(--caption)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Không nhớ số đo? Đặt lịch đo mắt miễn phí
            </button>
          </div>
        )}

        {/* Step: summary */}
        {step === 'summary' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Hình thức:</span>
                <span className="font-medium">{purchaseType === 'frame_only' ? "Chỉ gọng" : "Gọng + tròng"}</span>
              </div>
              {selectedLens && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Loại tròng:</span>
                  <span className="font-medium">{selectedLens.name}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Đơn giá:</span>
                <span className="font-bold text-[var(--primary)]">{fmt(product.price + (selectedLens?.surcharge ?? 0))}</span>
              </div>
            </div>

            {/* Quantity */}
            <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
              <span className="text-sm font-medium text-gray-700">Số lượng</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <span className="w-6 text-center font-bold">{qty}</span>
                <button
                  onClick={() => setQty(q => Math.min(product.stock, q + 1))}
                  disabled={qty >= product.stock}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-40"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center py-3 border-t border-gray-100">
              <span className="font-semibold text-gray-700">Tổng cộng:</span>
              <span className="text-xl font-bold text-[var(--primary)]">{fmt(totalPrice)}</span>
            </div>

            <button
              onClick={handleConfirm}
              className="w-full py-3.5 bg-[var(--primary)] text-white rounded-xl font-bold text-base hover:bg-[var(--primary-dark)] transition-colors"
            >
              {buyNow ? "Mua ngay" : "Thêm vào giỏ hàng"}
            </button>
          </div>
        )}
      </div>
    </ModalOverlay>
  )
}


// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastProps { message: string; type?: 'success' | 'error' | 'info'; onClose: () => void }
function Toast({ message, type = 'success', onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-[var(--primary)]',
  }

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl text-white shadow-2xl ${colors[type]} min-w-64`}>
      {type === 'success' && (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
      {type === 'error' && (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {type === 'info' && (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      <span className="text-sm font-medium">{message}</span>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconFacebook() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function IconInstagram() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}

function IconYoutube() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
    </svg>
  )
}

function IconMail() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

function TopBar() {
  return (
    <div className="bg-[var(--primary-dark)] text-white text-xs py-2 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            0966 486 999
          </span>
          <span className="hidden sm:flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            46 Hoàng Hoa Thám, Ba Đình, Hà Nội
          </span>
        </div>
        <div className="flex items-center gap-3 text-[var(--primary-light)]">
          <span className="font-medium text-white">🎁 Giảm 10% đơn đầu tiên — Mã: VINEYEWEAR10</span>
        </div>
      </div>
    </div>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar({ onHome, cartCount, onCartClick }: {
  onHome: () => void; cartCount: number; onCartClick: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button onClick={onHome} className="flex items-center gap-2 focus:outline-none">
            <div className="w-9 h-9 bg-[var(--primary)] rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <span className="text-xl font-black text-gray-900 tracking-tight">Vin <span className="text-[var(--primary)]">Eyewear</span></span>
          </button>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <button onClick={onHome} className="text-sm font-medium text-gray-700 hover:text-[var(--primary)] transition-colors">Sản phẩm</button>
            <button className="text-sm font-medium text-gray-700 hover:text-[var(--primary)] transition-colors">Thương hiệu</button>
            <button className="text-sm font-medium text-gray-700 hover:text-[var(--primary)] transition-colors">Kiểm tra mắt</button>
            <button className="text-sm font-medium text-gray-700 hover:text-[var(--primary)] transition-colors">Khuyến mãi</button>
            <button className="text-sm font-medium text-gray-700 hover:text-[var(--primary)] transition-colors">Về chúng tôi</button>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <button className="hidden md:flex p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button className="hidden md:flex p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
            <button
              onClick={onCartClick}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>
            {/* Mobile menu btn */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setMenuOpen(o => !o)}
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>
      </div>
      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 space-y-1">
          {["Sản phẩm", "Thương hiệu", "Kiểm tra mắt", "Khuyến mãi", "Về chúng tôi"].map(item => (
            <button
              key={item}
              onClick={() => { setMenuOpen(false); if (item === "Sản phẩm") onHome() }}
              className="block w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[var(--primary)] rounded-lg transition-colors"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </nav>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[var(--primary)] rounded-xl flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <span className="text-lg font-black text-white">Vin <span className="text-[var(--primary-light)]">Eyewear</span></span>
            </div>
            <p className="text-sm text-gray-400 mb-4">Chuyên gọng kính thời trang & kính thuốc chính hãng. Hơn 10 năm kinh nghiệm phục vụ khách hàng.</p>
            <div className="flex items-center gap-3">
              <a href="#" className="text-gray-400 hover:text-white transition-colors"><IconFacebook /></a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors"><IconInstagram /></a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors"><IconYoutube /></a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors"><IconMail /></a>
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Sản phẩm</h4>
            <ul className="space-y-2 text-sm">
              {["Gọng kính thời trang", "Kính râm", "Kính thuốc", "Tròng kính", "Phụ kiện kính"].map(i => (
                <li key={i}><a href="#" className="hover:text-white transition-colors">{i}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Hỗ trợ</h4>
            <ul className="space-y-2 text-sm">
              {["Hướng dẫn đặt hàng", "Chính sách đổi trả", "Bảo hành sản phẩm", "Kiểm tra mắt", "FAQ"].map(i => (
                <li key={i}><a href="#" className="hover:text-white transition-colors">{i}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Liên hệ</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[var(--primary-light)] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>46 Hoàng Hoa Thám, Ba Đình, Hà Nội<br />261 Ngọc Lâm, Long Biên, Hà Nội</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--primary-light)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>0966 486 999</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--primary-light)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>8:00 – 21:00 mỗi ngày</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <span>© 2025 Vin Eyewear. Bảo lưu mọi quyền.</span>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-gray-300 transition-colors">Chính sách bảo mật</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Điều khoản sử dụng</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  )
}


// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, type = 'text', required }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
      />
    </div>
  )
}

// ─── SelectField ──────────────────────────────────────────────────────────────

function SelectField({ label, value, onChange, options, placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void
  options: string[]; placeholder?: string; required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-white text-gray-700"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

// ─── ProductListPage ──────────────────────────────────────────────────────────

function ProductListPage({ onSelect, onAddToCart, onBuyNow }: {
  onSelect: (p: Product) => void
  onAddToCart: (p: Product) => void
  onBuyNow: (p: Product) => void
}) {
  const [search, setSearch] = useState('')
  const [filterBrand, setFilterBrand] = useState('Tất cả')
  const [filterStyle, setFilterStyle] = useState('Tất cả')
  const [filterGender, setFilterGender] = useState('Tất cả')
  const [sortBy, setSortBy] = useState('Mặc định')

  const brands = ['Tất cả', ...Array.from(new Set(PRODUCTS.map(p => p.brand)))]
  const styles = ['Tất cả', ...Array.from(new Set(PRODUCTS.map(p => p.style)))]
  const genders = ['Tất cả', ...Array.from(new Set(PRODUCTS.map(p => p.gender)))]

  const filtered = PRODUCTS
    .filter(p => {
      const q = search.toLowerCase()
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      const matchBrand = filterBrand === 'Tất cả' || p.brand === filterBrand
      const matchStyle = filterStyle === 'Tất cả' || p.style === filterStyle
      const matchGender = filterGender === 'Tất cả' || p.gender === filterGender
      return matchSearch && matchBrand && matchStyle && matchGender
    })
    .sort((a, b) => {
      if (sortBy === 'Giá tăng dần') return a.price - b.price
      if (sortBy === 'Giá giảm dần') return b.price - a.price
      if (sortBy === 'Đánh giá cao') return b.rating - a.rating
      if (sortBy === 'Nhiều đánh giá') return b.reviews - a.reviews
      return 0
    })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero banner */}
      <div className="relative bg-gradient-to-r from-[var(--primary-dark)] to-[var(--primary)] rounded-3xl overflow-hidden mb-10 p-8 md:p-12">
        <div className="relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
            ✨ Bộ sưu tập mới 2025
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight">
            Kính mắt thời trang<br />chính hãng
          </h1>
          <p className="text-[var(--primary-soft)] mb-6">Hơn 500 mẫu gọng & kính râm từ các thương hiệu nổi tiếng thế giới. Cắt tròng chuyên nghiệp tại cửa hàng.</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1.5">
              <svg className="w-4 h-4 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-white text-xs font-semibold">4.8/5 — 1000+ đánh giá</span>
            </div>
            <div className="bg-white/20 rounded-full px-3 py-1.5 text-white text-xs font-semibold">🚚 Miễn phí vận chuyển đơn từ 2tr</div>
          </div>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-64 opacity-10 flex items-center justify-center">
          <svg className="w-48 h-48 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-8">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm theo tên, thương hiệu, mã sản phẩm..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <FilterDropdown label="Thương hiệu" options={brands} value={filterBrand} onChange={setFilterBrand} />
            <FilterDropdown label="Kiểu dáng" options={styles} value={filterStyle} onChange={setFilterStyle} />
            <FilterDropdown label="Giới tính" options={genders} value={filterGender} onChange={setFilterGender} />
            <FilterDropdown label="Sắp xếp" options={['Mặc định', 'Giá tăng dần', 'Giá giảm dần', 'Đánh giá cao', 'Nhiều đánh giá']} value={sortBy} onChange={setSortBy} />
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-gray-500">
          Tìm thấy <span className="font-semibold text-gray-900">{filtered.length}</span> sản phẩm
        </p>
      </div>

      {/* Product grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy sản phẩm</h3>
          <p className="text-gray-500">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(product => (
            <div
              key={product.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all hover:-translate-y-1 group"
            >
              {/* Image */}
              <div className="relative aspect-square overflow-hidden bg-gray-50">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                  onClick={() => onSelect(product)}
                />
                {/* Tag */}
                {product.tag && (
                  <span className={`absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full ${
                    product.tag === 'Bestseller' ? 'bg-orange-500 text-white' :
                    product.tag === 'Hot' ? 'bg-red-500 text-white' :
                    product.tag === 'New' ? 'bg-green-500 text-white' :
                    product.tag === 'Sport' ? 'bg-cyan-500 text-white' :
                    product.tag === 'Luxury' ? 'bg-purple-600 text-white' :
                    product.tag === 'Premium' ? 'bg-gray-800 text-white' :
                    'bg-[var(--primary)] text-white'
                  }`}>
                    {product.tag}
                  </span>
                )}
                {product.discount > 0 && (
                  <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    -{product.discount}%
                  </span>
                )}
                {!product.inStock && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="bg-white text-gray-800 text-sm font-bold px-4 py-2 rounded-full">Hết hàng</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="text-xs text-[var(--primary)] font-semibold mb-1">{product.brand}</div>
                <h3
                  className="font-bold text-gray-900 mb-1 cursor-pointer hover:text-[var(--primary)] transition-colors line-clamp-2"
                  onClick={() => onSelect(product)}
                >
                  {product.name}
                </h3>
                <div className="text-xs text-gray-400 mb-2">{product.sku} · {product.material}</div>
                <StarRating rating={product.rating} reviews={product.reviews} />

                {/* Colors */}
                <div className="flex items-center gap-1.5 mt-2 mb-3">
                  {product.frameColors.slice(0, 4).map((c, i) => (
                    <div key={i} className="w-4 h-4 rounded-full border border-gray-200" style={{
                      background: c.includes('Đen') ? 'var(--foreground)' : c.includes('Vàng') ? '#d4a017' : c.includes('Bạc') ? '#c0c0c0' : c.includes('Nâu') ? '#8B4513' : c.includes('Xanh') ? 'var(--primary-dark)' : c.includes('Rose') ? '#e91e8c' : c.includes('Đỏ') ? 'var(--destructive)' : 'var(--muted-foreground)'
                    }} title={c} />
                  ))}
                  {product.frameColors.length > 4 && <span className="text-xs text-gray-400">+{product.frameColors.length - 4}</span>}
                </div>

                {/* Price */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg font-black text-gray-900">{fmt(product.price)}</span>
                  {product.originalPrice && (
                    <span className="text-sm text-gray-400 line-through">{fmt(product.originalPrice)}</span>
                  )}
                </div>

                {/* Actions */}
                {product.inStock ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onAddToCart(product)}
                      className="flex-1 py-2.5 border-2 border-[var(--primary)] text-[var(--primary)] rounded-xl text-sm font-semibold hover:bg-[var(--primary-soft)] transition-colors"
                    >
                      Giỏ hàng
                    </button>
                    <button
                      onClick={() => onBuyNow(product)}
                      className="flex-1 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--primary-dark)] transition-colors"
                    >
                      Mua ngay
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onSelect(product)}
                    className="w-full py-2.5 bg-gray-100 text-gray-500 rounded-xl text-sm font-semibold"
                    disabled
                  >
                    Hết hàng
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


// ─── ProductDetailPage ────────────────────────────────────────────────────────

function ProductDetailPage({ product, onBack, onAddToCart, onBuyNow }: {
  product: Product; onBack: () => void
  onAddToCart: (p: Product) => void; onBuyNow: (p: Product) => void
}) {
  const [activeTab, setActiveTab] = useState<'info' | 'specs' | 'reviews'>('info')
  const [selectedColor, setSelectedColor] = useState(product.frameColors[0])

  const colorMap: Record<string, string> = {
    "Đen bóng": "var(--foreground)", "Đen matte": "#2d2d2d", "Đen": "var(--foreground)", "Đen PVD": "#111",
    "Vàng": "#d4a017", "Vàng đồng": "#b8860b", "Vàng 18k": "#FFD700", "Rose gold": "#e91e8c",
    "Bạc": "#c0c0c0", "Titanium tự nhiên": "#a8b0b8",
    "Nâu đồi mồi": "#8B4513", "Đồi mồi": "#8B6914", "Nâu trong": "#A0522D",
    "Xanh dương matte": "#1e40af", "Xanh navy": "#001f5b", "Xanh neon": "#22d3ee",
    "Đỏ trắng": "var(--destructive)",
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <button onClick={onBack} className="hover:text-[var(--primary)] transition-colors flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Tất cả sản phẩm
        </button>
        <span>/</span>
        <span className="text-gray-900 font-medium">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Image */}
        <div className="space-y-4">
          <div className="aspect-square rounded-2xl overflow-hidden bg-gray-50">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          </div>
          {/* Color picker */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Màu gọng: <span className="font-semibold text-gray-900">{selectedColor}</span>
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {product.frameColors.map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  title={c}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor === c ? 'border-[var(--primary)] scale-110' : 'border-gray-200'}`}
                  style={{ background: colorMap[c] ?? 'var(--muted-foreground)' }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-[var(--primary)]">{product.brand}</span>
              {product.tag && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  product.tag === 'Bestseller' ? 'bg-orange-100 text-orange-700' :
                  product.tag === 'Hot' ? 'bg-red-100 text-red-700' :
                  product.tag === 'New' ? 'bg-green-100 text-green-700' :
                  'bg-[var(--primary-soft)] text-[var(--primary-dark)]'
                }`}>
                  {product.tag}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-1">{product.name}</h1>
            <p className="text-sm text-gray-500 mb-3">{product.sku} · {product.material} · {product.size}</p>
            <StarRating rating={product.rating} reviews={product.reviews} size="md" />
          </div>

          {/* Price */}
          <div className="bg-[var(--primary-soft)] rounded-2xl p-4">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-[var(--primary-dark)]">{fmt(product.price)}</span>
              {product.originalPrice && (
                <>
                  <span className="text-lg text-gray-400 line-through">{fmt(product.originalPrice)}</span>
                  <span className="bg-red-500 text-white text-sm font-bold px-2 py-0.5 rounded-full">-{product.discount}%</span>
                </>
              )}
            </div>
            {product.supportsLensCutting && (
              <p className="text-xs text-[var(--primary)] mt-2 font-medium">✓ Hỗ trợ cắt tròng kính theo số đo</p>
            )}
          </div>

          {/* Stock */}
          <div className="flex items-center gap-2">
            {product.inStock ? (
              <>
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                <span className="text-sm text-green-700 font-medium">Còn hàng ({product.stock} sản phẩm)</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                <span className="text-sm text-red-600 font-medium">Hết hàng</span>
              </>
            )}
          </div>

          {/* Tabs */}
          <div>
            <div className="flex border-b border-gray-200 mb-4">
              {(['info', 'specs', 'reviews'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === t ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t === 'info' ? "Mô tả" : t === 'specs' ? "Thông số" : `Đánh giá (${product.reviews})`}
                </button>
              ))}
            </div>

            {activeTab === 'info' && (
              <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
            )}

            {activeTab === 'specs' && (
              <div className="space-y-2">
                {Object.entries(product.specs).map(([k, v]) => (
                  <div key={k} className="flex text-sm py-2 border-b border-gray-50 last:border-0">
                    <span className="w-40 text-gray-500 font-medium">{k}</span>
                    <span className="text-gray-900">{v}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-4">
                {product.reviewList.map((r, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900 text-sm">{r.name}</span>
                      <span className="text-xs text-gray-400">{r.date}</span>
                    </div>
                    <StarRating rating={r.stars} />
                    <p className="text-sm text-gray-600 mt-2">{r.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CTA */}
          {product.inStock ? (
            <div className="flex gap-3">
              <button
                onClick={() => onAddToCart(product)}
                className="flex-1 py-3.5 border-2 border-[var(--primary)] text-[var(--primary)] rounded-xl font-semibold hover:bg-[var(--primary-soft)] transition-colors"
              >
                Thêm vào giỏ
              </button>
              <button
                onClick={() => onBuyNow(product)}
                className="flex-1 py-3.5 bg-[var(--primary)] text-white rounded-xl font-semibold hover:bg-[var(--primary-dark)] transition-colors"
              >
                Mua ngay
              </button>
            </div>
          ) : (
            <button className="w-full py-3.5 bg-gray-100 text-gray-400 rounded-xl font-semibold cursor-not-allowed" disabled>
              Sản phẩm đang hết hàng
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── ConfirmDeleteDialog ──────────────────────────────────────────────────────

function ConfirmDeleteDialog({ message, onConfirm, onCancel }: {
  message: string; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <ModalOverlay onClose={onCancel}>
      <div className="p-6 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Xác nhận xóa</h3>
        <p className="text-gray-500 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Hủy
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors">
            Xóa
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ─── CartPage ─────────────────────────────────────────────────────────────────

function CartPage({ items, onUpdateQty, onDelete, onCheckout, onHome }: {
  items: CartItem[]
  onUpdateQty: (idx: number, qty: number) => void
  onDelete: (idx: number) => void
  onCheckout: (selected: CartItem[]) => void
  onHome: () => void
}) {
  const [selected, setSelected] = useState<boolean[]>(() => items.map(() => true))
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null)

  // Sync selected array length when items change
  useEffect(() => {
    setSelected(prev => {
      const next = items.map((_, i) => prev[i] ?? true)
      return next
    })
  }, [items.length])

  const allSelected = selected.length > 0 && selected.every(Boolean)
  const toggleAll = () => setSelected(items.map(() => !allSelected))
  const toggle = (i: number) => setSelected(prev => prev.map((v, idx) => idx === i ? !v : v))

  const selectedItems = items.filter((_, i) => selected[i])
  const subtotal = selectedItems.reduce((s, item) => s + (item.product.price + (item.lensOption?.surcharge ?? 0)) * item.qty, 0)

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="text-8xl mb-6">🛒</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Giỏ hàng trống</h2>
        <p className="text-gray-500 mb-8">Hãy thêm sản phẩm vào giỏ hàng để tiếp tục mua sắm</p>
        <button
          onClick={onHome}
          className="px-8 py-3.5 bg-[var(--primary)] text-white rounded-xl font-semibold hover:bg-[var(--primary-dark)] transition-colors"
        >
          Khám phá sản phẩm
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onHome} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-black text-gray-900">Giỏ hàng ({items.length})</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Select all */}
          <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3">
            <input
              type="checkbox"
              id="select-all"
              checked={allSelected}
              onChange={toggleAll}
              className="w-4 h-4 rounded text-[var(--primary)] cursor-pointer"
            />
            <label htmlFor="select-all" className="text-sm font-medium text-gray-700 cursor-pointer">
              Chọn tất cả ({items.length} sản phẩm)
            </label>
          </div>

          {items.map((item, i) => (
            <div key={i} className={`bg-white rounded-2xl border transition-all ${selected[i] ? 'border-[var(--primary-soft)]' : 'border-gray-100'} p-4`}>
              <div className="flex gap-4">
                <div className="flex items-start pt-1">
                  <input
                    type="checkbox"
                    checked={selected[i] ?? true}
                    onChange={() => toggle(i)}
                    className="w-4 h-4 rounded text-[var(--primary)] cursor-pointer"
                  />
                </div>
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-20 h-20 object-cover rounded-xl flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-[var(--primary)] font-semibold">{item.product.brand}</div>
                      <h4 className="font-bold text-gray-900 text-sm leading-tight">{item.product.name}</h4>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {item.purchaseType === 'frame_only' ? "Chỉ gọng" : `Gọng + ${item.lensOption?.name ?? "tròng"}`}
                      </div>
                      {item.prescription && (
                        <div className="text-xs text-gray-400">
                          OD: {item.prescription.od.sph} / OS: {item.prescription.os.sph}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setDeleteIdx(i)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onUpdateQty(i, item.qty - 1)}
                        disabled={item.qty <= 1}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <span className="w-5 text-center text-sm font-bold">{item.qty}</span>
                      <button
                        onClick={() => onUpdateQty(i, item.qty + 1)}
                        disabled={item.qty >= item.product.stock}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                    <span className="font-bold text-[var(--primary)]">
                      {fmt((item.product.price + (item.lensOption?.surcharge ?? 0)) * item.qty)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-24">
            <h3 className="font-bold text-gray-900 mb-4">Tóm tắt đơn hàng</h3>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Đã chọn ({selectedItems.length} sản phẩm)</span>
                <span className="font-medium">{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phí vận chuyển</span>
                <span className="text-gray-400">Tính sau</span>
              </div>
            </div>
            <div className="flex justify-between font-bold text-lg border-t border-gray-100 pt-3 mb-5">
              <span>Tạm tính</span>
              <span className="text-[var(--primary)]">{fmt(subtotal)}</span>
            </div>
            <button
              onClick={() => onCheckout(selectedItems)}
              disabled={selectedItems.length === 0}
              className="w-full py-3.5 bg-[var(--primary)] text-white rounded-xl font-semibold hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Tiến hành đặt hàng ({selectedItems.length})
            </button>
            <button
              onClick={onHome}
              className="w-full mt-3 py-3 text-[var(--primary)] text-sm font-medium hover:underline transition-colors"
            >
              Tiếp tục mua sắm
            </button>
          </div>

          {/* Promo hints */}
          <div className="bg-[var(--primary-soft)] rounded-2xl p-4">
            <h4 className="text-sm font-semibold text-[var(--primary-dark)] mb-2">Mã giảm giá</h4>
            <p className="text-xs text-[var(--primary)]">Nhập mã ở bước thanh toán để được giảm giá</p>
            <div className="mt-2 space-y-1">
              {PROMO_CODES.slice(0, 2).map(p => (
                <div key={p.code} className="text-xs bg-white rounded-lg px-3 py-1.5 font-mono font-bold text-[var(--primary-dark)] border border-[var(--primary-soft)]">
                  {p.code}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirm */}
      {deleteIdx !== null && (
        <ConfirmDeleteDialog
          message={`Xóa "${items[deleteIdx]?.product.name}" khỏi giỏ hàng?`}
          onConfirm={() => { onDelete(deleteIdx); setDeleteIdx(null) }}
          onCancel={() => setDeleteIdx(null)}
        />
      )}
    </div>
  )
}


// ─── CheckoutPage ─────────────────────────────────────────────────────────────

function CheckoutPage({ items, onBack, onPlaceOrder }: {
  items: CartItem[]
  onBack: () => void
  onPlaceOrder: (order: PlacedOrder) => void
}) {
  const [checkoutStep, setCheckoutStep] = useState<1 | 2>(1)

  // Step 1 - Delivery info
  const [info, setInfo] = useState<OrderInfo>({
    name: '', phone: '', province: '', district: '', ward: '', streetAddress: '', note: ''
  })
  const [infoErrors, setInfoErrors] = useState<Partial<OrderInfo>>({})

  // Shipping — đã chọn ngay ở step 1
  const [shipping, setShipping] = useState<ShippingMethod>(SHIPPING_METHODS[0])

  // Step 2 - Promo + Payment
  const [promoInput, setPromoInput] = useState('')
  const [promoDropdownOpen, setPromoDropdownOpen] = useState(false)
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)

  // Đơn có tròng → mặc định online để đặt cọc
  const hasLensItems = items.some(i => i.purchaseType === 'with_lens')
  const [payment, setPayment] = useState<PaymentMethod>('cod')

  const provinces = Object.keys(ADDRESS_DATA)
  const districts = info.province ? Object.keys(ADDRESS_DATA[info.province]?.districts ?? {}) : []
  const wards = (info.province && info.district) ? (ADDRESS_DATA[info.province]?.districts[info.district] ?? []) : []

  const subtotal = items.reduce((s, item) => s + (item.product.price + (item.lensOption?.surcharge ?? 0)) * item.qty, 0)

  function calcDiscount(promo: PromoCode | null): number {
    if (!promo) return 0
    if (promo.discountType === 'percent') return Math.round(subtotal * promo.discountValue / 100)
    return Math.min(promo.discountValue, shipping.fee > 0 && promo.code === 'FREESHIP' ? shipping.fee : promo.discountValue)
  }

  const discount = calcDiscount(appliedPromo)
  const shippingFee = appliedPromo?.code === 'FREESHIP' ? 0 : shipping.fee
  const total = Math.max(0, subtotal - discount + shippingFee)

  // Nhận tại cửa hàng → không cần nhập địa chỉ
  const isPickup = shipping.id === 'store_taytho' || shipping.id === 'store_longbien'

  function validateInfo(): boolean {
    const errors: Partial<OrderInfo> = {}
    if (!info.name.trim()) errors.name = "Vui lòng nhập họ tên"
    if (!info.phone.trim() || !/^(0|\+84)[0-9]{9}$/.test(info.phone.replace(/\s/g, ''))) errors.phone = "Số điện thoại không hợp lệ"
    if (!isPickup) {
      if (!info.province) errors.province = "Vui lòng chọn tỉnh/thành"
      if (!info.district) errors.district = "Vui lòng chọn quận/huyện"
      if (!info.ward) errors.ward = "Vui lòng chọn phường/xã"
      if (!info.streetAddress.trim()) errors.streetAddress = "Vui lòng nhập địa chỉ"
    }
    setInfoErrors(errors)
    return Object.keys(errors).length === 0
  }

  function applyPromo() {
    const code = promoInput.trim().toUpperCase()
    const found = PROMO_CODES.find(p => p.code === code)
    if (!found) { setPromoError("Mã giảm giá không tồn tại"); setAppliedPromo(null); return }
    if (new Date(found.validUntil) < new Date()) { setPromoError("Mã đã hết hạn sử dụng"); setAppliedPromo(null); return }
    if (found.usedCount >= found.maxUses) { setPromoError("Mã đã hết lượt sử dụng"); setAppliedPromo(null); return }
    if (subtotal < found.minOrder) { setPromoError(`Đơn hàng tối thiểu ${fmt(found.minOrder)} để dùng mã này`); setAppliedPromo(null); return }
    setAppliedPromo(found)
    setPromoError(null)
  }

  function removePromo() {
    setAppliedPromo(null)
    setPromoInput('')
    setPromoError(null)
  }

  function handlePlaceOrder() {
    const order: PlacedOrder = {
      id: generateOrderId(),
      items,
      info,
      shipping,
      promo: appliedPromo,
      subtotal,
      discount,
      shippingFee,
      total,
      payment,
      createdAt: new Date().toISOString(),
    }
    onPlaceOrder(order)
  }

  const stepLabels = ["Thông tin nhận hàng", "Xác nhận đơn hàng"]

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-black text-gray-900">Đặt hàng</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {stepLabels.map((label, i) => {
          const n = i + 1
          const active = checkoutStep === n
          const done = checkoutStep > n
          return (
            <div key={n} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  done ? 'bg-green-500 text-white' : active ? 'bg-[var(--primary)] text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  {done ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : n}
                </div>
                <span className={`hidden sm:block text-xs font-medium ${active ? 'text-[var(--primary)]' : done ? 'text-green-600' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
              {i < stepLabels.length - 1 && <div className="w-8 h-0.5 bg-gray-200 mx-1" />}
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Step 1 */}
          {checkoutStep === 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Thông tin nhận hàng</h2>

              {/* Chọn hình thức nhận ngay từ đầu */}
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>Hình thức nhận hàng</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button onClick={() => setShipping(SHIPPING_METHODS[0])}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${shipping.id === 'home' ? 'border-[var(--primary)] bg-[var(--primary-soft)]' : 'border-gray-200 hover:border-gray-300'}`}>
                    <span className="text-xl">🚚</span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: shipping.id === 'home' ? 'var(--primary)' : 'var(--foreground)' }}>Giao tận nhà</p>
                      <p className="text-xs" style={{ color: 'var(--caption)' }}>{fmt(SHIPPING_METHODS[0].fee)}</p>
                    </div>
                  </button>
                  <div className="flex flex-col gap-2">
                    {[SHIPPING_METHODS[1], SHIPPING_METHODS[2]].map(m => (
                      <button key={m.id} onClick={() => setShipping(m)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${shipping.id === m.id ? 'border-[var(--primary)] bg-[var(--primary-soft)]' : 'border-gray-200 hover:border-gray-300'}`}>
                        <span className="text-lg">🏪</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: shipping.id === m.id ? 'var(--primary)' : 'var(--foreground)' }}>
                            {m.id === 'store_taytho' ? 'CS Tây Hồ' : 'CS Long Biên'}
                          </p>
                          <p className="text-[10px]" style={{ color: 'var(--caption)' }}>Miễn phí</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Field label="Họ và tên" value={info.name} onChange={v => setInfo(i => ({ ...i, name: v }))} placeholder="Nguyễn Văn A" required />
                  {infoErrors.name && <p className="text-red-500 text-xs mt-1">{infoErrors.name}</p>}
                </div>
                <div>
                  <Field label="Số điện thoại" value={info.phone} onChange={v => setInfo(i => ({ ...i, phone: v }))} placeholder="0912 345 678" type="tel" required />
                  {infoErrors.phone && <p className="text-red-500 text-xs mt-1">{infoErrors.phone}</p>}
                </div>
              </div>
              {!isPickup && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <SelectField
                        label="Tỉnh / Thành phố" value={info.province}
                        onChange={v => setInfo(i => ({ ...i, province: v, district: '', ward: '' }))}
                        options={provinces} placeholder="Chọn tỉnh/thành" required
                      />
                      {infoErrors.province && <p className="text-red-500 text-xs mt-1">{infoErrors.province}</p>}
                    </div>
                    <div>
                      <SelectField
                        label="Quận / Huyện" value={info.district}
                        onChange={v => setInfo(i => ({ ...i, district: v, ward: '' }))}
                        options={districts} placeholder="Chọn quận/huyện" required
                      />
                      {infoErrors.district && <p className="text-red-500 text-xs mt-1">{infoErrors.district}</p>}
                    </div>
                    <div>
                      <SelectField
                        label="Phường / Xã" value={info.ward}
                        onChange={v => setInfo(i => ({ ...i, ward: v }))}
                        options={wards} placeholder="Chọn phường/xã" required
                      />
                      {infoErrors.ward && <p className="text-red-500 text-xs mt-1">{infoErrors.ward}</p>}
                    </div>
                  </div>
                  <div>
                    <Field label="Số nhà, tên đường" value={info.streetAddress} onChange={v => setInfo(i => ({ ...i, streetAddress: v }))} placeholder="46 Hoàng Hoa Thám" required />
                    {infoErrors.streetAddress && <p className="text-red-500 text-xs mt-1">{infoErrors.streetAddress}</p>}
                  </div>
                </>
              )}

              {/* Banner địa chỉ cửa hàng khi chọn pickup */}
              {isPickup && (
                <div className="flex items-start gap-3 p-4 rounded-xl" style={{ backgroundColor: 'var(--primary-soft)', border: '1px solid var(--primary-light)' }}>
                  <span className="text-xl">📍</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
                      {shipping.id === 'store_taytho' ? 'Cơ sở Tây Hồ' : 'Cơ sở Long Biên'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--caption)' }}>{shipping.desc}</p>
                    <p className="text-xs mt-1 font-medium" style={{ color: 'var(--caption)' }}>Giờ mở cửa: 8:00 – 21:00 mỗi ngày</p>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Ghi chú</label>
                <textarea
                  value={info.note}
                  onChange={e => setInfo(i => ({ ...i, note: e.target.value }))}
                  placeholder="Ghi chú thêm cho đơn hàng (tuỳ chọn)..."
                  rows={3}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
                />
              </div>
              <button
                onClick={() => { if (validateInfo()) setCheckoutStep(2) }}
                className="w-full py-3.5 bg-[var(--primary)] text-white rounded-xl font-semibold hover:bg-[var(--primary-dark)] transition-colors"
              >
                Tiếp theo: Xác nhận đơn hàng
              </button>
            </div>
          )}

          {/* Step 2 — Xác nhận đơn + Promo + Thanh toán */}
          {checkoutStep === 2 && (
            <div className="space-y-5">

              {/* Banner đặt cọc khi đơn có tròng */}
              {hasLensItems && (
                <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--primary-soft)', border: '1px solid var(--primary-light)' }}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💎</span>
                    <div>
                      <p className="font-bold text-sm" style={{ color: 'var(--primary)' }}>Đơn có cắt tròng kính — cần đặt cọc 5%</p>
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--accent-foreground)' }}>
                        Đơn hàng của bạn gồm sản phẩm cắt tròng theo số đo. Chúng tôi yêu cầu đặt cọc <strong>5% giá trị đơn</strong> để xác nhận sản xuất. Số tiền còn lại thanh toán khi nhận hàng.
                      </p>
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        {[
                          ['Tổng đơn', fmt(total)],
                          ['Đặt cọc 5%', fmt(Math.round(total * 0.05))],
                          ['Còn lại', fmt(total - Math.round(total * 0.05))],
                        ].map(([k, v]) => (
                          <div key={k} className="rounded-lg py-2 px-1 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.6)' }}>
                            <p className="text-[10px] font-medium" style={{ color: 'var(--accent-foreground)' }}>{k}</p>
                            <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--primary)' }}>{v}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Xem lại đơn hàng */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Xem lại đơn hàng</h2>
                <div className="space-y-3">
                  {items.map((item, i) => (
                    <div key={i} className="flex gap-3 py-3 border-b border-gray-50 last:border-0">
                      <img src={item.product.image} alt={item.product.name} className="w-14 h-14 object-cover rounded-xl" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{item.product.name}</div>
                        <div className="text-xs text-gray-400">
                          {item.purchaseType === 'frame_only' ? "Chỉ gọng" : `Gọng + ${item.lensOption?.name ?? "tròng"}`} · SL: {item.qty}
                        </div>
                        {item.purchaseType === 'with_lens' && (
                          <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full font-semibold mt-0.5" style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)' }}>Cắt tròng</span>
                        )}
                      </div>
                      <div className="font-bold text-gray-900 text-sm flex-shrink-0">
                        {fmt((item.product.price + (item.lensOption?.surcharge ?? 0)) * item.qty)}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Shipping info */}
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 text-sm">
                  <span>{isPickup ? '🏪' : '🚚'}</span>
                  <span style={{ color: 'var(--caption)' }}>{shipping.name}</span>
                  <span className="ml-auto font-semibold" style={{ color: shippingFee === 0 ? 'var(--success)' : 'var(--foreground)' }}>
                    {shippingFee === 0 ? 'Miễn phí' : fmt(shippingFee)}
                  </span>
                </div>
              </div>

              {/* Mã giảm giá */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-3">Mã giảm giá</h3>
                {appliedPromo ? (
                  <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--primary-soft)', border: '1px solid var(--primary-light)' }}>
                    <div>
                      <span className="font-mono font-bold" style={{ color: 'var(--primary)' }}>{appliedPromo.code}</span>
                      <span className="text-xs ml-2" style={{ color: 'var(--accent-foreground)' }}>— {appliedPromo.label}</span>
                    </div>
                    <button onClick={removePromo} className="text-xs font-medium hover:underline" style={{ color: 'var(--destructive)' }}>Xóa</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Dropdown chọn mã có sẵn */}
                    {(() => {
                      const today = new Date().toISOString().slice(0, 10)
                      const available = PROMO_CODES.filter(p =>
                        p.validUntil >= today && p.usedCount < p.maxUses && subtotal >= p.minOrder && p.code !== 'EXPIRED'
                      )
                      return available.length > 0 ? (
                        <div className="relative">
                          <button
                            onClick={() => setPromoDropdownOpen(o => !o)}
                            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm transition-all"
                            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)', color: 'var(--foreground)' }}
                          >
                            <span style={{ color: 'var(--caption)' }}>Chọn mã giảm giá...</span>
                            <svg className="w-4 h-4 transition-transform" style={{ transform: promoDropdownOpen ? 'rotate(180deg)' : 'rotate(0)', color: 'var(--caption)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {promoDropdownOpen && (
                            <div className="absolute z-10 top-full left-0 right-0 mt-1 rounded-xl shadow-lg overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                              {available.map(p => {
                                const saving = p.discountType === 'percent'
                                  ? Math.round(subtotal * p.discountValue / 100)
                                  : p.discountValue
                                return (
                                  <button key={p.code}
                                    onClick={() => { setAppliedPromo(p); setPromoError(null); setPromoDropdownOpen(false) }}
                                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--muted)] transition-colors border-b last:border-0"
                                    style={{ borderColor: 'var(--border)' }}>
                                    <div>
                                      <span className="font-mono font-bold text-sm" style={{ color: 'var(--primary)' }}>{p.code}</span>
                                      <p className="text-xs mt-0.5" style={{ color: 'var(--caption)' }}>{p.label}</p>
                                      {p.minOrder > 0 && <p className="text-[10px]" style={{ color: 'var(--caption)' }}>Đơn tối thiểu {fmt(p.minOrder)}</p>}
                                    </div>
                                    <span className="text-sm font-bold ml-3 shrink-0" style={{ color: 'var(--success)' }}>-{fmt(saving)}</span>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      ) : null
                    })()}
                    {/* Input thủ công */}
                    <div className="flex gap-2">
                      <input
                        type="text" value={promoInput}
                        onChange={e => setPromoInput(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && applyPromo()}
                        placeholder="Hoặc nhập mã khác..."
                        className="flex-1 px-3 py-2.5 border rounded-xl text-sm focus:outline-none"
                        style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                      />
                      <button onClick={applyPromo}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                        style={{ backgroundColor: 'var(--primary)' }}>
                        Áp dụng
                      </button>
                    </div>
                  </div>
                )}
                {promoError && <p className="text-xs mt-2" style={{ color: 'var(--destructive)' }}>{promoError}</p>}
              </div>

              {/* Phương thức thanh toán */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Phương thức thanh toán</h3>
                {hasLensItems && (
                  <div className="mb-4 p-3 rounded-xl text-xs font-medium" style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)' }}>
                    💎 Đơn có cắt tròng: bắt buộc đặt cọc <strong>5%</strong> khi đặt hàng. Số tiền còn lại thanh toán khi nhận hàng.
                  </div>
                )}
                <div className="space-y-3">
                  {([
                    {
                      id: 'cod' as PaymentMethod,
                      icon: '🏠',
                      name: "Thanh toán khi nhận hàng",
                      desc: hasLensItems
                        ? `Đặt cọc ${fmt(Math.round(total * 0.05))} khi đặt — còn lại trả khi nhận`
                        : "Trả tiền mặt hoặc chuyển khoản khi nhận hàng",
                    },
                    {
                      id: 'online' as PaymentMethod,
                      icon: '📱',
                      name: "Thanh toán online",
                      desc: hasLensItems
                        ? "Đặt cọc 5% hoặc thanh toán full — nhận ưu đãi khi full"
                        : "QR VietQR · MoMo · VNPay — xác nhận đơn ngay",
                    },
                  ]).map(m => (
                    <button key={m.id} onClick={() => setPayment(m.id)}
                      className={`w-full flex items-center gap-3 p-4 border-2 rounded-xl transition-all text-left ${payment === m.id ? 'border-[var(--primary)] bg-[var(--primary-soft)]' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${payment === m.id ? 'border-[var(--primary)]' : 'border-gray-300'}`}>
                        {payment === m.id && <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary)]" />}
                      </div>
                      <span className="text-xl leading-none">{m.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-900">{m.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{m.desc}</div>
                      </div>
                      {m.id === 'online' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0" style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                          {hasLensItems ? '🎁 Ưu đãi' : 'Nhanh nhất'}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setCheckoutStep(1)}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
                  Quay lại
                </button>
                <button onClick={handlePlaceOrder}
                  className="flex-1 py-3.5 bg-[var(--primary)] text-white rounded-xl font-semibold hover:bg-[var(--primary-dark)] transition-colors">
                  {payment === 'online' ? (hasLensItems ? `Đặt hàng & Đặt cọc ${fmt(Math.round(total * 0.05))}` : "Đặt hàng & Thanh toán") : "Xác nhận đặt hàng"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order summary sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-24">
            <h3 className="font-bold text-gray-900 mb-4">Tóm tắt đơn hàng</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Tạm tính ({items.length} sản phẩm)</span>
                <span>{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phí vận chuyển</span>
                <span>{shippingFee === 0 ? <span className="text-green-600">Miễn phí</span> : fmt(shippingFee)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Giảm giá</span>
                  <span>-{fmt(discount)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between font-bold text-lg border-t border-gray-100 pt-3 mt-3">
              <span>Tổng cộng</span>
              <span className="text-[var(--primary)]">{fmt(total)}</span>
            </div>
            {checkoutStep > 1 && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>Giao hàng:</span>
                  <span className="font-medium text-gray-700">{shipping.name}</span>
                </div>
                {info.name && (
                  <div className="flex justify-between">
                    <span>Nhận hàng:</span>
                    <span className="font-medium text-gray-700 text-right max-w-32 truncate">{info.name}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


// ─── PaymentPage ──────────────────────────────────────────────────────────────

function PaymentPage({ order, onResult, onBack }: {
  order: PlacedOrder
  onResult: (txn: Transaction) => void
  onBack: () => void
}) {
  const hasLens = order.items.some(i => i.purchaseType === 'with_lens')
  const isCOD   = order.payment === 'cod'

  // COD chỉ đặt cọc; online thì có thêm lựa chọn full
  const [payMode, setPayMode] = useState<'deposit' | 'full'>(
    hasLens ? 'deposit' : 'full'
  )
  const [confirmed, setConfirmed] = useState(false)

  // Tính tiền
  const depositAmount = Math.round(order.total * 0.05)
  const remaining     = order.total - depositAmount

  // Mã full tốt nhất
  const today = new Date().toISOString().slice(0, 10)
  const bestFullPromo = PROMO_CODES.find(
    p => FULL_PAYMENT_PROMOS.includes(p.code) &&
         p.validUntil >= today && p.usedCount < p.maxUses && order.total >= p.minOrder
  ) ?? null
  const fullDiscount = bestFullPromo
    ? bestFullPromo.discountType === 'percent'
      ? Math.round(order.total * bestFullPromo.discountValue / 100)
      : bestFullPromo.discountValue
    : 0
  const fullAmount = order.total - fullDiscount
  const payAmount  = !hasLens ? order.total : payMode === 'deposit' ? depositAmount : fullAmount

  function handleConfirm() {
    onResult({
      txnId:           'TXN-' + Date.now().toString(36).toUpperCase(),
      orderId:         order.id,
      amount:          payAmount,
      expectedAmount:  payAmount,
      method:          'QR VietQR',
      status:          'success',
      paidAt:          new Date().toLocaleString('vi-VN'),
      isDeposit:       hasLens && payMode === 'deposit',
      depositAmount:   hasLens && payMode === 'deposit' ? depositAmount : 0,
      remainingAmount: hasLens && payMode === 'deposit' ? remaining : 0,
    })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-black text-gray-900">Thanh toán</h1>
          <p className="text-xs text-gray-500">#{order.id}</p>
        </div>
      </div>

      {/* Layout: QR bên trái — Options bên phải */}
      <div className="flex flex-col md:flex-row gap-4 items-start">

        {/* ── Cột trái: QR code ─────────────────────────────────────── */}
        <div className="w-full md:w-72 shrink-0 bg-white rounded-2xl border border-gray-100 p-5 text-center">
          <p className="font-bold text-gray-900 mb-1 text-sm">Quét QR để thanh toán</p>
          <p className="text-[11px] text-gray-400 mb-4">App ngân hàng hỗ trợ VietQR</p>

          {/* QR SVG */}
          <div className="mx-auto w-44 h-44 rounded-xl overflow-hidden border-4 bg-white flex items-center justify-center mb-4"
            style={{ borderColor: 'var(--border)', boxShadow: '0 0 0 5px var(--muted)' }}>
            <svg viewBox="0 0 200 200" className="w-40 h-40">
              <rect x="8"  y="8"  width="52" height="52" rx="6" fill="none" stroke="#1a1214" strokeWidth="7"/>
              <rect x="20" y="20" width="28" height="28" rx="2" fill="#1a1214"/>
              <rect x="140" y="8"  width="52" height="52" rx="6" fill="none" stroke="#1a1214" strokeWidth="7"/>
              <rect x="152" y="20" width="28" height="28" rx="2" fill="#1a1214"/>
              <rect x="8"  y="140" width="52" height="52" rx="6" fill="none" stroke="#1a1214" strokeWidth="7"/>
              <rect x="20" y="152" width="28" height="28" rx="2" fill="#1a1214"/>
              <rect x="82" y="82" width="36" height="36" rx="5" fill="var(--primary)"/>
              <text x="100" y="107" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">V</text>
              {[72,80,88,96,104,112,120,128].flatMap(x =>
                [72,80,88,96,104,112,120,128].map(y => {
                  if (x >= 82 && x <= 118 && y >= 82 && y <= 118) return null
                  return Math.sin(x * 1.3 + y * 0.7) > 0.15
                    ? <rect key={`${x}-${y}`} x={x} y={y} width="7" height="7" rx="1" fill="#1a1214"/>
                    : null
                })
              )}
              {[140,148,156,164,172,180].flatMap(x =>
                [140,148,156,164,172,180].map(y =>
                  Math.cos(x * 0.9 + y * 1.1) > 0
                    ? <rect key={`c${x}-${y}`} x={x} y={y} width="7" height="7" rx="1" fill="#1a1214"/>
                    : null
                )
              )}
            </svg>
          </div>

          {/* Thông tin ngân hàng */}
          <div className="space-y-1 text-[11px] text-gray-500 mb-4 text-left bg-gray-50 rounded-xl p-3">
            <p>Ngân hàng: <strong className="text-gray-800">Vietcombank</strong></p>
            <p>STK: <strong className="text-gray-800">1234 5678 9012</strong></p>
            <p>Tên: <strong className="text-gray-800">VIN EYEWEAR</strong></p>
            <p>Nội dung: <strong className="text-gray-800">{order.id}</strong></p>
          </div>

          {/* Số tiền nổi bật */}
          <div className="rounded-xl py-3 px-4" style={{ backgroundColor: 'var(--primary-soft)', border: '1px solid var(--primary-light)' }}>
            <p className="text-[11px] font-medium mb-0.5" style={{ color: 'var(--accent-foreground)' }}>
              {hasLens && payMode === 'deposit' ? 'Đặt cọc 5%' : 'Số tiền cần chuyển'}
            </p>
            <p className="text-2xl font-black" style={{ color: 'var(--primary)' }}>{fmt(payAmount)}</p>
            {hasLens && payMode === 'deposit' && (
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--accent-foreground)' }}>
                Còn lại {fmt(remaining)} khi nhận hàng
              </p>
            )}
            {hasLens && payMode === 'full' && bestFullPromo && (
              <p className="text-[10px] mt-0.5 font-semibold" style={{ color: 'var(--success)' }}>
                Đã giảm {fmt(fullDiscount)} — {bestFullPromo.code}
              </p>
            )}
          </div>
        </div>

        {/* ── Cột phải: Options + Xác nhận ─────────────────────────── */}
        <div className="flex-1 space-y-4">

          {/* Chọn cọc / full — chỉ khi đơn có tròng */}
          {hasLens && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-sm font-bold text-gray-900 mb-1">Hình thức thanh toán</p>
              {isCOD && (
                <p className="text-xs mb-3" style={{ color: 'var(--caption)' }}>
                  Thanh toán khi nhận hàng — cần đặt cọc 5% qua QR để xác nhận đơn.
                </p>
              )}
              <div className="space-y-2">
                {/* Đặt cọc — luôn hiện */}
                <button onClick={() => { setPayMode('deposit'); setConfirmed(false) }}
                  className={`w-full flex items-center gap-3 p-3.5 border-2 rounded-xl transition-all text-left ${payMode === 'deposit' ? 'border-[var(--primary)] bg-[var(--primary-soft)]' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${payMode === 'deposit' ? 'border-[var(--primary)]' : 'border-gray-300'}`}>
                    {payMode === 'deposit' && <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">Đặt cọc 5%</p>
                    <p className="text-xs text-gray-500">Trả thêm {fmt(remaining)} khi nhận hàng</p>
                  </div>
                  <p className="text-sm font-black shrink-0" style={{ color: 'var(--primary)' }}>{fmt(depositAmount)}</p>
                </button>

                {/* Thanh toán full — chỉ khi online */}
                {!isCOD && (
                <button onClick={() => { setPayMode('full'); setConfirmed(false) }}
                  className={`w-full flex items-center gap-3 p-3.5 border-2 rounded-xl transition-all text-left ${payMode === 'full' ? 'border-[var(--primary)] bg-[var(--primary-soft)]' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${payMode === 'full' ? 'border-[var(--primary)]' : 'border-gray-300'}`}>
                    {payMode === 'full' && <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">Thanh toán đủ</p>
                    {bestFullPromo
                      ? <p className="text-xs font-semibold" style={{ color: 'var(--success)' }}>🎁 Giảm {fmt(fullDiscount)} — {bestFullPromo.code}</p>
                      : <p className="text-xs text-gray-500">Không cần trả thêm</p>}
                  </div>
                  <p className="text-sm font-black shrink-0" style={{ color: 'var(--primary)' }}>{fmt(fullAmount)}</p>
                </button>
                )}
              </div>

              {/* Banner giảm giá full — chỉ online */}
              {!isCOD && payMode === 'full' && bestFullPromo && (
                <div className="mt-3 flex items-center gap-2 p-3 rounded-xl text-xs font-medium"
                  style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}>
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  Mã <strong>{bestFullPromo.code}</strong> tự động áp — tiết kiệm <strong>{fmt(fullDiscount)}</strong>
                </div>
              )}
            </div>
          )}

          {/* Tóm tắt đơn */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2 text-sm">
            <p className="font-bold text-gray-900 mb-3">Đơn hàng #{order.id}</p>
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-xs text-gray-500">
                <span className="truncate mr-2">{item.product.name} × {item.qty}</span>
                <span className="shrink-0">{fmt((item.product.price + (item.lensOption?.surcharge ?? 0)) * item.qty)}</span>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between font-bold text-sm">
              <span>Tổng đơn</span><span style={{ color: 'var(--primary)' }}>{fmt(order.total)}</span>
            </div>
          </div>

          {/* Nút xác nhận */}
          {!confirmed ? (
            <button onClick={() => setConfirmed(true)}
              className="w-full py-3.5 rounded-xl font-bold text-white transition-colors"
              style={{ backgroundColor: 'var(--primary)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--primary-dark)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--primary)')}>
              Tôi đã chuyển khoản {fmt(payAmount)} ✓
            </button>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <p className="text-sm font-medium text-gray-700 text-center">
                Xác nhận đã chuyển đúng <strong style={{ color: 'var(--primary)' }}>{fmt(payAmount)}</strong>?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmed(false)}
                  className="flex-1 py-2.5 rounded-xl font-semibold border text-sm hover:bg-gray-50 transition-colors"
                  style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                  Kiểm tra lại
                </button>
                <button onClick={handleConfirm}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm transition-colors"
                  style={{ backgroundColor: 'var(--success)' }}>
                  Xác nhận ✓
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ─── Invoice Request Modal ────────────────────────────────────────────────────

function InvoiceRequestModal({ transaction, order, onClose }: {
  transaction: Transaction
  order: PlacedOrder
  onClose: () => void
}) {
  const txnType = transaction.isDeposit ? 'Đặt cọc cắt tròng' : 'Thanh toán đầy đủ'

  // Checkbox dùng hồ sơ cá nhân
  const [useProfile, setUseProfile] = useState(true)

  // Form fields
  const [name,    setName]    = useState(MOCK_USER_PROFILE.name)
  const [taxCode, setTaxCode] = useState('')
  const [address, setAddress] = useState(MOCK_USER_PROFILE.address)
  const [email,   setEmail]   = useState(MOCK_USER_PROFILE.email)

  // Khi bỏ tick thì reset về rỗng, khi tick lại thì điền lại từ profile
  function toggleProfile(checked: boolean) {
    setUseProfile(checked)
    if (checked) {
      setName(MOCK_USER_PROFILE.name)
      setAddress(MOCK_USER_PROFILE.address)
      setEmail(MOCK_USER_PROFILE.email)
    } else {
      setName(''); setAddress(''); setEmail('')
    }
  }

  // Validation & submit state
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState<InvoiceRequest | null>(null)

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim())    e.name    = 'Vui lòng nhập họ tên / tên đơn vị.'
    if (!address.trim()) e.address = 'Vui lòng nhập địa chỉ.'
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = 'Email không hợp lệ.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    setResult({
      reqId:       'INV-REQ-' + Date.now().toString(36).toUpperCase().slice(-5),
      orderId:     order.id,
      name,
      taxCode,
      address,
      email,
      txnType,
      totalAmount: order.total,
      paidAmount:  transaction.amount,
      status:      'pending',
    })
    setLoading(false)
  }

  // ── Màn hình kết quả ─────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-y-auto max-h-[90dvh]"
          onClick={e => e.stopPropagation()}>
          <div className="p-6 text-center border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#f0fdf4' }}>
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900">Đã gửi yêu cầu</h2>
            <p className="text-sm text-gray-500 mt-1">Yêu cầu của bạn đã được ghi nhận và đang chờ xử lý.</p>
          </div>

          <div className="p-6 space-y-4">
            {/* Mã yêu cầu */}
            <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--caption)' }}>Mã yêu cầu</p>
              <p className="text-xl font-black font-mono" style={{ color: 'var(--primary)' }}>{result.reqId}</p>
            </div>

            {/* Trạng thái */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d' }}>
              <span className="text-sm font-medium text-amber-800">Trạng thái</span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-amber-700">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                Chờ xử lý
              </span>
            </div>

            {/* Chi tiết */}
            <div className="space-y-2.5 text-sm">
              {[
                ['Mã đơn hàng',           result.orderId],
                ['Người mua',              result.name],
                ['Email',                  result.email],
                ['Loại giao dịch',         result.txnType],
                ['Tổng giá trị đơn',       fmt(result.totalAmount)],
                ['Số tiền đã thanh toán',  fmt(result.paidAmount)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <span style={{ color: 'var(--caption)' }}>{k}</span>
                  <span className="font-medium text-right" style={{ color: 'var(--foreground)' }}>{v}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-center" style={{ color: 'var(--caption)' }}>
              Hóa đơn sẽ được gửi đến <strong>{result.email}</strong> sau khi xử lý (1–3 ngày làm việc).
            </p>

            <button onClick={onClose}
              className="w-full py-3 rounded-xl font-semibold text-white"
              style={{ backgroundColor: 'var(--primary)' }}>
              Đóng
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Màn hình form ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-y-auto max-h-[90dvh]"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-base font-bold text-gray-900">Yêu cầu xuất hóa đơn</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <p className="text-sm" style={{ color: 'var(--caption)' }}>
            Vui lòng cung cấp thông tin để Vin Eyewear xử lý yêu cầu xuất hóa đơn.
          </p>

          {/* Toggle hồ sơ cá nhân */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input type="checkbox" checked={useProfile} onChange={e => toggleProfile(e.target.checked)}
              className="w-4 h-4 rounded accent-[var(--primary)] cursor-pointer" />
            <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
              Sử dụng thông tin từ hồ sơ cá nhân
            </span>
          </label>

          {/* ── Thông tin khách hàng ── */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--caption)' }}>Thông tin khách hàng</p>

            {/* Họ tên */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>
                Họ và tên / Tên đơn vị <span style={{ color: 'var(--destructive)' }}>*</span>
              </label>
              <input value={name} onChange={e => setName(e.target.value)} readOnly={useProfile}
                placeholder="Nguyễn Văn A"
                className="w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none transition-colors"
                style={{
                  borderColor: errors.name ? 'var(--destructive)' : 'var(--border)',
                  backgroundColor: useProfile ? 'var(--muted)' : 'var(--card)',
                  color: 'var(--foreground)',
                }} />
              {errors.name && <p className="text-xs mt-1" style={{ color: 'var(--destructive)' }}>{errors.name}</p>}
            </div>

            {/* Mã số thuế */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Mã số thuế</label>
              <input value={taxCode} onChange={e => setTaxCode(e.target.value)}
                placeholder="Nhập mã số thuế nếu có"
                className="w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }} />
            </div>

            {/* Địa chỉ */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>
                Địa chỉ <span style={{ color: 'var(--destructive)' }}>*</span>
              </label>
              <input value={address} onChange={e => setAddress(e.target.value)} readOnly={useProfile}
                placeholder="Hà Nội"
                className="w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none transition-colors"
                style={{
                  borderColor: errors.address ? 'var(--destructive)' : 'var(--border)',
                  backgroundColor: useProfile ? 'var(--muted)' : 'var(--card)',
                  color: 'var(--foreground)',
                }} />
              {errors.address && <p className="text-xs mt-1" style={{ color: 'var(--destructive)' }}>{errors.address}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>
                Email nhận hóa đơn <span style={{ color: 'var(--destructive)' }}>*</span>
              </label>
              <input value={email} onChange={e => setEmail(e.target.value)} readOnly={useProfile}
                type="email" placeholder="abc@gmail.com"
                className="w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none transition-colors"
                style={{
                  borderColor: errors.email ? 'var(--destructive)' : 'var(--border)',
                  backgroundColor: useProfile ? 'var(--muted)' : 'var(--card)',
                  color: 'var(--foreground)',
                }} />
              {errors.email && <p className="text-xs mt-1" style={{ color: 'var(--destructive)' }}>{errors.email}</p>}
            </div>
          </div>

          {/* ── Thông tin đơn hàng ── */}
          <div className="space-y-2.5 rounded-xl p-4" style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--caption)' }}>Thông tin đơn hàng</p>
            {[
              ['Mã đơn hàng',           order.id],
              ['Loại giao dịch',         txnType],
              ['Tổng giá trị đơn hàng',  fmt(order.total)],
              ['Số tiền đã thanh toán',  fmt(transaction.amount)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span style={{ color: 'var(--caption)' }}>{k}</span>
                <span className="font-semibold" style={{ color: 'var(--foreground)' }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Lưu ý */}
          <p className="text-xs leading-relaxed" style={{ color: 'var(--caption)' }}>
            ℹ️ Hóa đơn sẽ được xử lý sau khi thông tin được kiểm tra (1–3 ngày làm việc).
          </p>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-3 rounded-xl font-semibold border transition-all hover:bg-gray-50"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              Hủy
            </button>
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 py-3 rounded-xl font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
              style={{ backgroundColor: 'var(--primary)' }}>
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Đang gửi yêu cầu...
                </>
              ) : 'Gửi yêu cầu'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── PaymentResultPage ────────────────────────────────────────────────────────

function PaymentResultPage({ transaction, order, onHome, onViewOrder }: {
  transaction: Transaction
  order: PlacedOrder
  onHome: () => void
  onViewOrder: () => void
}) {
  const isSuccess = transaction.status === 'success'
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      {/* Invoice modal */}
      {showInvoiceModal && (
        <InvoiceRequestModal
          transaction={transaction}
          order={order}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}

      <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isSuccess ? 'bg-green-100' : 'bg-red-100'}`}>
        {isSuccess ? (
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>

      <h1 className="text-2xl font-black mb-2 text-gray-900">
        {isSuccess ? "Thanh toán thành công!" : "Thanh toán thất bại"}
      </h1>
      <p className="text-gray-500 mb-8">
        {isSuccess
          ? transaction.isDeposit
            ? `Đã đặt cọc ${fmt(transaction.depositAmount)}. Vui lòng thanh toán phần còn lại ${fmt(transaction.remainingAmount)} khi nhận hàng.`
            : `Đã thanh toán đầy đủ ${fmt(transaction.amount)} cho đơn hàng ${order.id}.`
          : "Giao dịch không thành công. Vui lòng thử lại hoặc chọn phương thức thanh toán khác."}
      </p>

      {isSuccess && (
        <div className="bg-gray-50 rounded-2xl p-5 mb-8 text-left space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Mã giao dịch</span>
            <span className="font-mono font-bold text-gray-900">{transaction.txnId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Mã đơn hàng</span>
            <span className="font-bold text-gray-900">{transaction.orderId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Phương thức</span>
            <span className="font-medium text-gray-900">{transaction.method}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Số tiền đã thanh toán</span>
            <span className="font-bold text-green-600">{fmt(transaction.amount)}</span>
          </div>
          {transaction.isDeposit && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Còn lại khi nhận hàng</span>
              <span className="font-bold text-orange-600">{fmt(transaction.remainingAmount)}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {isSuccess && (
          <>
            {/* Yêu cầu xuất hóa đơn */}
            <button onClick={() => setShowInvoiceModal(true)}
              className="w-full py-3 rounded-xl font-semibold border-2 flex items-center justify-center gap-2 transition-all hover:bg-gray-50"
              style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Yêu cầu xuất hóa đơn
            </button>
            {/* Xem đơn hàng */}
            <button onClick={onViewOrder}
              className="w-full py-3 rounded-xl font-semibold text-white transition-colors"
              style={{ backgroundColor: 'var(--primary)' }}>
              Xem đơn hàng
            </button>
          </>
        )}
        <button onClick={onHome}
          className="w-full py-3 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
          Về trang chủ
        </button>
      </div>
    </div>
  )
}

// ─── OrderSuccessPage ─────────────────────────────────────────────────────────

function OrderSuccessPage({ order, onHome, onPayOnline }: {
  order: PlacedOrder; onHome: () => void; onPayOnline?: () => void
}) {
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-2xl font-black text-gray-900 mb-2">Đặt hàng thành công!</h1>
      <p className="text-gray-500 mb-2">Cảm ơn bạn đã mua sắm tại Vin Eyewear.</p>
      <p className="text-sm text-[var(--primary)] font-medium mb-8">Mã đơn hàng: <span className="font-mono font-bold">{order.id}</span></p>

      {/* Order details */}
      <div className="bg-gray-50 rounded-2xl p-5 mb-6 text-left space-y-3">
        <h3 className="font-bold text-gray-900 mb-3">Chi tiết đơn hàng</h3>
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
            <img src={item.product.image} alt={item.product.name} className="w-12 h-12 object-cover rounded-lg" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">{item.product.name}</div>
              <div className="text-xs text-gray-400">x{item.qty}</div>
            </div>
            <div className="text-sm font-bold text-gray-900">{fmt((item.product.price + (item.lensOption?.surcharge ?? 0)) * item.qty)}</div>
          </div>
        ))}

        <div className="space-y-1.5 pt-2 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Tạm tính</span>
            <span>{fmt(order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Giảm giá</span>
              <span>-{fmt(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-500">
            <span>Phí vận chuyển</span>
            <span>{order.shippingFee === 0 ? "Miễn phí" : fmt(order.shippingFee)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t border-gray-100 pt-2">
            <span>Tổng cộng</span>
            <span className="text-[var(--primary)]">{fmt(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Shipping info */}
      <div className="bg-gray-50 rounded-2xl p-5 mb-6 text-left">
        <h3 className="font-bold text-gray-900 mb-3">Thông tin giao hàng</h3>
        <div className="space-y-1.5 text-sm">
          <div className="flex gap-2">
            <span className="text-gray-500 w-28 flex-shrink-0">Người nhận:</span>
            <span className="font-medium text-gray-900">{order.info.name}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 w-28 flex-shrink-0">Điện thoại:</span>
            <span className="font-medium text-gray-900">{order.info.phone}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 w-28 flex-shrink-0">Địa chỉ:</span>
            <span className="font-medium text-gray-900">{[order.info.streetAddress, order.info.ward, order.info.district, order.info.province].filter(Boolean).join(', ')}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 w-28 flex-shrink-0">Vận chuyển:</span>
            <span className="font-medium text-gray-900">{order.shipping.name} ({order.shipping.eta})</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 w-28 flex-shrink-0">Thanh toán:</span>
            <span className="font-medium text-gray-900">
              {order.payment === 'cod' ? "COD - Thanh toán khi nhận hàng" : "Thanh toán online"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {order.payment === 'online' && onPayOnline && (
          <button
            onClick={onPayOnline}
            className="w-full py-3.5 bg-[var(--primary)] text-white rounded-xl font-bold hover:bg-[var(--primary-dark)] transition-colors"
          >
            Thanh toán online ngay
          </button>
        )}
        <button
          onClick={onHome}
          className="w-full py-3 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Tiếp tục mua sắm
        </button>
      </div>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<AppView>('list')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [modalProduct, setModalProduct] = useState<Product | null>(null)
  const [modalBuyNow, setModalBuyNow] = useState(false)
  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([])
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null)
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type })
  }

  function handleAddToCart(product: Product) {
    setModalProduct(product)
    setModalBuyNow(false)
  }

  function handleBuyNow(product: Product) {
    setModalProduct(product)
    setModalBuyNow(true)
  }

  function handleModalConfirm(item: CartItem) {
    if (modalBuyNow) {
      setModalProduct(null)
      setCheckoutItems([item])
      setView('checkout')
    } else {
      setCart(prev => {
        // Try to merge with existing identical item
        const idx = prev.findIndex(ci =>
          ci.product.id === item.product.id &&
          ci.purchaseType === item.purchaseType &&
          ci.lensOption?.id === item.lensOption?.id
        )
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = { ...next[idx], qty: next[idx].qty + item.qty }
          return next
        }
        return [...prev, item]
      })
      setModalProduct(null)
      showToast("Đã thêm vào giỏ hàng!")
    }
  }

  function handleUpdateQty(idx: number, qty: number) {
    if (qty < 1) return
    setCart(prev => prev.map((item, i) => i === idx ? { ...item, qty } : item))
  }

  function handleDeleteCartItem(idx: number) {
    setCart(prev => prev.filter((_, i) => i !== idx))
  }

  function handleCheckout(selected: CartItem[]) {
    if (selected.length === 0) {
      showToast("Vui lòng chọn ít nhất 1 sản phẩm", "error")
      return
    }
    setCheckoutItems(selected)
    setView('checkout')
  }

  function handlePlaceOrder(order: PlacedOrder) {
    setPlacedOrder(order)
    setCart(prev => prev.filter(ci => !checkoutItems.some(co => co.product.id === ci.product.id)))
    const hasLens = order.items.some(i => i.purchaseType === 'with_lens')
    // Online → thẳng QR
    // COD + có tròng → thẳng QR (chỉ cọc, không có option full)
    // COD + không tròng → trang thành công
    if (order.payment === 'online' || hasLens) {
      setView('payment')
    } else {
      setView('success')
    }
  }

  function handlePayOnline() {
    setView('payment')
  }

  function handlePaymentResult(txn: Transaction) {
    setTransaction(txn)
    setView('payment_result')
  }

  function handleHome() {
    setView('list')
    setSelectedProduct(null)
  }

  const cartCount = cart.reduce((s, i) => s + i.qty, 0)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopBar />
      <Navbar onHome={handleHome} cartCount={cartCount} onCartClick={() => setView('cart')} />

      <main className="flex-1">
        {view === 'list' && (
          <ProductListPage
            onSelect={p => { setSelectedProduct(p); setView('detail') }}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
          />
        )}

        {view === 'detail' && selectedProduct && (
          <ProductDetailPage
            product={selectedProduct}
            onBack={() => setView('list')}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
          />
        )}

        {view === 'cart' && (
          <CartPage
            items={cart}
            onUpdateQty={handleUpdateQty}
            onDelete={handleDeleteCartItem}
            onCheckout={handleCheckout}
            onHome={handleHome}
          />
        )}

        {view === 'checkout' && (
          <CheckoutPage
            items={checkoutItems}
            onBack={() => setView('cart')}
            onPlaceOrder={handlePlaceOrder}
          />
        )}

        {view === 'success' && placedOrder && (
          <OrderSuccessPage
            order={placedOrder}
            onHome={handleHome}
            onPayOnline={placedOrder.payment === 'online' ? handlePayOnline : undefined}
          />
        )}

        {view === 'payment' && placedOrder && (
          <PaymentPage
            order={placedOrder}
            onResult={handlePaymentResult}
            onBack={() => setView('success')}
          />
        )}

        {view === 'payment_result' && transaction && placedOrder && (
          <PaymentResultPage
            transaction={transaction}
            order={placedOrder}
            onHome={handleHome}
            onViewOrder={() => setView('success')}
          />
        )}
      </main>

      <Footer />

      {/* Cart Modal */}
      {modalProduct && (
        <CartModal
          product={modalProduct}
          onClose={() => setModalProduct(null)}
          onConfirm={handleModalConfirm}
          buyNow={modalBuyNow}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

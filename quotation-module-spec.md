# Đặc tả Kỹ thuật: Module Quản lý Báo giá (Sales Quotation)

> **Hệ thống:** Labor Manager — Kosumi Factory  
> **Version:** 1.0.0  
> **Ngày:** 29/04/2026  
> **Trạng thái:** Ready for Implementation  
> **Người soạn:** AI Technical Architect

---

## Mục lục

1. [Tổng quan Module](#1-tổng-quan-module)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Data Schema](#3-data-schema)
4. [API Endpoints](#4-api-endpoints)
5. [Business Logic & Rules](#5-business-logic--rules)
6. [Màn hình 1 — Danh sách & Tạo Báo giá](#6-màn-hình-1--danh-sách--tạo-báo-giá)
7. [Màn hình 2 — Preview & Xuất PDF](#7-màn-hình-2--preview--xuất-pdf)
8. [Luồng nghiệp vụ (Workflow)](#8-luồng-nghiệp-vụ-workflow)
9. [Tích hợp với các Module hiện có](#9-tích-hợp-với-các-module-hiện-có)
10. [Cấu trúc File / Thư mục](#10-cấu-trúc-file--thư-mục)
11. [Edge Cases & Validation](#11-edge-cases--validation)
12. [PDF Generation Spec](#12-pdf-generation-spec)

---

## 1. Tổng quan Module

### 1.1 Mục đích

Module Báo giá cho phép đội Sales (2–3 người) tạo, quản lý và gửi báo giá chuyên nghiệp cho khách hàng dưới dạng PDF qua email/Zalo. Báo giá bao gồm 4 loại hạng mục: **Nhân công**, **Vật tư**, **Thuê ngoài**, và **Dịch vụ & Vận chuyển**.

### 1.2 Kết quả kỳ vọng

- Sales tạo được báo giá đầy đủ trong vòng **< 5 phút**
- Tổng tiền, chiết khấu, VAT tính **tự động real-time**
- Xuất PDF chuẩn doanh nghiệp, sẵn sàng gửi khách ngay
- Khi khách duyệt → **tự động tạo Dự án** trong hệ thống
- Lưu lịch sử toàn bộ trạng thái báo giá

### 1.3 Platform

| Layer | Technology |
|---|---|
| Frontend | ReactJS (Web) |
| Backend | Node.js / NestJS hoặc tương đương |
| Database | PostgreSQL (hoặc Firebase Firestore) |
| PDF Engine | `@react-pdf/renderer` hoặc `puppeteer` |
| State Management | Zustand hoặc Redux Toolkit |
| Styling | Tailwind CSS + CSS Variables (dark theme) |

---

## 2. User Roles & Permissions

### 2.1 Role mới: `SALES`

Bổ sung vào bảng RBAC hiện có:

| Role | Quyền trên Module Báo giá |
|---|---|
| **ADMIN** | Full CRUD, duyệt nội bộ, xem tất cả báo giá, chỉnh sửa sau khi gửi |
| **SALES** | Tạo/sửa báo giá của mình, xem báo giá team, gửi cho khách, KHÔNG xóa sau khi gửi |
| **ACCOUNTANT** | Chỉ đọc (xem báo giá đã duyệt để đối chiếu doanh thu) |
| **STAFF** | Không có quyền truy cập module này |

### 2.2 Quy tắc phân quyền chi tiết

```
- SALES chỉ thấy báo giá do mình tạo + báo giá đã "public" trong team
- ADMIN thấy toàn bộ
- Báo giá ở trạng thái SENT trở lên: chỉ ADMIN mới được sửa
- Xóa báo giá: chỉ ADMIN, và chỉ khi status = DRAFT
- Trường margin_percent: SALES không được xem, chỉ ADMIN thấy
```

---

## 3. Data Schema

### 3.1 Bảng `customers` (Khách hàng — CRM nhẹ)

```sql
CREATE TABLE customers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name  VARCHAR(255) NOT NULL,
  contact_name  VARCHAR(255),
  phone         VARCHAR(20),
  email         VARCHAR(255),
  address       TEXT,
  tax_code      VARCHAR(20),            -- Mã số thuế
  source        ENUM('zalo','email','referral','facebook','other') DEFAULT 'other',
  note          TEXT,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);
```

### 3.2 Bảng `quotations` (Đầu báo giá)

```sql
CREATE TABLE quotations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number      VARCHAR(20) UNIQUE NOT NULL,  -- VD: BG-2604-013
  customer_id       UUID REFERENCES customers(id) NOT NULL,
  project_name      VARCHAR(500) NOT NULL,         -- Tên dự án / hạng mục
  quantity_desc     VARCHAR(255),                  -- VD: "3 bộ khuôn"
  
  -- Tài chính
  subtotal          DECIMAL(18,2) DEFAULT 0,       -- Tổng trước chiết khấu
  discount_percent  DECIMAL(5,2) DEFAULT 0,        -- % chiết khấu (0-100)
  discount_amount   DECIMAL(18,2) DEFAULT 0,       -- Số tiền chiết khấu (computed)
  vat_percent       DECIMAL(5,2) DEFAULT 10,       -- VAT mặc định 10%
  vat_amount        DECIMAL(18,2) DEFAULT 0,       -- Số tiền VAT (computed)
  total_amount      DECIMAL(18,2) DEFAULT 0,       -- Tổng sau CK + VAT
  
  -- Chi phí nội bộ (ẩn với SALES)
  internal_cost     DECIMAL(18,2),                 -- Chi phí ước tính nội bộ
  margin_percent    DECIMAL(5,2),                  -- (total - cost) / total * 100
  
  -- Điều khoản
  payment_terms     ENUM('50_50','30_70','100_advance','cod') DEFAULT '50_50',
  delivery_days     INT,                           -- Số ngày làm việc giao hàng
  valid_until       DATE,                          -- Ngày hết hiệu lực báo giá
  note              TEXT,                          -- Điều khoản đặc biệt
  
  -- Trạng thái
  status            ENUM('DRAFT','PENDING_APPROVAL','SENT','APPROVED','REJECTED','EXPIRED','CONVERTED') DEFAULT 'DRAFT',
  
  -- Metadata
  created_by        UUID REFERENCES users(id),
  approved_by       UUID REFERENCES users(id),     -- Admin duyệt nội bộ
  approved_at       TIMESTAMP,
  sent_at           TIMESTAMP,
  converted_at      TIMESTAMP,
  project_id        UUID REFERENCES projects(id),  -- Sau khi convert thành dự án
  
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);
```

### 3.3 Bảng `quotation_items` (Dòng hạng mục)

```sql
CREATE TABLE quotation_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id    UUID REFERENCES quotations(id) ON DELETE CASCADE,
  
  -- Nhóm (group header)
  group_name      VARCHAR(100),   -- VD: "I. Nhân công", "II. Vật tư"
  group_order     INT DEFAULT 0,  -- Thứ tự nhóm
  
  -- Dòng item
  item_order      INT DEFAULT 0,  -- Thứ tự trong nhóm
  description     TEXT NOT NULL,  -- Mô tả hạng mục
  item_type       ENUM('labor','material','outsource','service','delivery') NOT NULL,
  
  quantity        DECIMAL(10,2) DEFAULT 1,
  unit            VARCHAR(50),                -- giờ, kg, bộ, lần, m2...
  unit_price      DECIMAL(18,2) DEFAULT 0,
  total_price     DECIMAL(18,2) DEFAULT 0,   -- quantity * unit_price (computed)
  
  -- Liên kết tùy chọn
  category_id     UUID REFERENCES categories(id),  -- Hạng mục từ bảng hiện có
  
  note            TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### 3.4 Bảng `quotation_activities` (Lịch sử hoạt động)

```sql
CREATE TABLE quotation_activities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id    UUID REFERENCES quotations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id),
  action          ENUM('created','updated','submitted','sent','approved','rejected','converted','viewed'),
  description     TEXT,          -- VD: "Gửi qua Zalo cho Ông Hùng"
  metadata        JSONB,         -- Thông tin bổ sung
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### 3.5 Bảng `quotation_templates` (Template mẫu — Phase 2)

```sql
CREATE TABLE quotation_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,  -- VD: "Khuôn đúc tiêu chuẩn"
  description   TEXT,
  items         JSONB,                  -- Mảng items mẫu với đơn giá gợi ý
  is_active     BOOLEAN DEFAULT true,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMP DEFAULT NOW()
);
```

### 3.6 Enums & Constants

```typescript
// quotation.types.ts

export enum QuotationStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',  // Chờ Admin duyệt nội bộ
  SENT = 'SENT',                          // Đã gửi khách
  APPROVED = 'APPROVED',                  // Khách đồng ý
  REJECTED = 'REJECTED',                  // Khách từ chối
  EXPIRED = 'EXPIRED',                    // Hết hiệu lực
  CONVERTED = 'CONVERTED',               // Đã chuyển thành Project
}

export enum ItemType {
  LABOR = 'labor',          // Nhân công
  MATERIAL = 'material',    // Vật tư
  OUTSOURCE = 'outsource',  // Thuê ngoài
  SERVICE = 'service',      // Dịch vụ
  DELIVERY = 'delivery',    // Vận chuyển
}

export enum PaymentTerms {
  FIFTY_FIFTY = '50_50',    // 50% trước — 50% sau
  THIRTY_SEVENTY = '30_70', // 30% trước — 70% sau
  FULL_ADVANCE = '100_advance',
  COD = 'cod',
}

export const VAT_DEFAULT = 10; // %
export const QUOTE_VALID_DAYS = 30; // Ngày hiệu lực mặc định

// Tự động sinh mã báo giá: BG-{YYMM}-{SEQ 3 chữ số}
// VD: BG-2604-013
export function generateQuoteNumber(seq: number): string {
  const now = new Date();
  const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth()+1).padStart(2,'0')}`;
  return `BG-${yymm}-${String(seq).padStart(3,'0')}`;
}
```

---

## 4. API Endpoints

### 4.1 Customers

```
GET    /api/customers                  → Danh sách khách hàng (search, pagination)
POST   /api/customers                  → Tạo khách hàng mới
GET    /api/customers/:id              → Chi tiết khách hàng
PUT    /api/customers/:id              → Cập nhật
GET    /api/customers/:id/quotations   → Lịch sử báo giá của khách
```

### 4.2 Quotations — CRUD

```
GET    /api/quotations                 → Danh sách báo giá
       Query params:
         ?status=DRAFT|SENT|APPROVED...
         ?created_by=userId
         ?customer_id=uuid
         ?month=2026-04
         ?search=keyword
         ?page=1&limit=20

POST   /api/quotations                 → Tạo báo giá mới
       Body: CreateQuotationDto

GET    /api/quotations/:id             → Chi tiết báo giá (kèm items)
PUT    /api/quotations/:id             → Cập nhật (chỉ DRAFT)
DELETE /api/quotations/:id             → Xóa (chỉ DRAFT, chỉ ADMIN)

GET    /api/quotations/:id/activities  → Lịch sử hoạt động
```

### 4.3 Quotation Actions

```
POST   /api/quotations/:id/submit      → Gửi duyệt nội bộ (DRAFT → PENDING_APPROVAL)
POST   /api/quotations/:id/approve     → Admin duyệt nội bộ (→ APPROVED nội bộ, sẵn gửi KH)
POST   /api/quotations/:id/send        → Đánh dấu đã gửi khách (→ SENT)
       Body: { channel: 'zalo'|'email', note: string }

POST   /api/quotations/:id/customer-approve  → Khách đồng ý (→ APPROVED)
POST   /api/quotations/:id/customer-reject   → Khách từ chối (→ REJECTED)
       Body: { reason: string }

POST   /api/quotations/:id/convert     → Chuyển thành Project (→ CONVERTED)
       Response: { project_id: uuid }

POST   /api/quotations/:id/duplicate   → Nhân bản báo giá
GET    /api/quotations/:id/pdf         → Tải file PDF (stream)
```

### 4.4 Items

```
POST   /api/quotations/:id/items       → Thêm item
PUT    /api/quotations/:id/items/:itemId   → Sửa item
DELETE /api/quotations/:id/items/:itemId  → Xóa item
POST   /api/quotations/:id/items/reorder  → Sắp xếp lại thứ tự
       Body: [{ id, item_order }]
```

### 4.5 Templates

```
GET    /api/quotation-templates        → Danh sách template
POST   /api/quotation-templates        → Tạo template từ báo giá hiện tại
POST   /api/quotation-templates/:id/apply/:quoteId  → Áp template vào báo giá
```

### 4.6 Response DTO mẫu

```typescript
// GET /api/quotations/:id
interface QuotationDetailResponse {
  id: string;
  quote_number: string;
  status: QuotationStatus;
  customer: {
    id: string;
    company_name: string;
    contact_name: string;
    phone: string;
    email: string;
  };
  project_name: string;
  quantity_desc: string;
  items: QuotationItemGroup[];   // Đã group theo group_name
  
  // Tài chính
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  vat_percent: number;
  vat_amount: number;
  total_amount: number;
  total_in_words: string;        // "Một trăm bốn mươi bảy triệu..."
  
  // margin_percent: chỉ trả về nếu role = ADMIN
  
  payment_terms: PaymentTerms;
  delivery_days: number;
  valid_until: string;           // ISO date
  note: string;
  
  created_by: UserBasic;
  created_at: string;
  sent_at: string | null;
  activities: QuotationActivity[];
}

interface QuotationItemGroup {
  group_name: string;
  group_order: number;
  items: QuotationItem[];
  group_subtotal: number;        // Tổng tiền của nhóm
}

interface QuotationItem {
  id: string;
  item_order: number;
  description: string;
  item_type: ItemType;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  note?: string;
}
```

---

## 5. Business Logic & Rules

### 5.1 Tính toán tài chính (Computed Fields)

```typescript
// quotation.calculator.ts

export function calculateQuotation(items: QuotationItem[], discountPercent: number, vatPercent: number) {
  // 1. Tính từng dòng
  const itemsWithTotal = items.map(item => ({
    ...item,
    total_price: round2(item.quantity * item.unit_price),
  }));

  // 2. Tổng tạm tính
  const subtotal = round2(itemsWithTotal.reduce((sum, i) => sum + i.total_price, 0));

  // 3. Chiết khấu
  const discountAmount = round2(subtotal * discountPercent / 100);
  const afterDiscount = round2(subtotal - discountAmount);

  // 4. VAT
  const vatAmount = round2(afterDiscount * vatPercent / 100);

  // 5. Tổng cộng
  const totalAmount = round2(afterDiscount + vatAmount);

  return { subtotal, discountAmount, afterDiscount, vatAmount, totalAmount, itemsWithTotal };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
```

### 5.2 Business Rules

```
BR-01: Mã báo giá (quote_number) phải unique, tự động sinh, không được sửa thủ công.

BR-02: Mỗi báo giá phải có ít nhất 1 item trước khi Submit/Send.

BR-03: Khi status = SENT, APPROVED, REJECTED, CONVERTED:
        - SALES không được sửa bất kỳ trường nào
        - Chỉ ADMIN được sửa, và mỗi lần sửa phải log vào quotation_activities

BR-04: valid_until mặc định = created_at + 30 ngày.
        Cron job chạy hàng ngày lúc 00:00: nếu valid_until < today AND status = SENT → tự động EXPIRED.

BR-05: Khi CONVERT → Project:
        - Tự động tạo record trong bảng projects với:
            project_name = quotation.project_name
            status = ACTIVE
            customer_ref = quotation.customer_id
        - Tự động tạo các task categories từ quotation_items.group_name
        - Gắn quotation.project_id = project mới tạo
        - Status báo giá → CONVERTED

BR-06: discount_percent phải trong khoảng [0, 100].
        vat_percent phải trong khoảng [0, 100], mặc định 10.

BR-07: Một khách hàng có thể có nhiều báo giá. Không giới hạn.

BR-08: Nếu SALES không chọn khách hàng có sẵn, cho phép tạo khách hàng mới inline
        (quick create) ngay trên form báo giá.

BR-09: Margin (ẩn với SALES):
        margin_percent = ((total_amount - internal_cost) / total_amount) * 100
        Chỉ hiện với ADMIN trên dashboard tổng hợp.

BR-10: item_type = 'labor' → unit gợi ý: giờ, ngày, ca
        item_type = 'material' → unit gợi ý: kg, m, m2, bộ, cái
        item_type = 'service' | 'delivery' → unit gợi ý: lần, chuyến, tháng
```

### 5.3 Số tiền bằng chữ (Tiếng Việt)

```typescript
// Implement hàm chuyển số → chữ tiếng Việt
// Ví dụ: 147867500 → "Một trăm bốn mươi bảy triệu, tám trăm sáu mươi bảy nghìn, năm trăm đồng chẵn"

// Có thể dùng thư viện: `number-to-vietnamese-words`
// hoặc tự implement theo chuẩn:

import { numberToVietnamese } from 'number-to-vietnamese-words';

export function formatAmountInWords(amount: number): string {
  return numberToVietnamese(Math.round(amount)) + ' đồng chẵn';
}
```

---

## 6. Màn hình 1 — Danh sách & Tạo Báo giá

### 6.1 Route

```
/sales/quotations             → Danh sách
/sales/quotations/new         → Tạo mới
/sales/quotations/:id/edit    → Chỉnh sửa
/sales/quotations/:id         → Xem chi tiết (chuyển sang preview)
```

### 6.2 Layout

```
┌──────────────────────────────────────────────────────────┐
│  Sidebar (220px)  │  Main Content Area                   │
│                   │  ┌─────────────────────────────────┐ │
│  [Logo]           │  │  Topbar: Title + Actions        │ │
│  — Dashboard      │  ├─────────────────────────────────┤ │
│  — Theo dõi Live  │  │  Tabs: Tất cả | Nháp | Đã gửi  │ │
│  ── BÁN HÀNG ──   │  ├──────────────────┬──────────────┤ │
│  ▶ Báo giá        │  │  Filter bar      │              │ │
│  — Khách hàng     │  ├──────────────────┤              │ │
│  — Đơn hàng       │  │  Quote List      │   (khi tạo   │ │
│  ── QUẢN LÝ ──    │  │  Card rows       │   mới thì    │ │
│  — Task           │  │                  │   hiện form)  │ │
│  — Nhân viên      │  └──────────────────┴──────────────┘ │
│  — Dự án          │                                      │
└──────────────────────────────────────────────────────────┘
```

### 6.3 Tab Filter

| Tab | Filter |
|---|---|
| Tất cả | Không filter |
| Bản nháp | status = DRAFT |
| Đã gửi | status = SENT |
| Chờ duyệt | status = PENDING_APPROVAL |
| Đã duyệt | status = APPROVED |

Mỗi tab có badge count (số lượng real-time).

### 6.4 Quote Card (mỗi dòng trong list)

```
┌────────────────────────────────────────────────────────┐
│ [BG-2604-013]  Công ty TNHH Cơ khí Thái Bình          │
│                Khuôn đúc vỏ động cơ SKD61 — 3 bộ      │
│                                    147,867,500đ        │
│                                    29/04/2026          │
│                                    [Đã gửi]           │
└────────────────────────────────────────────────────────┘
```

Trạng thái pill colors:
- `DRAFT` → gray background
- `PENDING_APPROVAL` → amber background  
- `SENT` → blue background
- `APPROVED` → green background
- `REJECTED` → red background
- `EXPIRED` → dark gray, strikethrough
- `CONVERTED` → teal background + icon dự án

### 6.5 Form Tạo/Sửa Báo giá

**Layout form (2 cột: form chính + sidebar tổng tiền):**

```
┌──────────────────────────────────┬─────────────────────┐
│  Panel 1: Thông tin Khách hàng   │  Tổng tiền (sticky) │
│  Panel 2: Thông tin Báo giá      │  — Nhân công        │
│  Panel 3: Chi tiết Hạng mục      │  — Vật tư           │
│    [Bảng items có thể edit]      │  — Dịch vụ & VC     │
│    [+ Thêm hạng mục]             │  — Chiết khấu       │
│                                  │  — Tạm tính         │
│                                  │  — VAT              │
│                                  │  ─────────          │
│                                  │  TỔNG CỘNG          │
│                                  │  Margin bar         │
│                                  │  ─────────          │
│                                  │  Timeline trạng thái│
│                                  │  ─────────          │
│                                  │  Action buttons     │
└──────────────────────────────────┴─────────────────────┘
```

#### Panel 1: Thông tin Khách hàng

| Field | Type | Validation |
|---|---|---|
| Tên KH/Công ty | Autocomplete (search customers) | Required |
| Người liên hệ | Text | Optional |
| Điện thoại | Text (phone format) | Optional |
| Email | Email | Optional |
| Nguồn | Select: Zalo, Email, Giới thiệu, Facebook, Khác | Optional |

- Khi type vào "Tên KH", gọi `GET /api/customers?search=keyword` để autocomplete
- Nếu không có → nút **"+ Khách hàng mới"** mở modal inline quick-create

#### Panel 2: Thông tin Báo giá

| Field | Type | Default | Validation |
|---|---|---|---|
| Tên dự án / Hạng mục | Text | — | Required, max 500 chars |
| Số lượng đặt | Text | — | Optional (mô tả: "3 bộ khuôn") |
| Hiệu lực báo giá đến | Date picker | today + 30 ngày | Required |
| Điều khoản TT | Select | 50_50 | Required |
| Thời gian giao hàng | Text | — | Optional (VD: "45 ngày làm việc") |
| Ghi chú / Điều khoản | Textarea | — | Optional, max 2000 chars |

#### Panel 3: Bảng Items

Cấu trúc bảng:

| Cột | Width | Editable | Notes |
|---|---|---|---|
| # (STT) | 36px | Không | Tự tăng trong nhóm |
| Mô tả hạng mục | flexible | Có (inline input) | Required |
| Loại | 80px | Có (select pill) | Dropdown: labor/material/outsource/service/delivery |
| Số lượng | 70px | Có (number input) | > 0 |
| ĐVT | 60px | Có (text input) | VD: giờ, kg, bộ |
| Đơn giá | 110px | Có (number input) | >= 0, format VND |
| Thành tiền | 120px | Không (computed) | qty × unit_price |
| [Del] | 32px | — | Xóa dòng |

**Group header rows:**
- Background darker, font smaller uppercase
- Click vào group header để đổi tên nhóm
- Kéo để sắp xếp thứ tự nhóm (drag & drop)

**Tính năng thêm dòng:**

```
[+ Thêm hạng mục]   → Thêm dòng item vào nhóm hiện tại
[+ Thêm nhóm]       → Thêm group header mới (VD: "IV. Chi phí khác")
[Nhập từ template]  → Chọn template và populate items
```

#### Sidebar: Tổng tiền (sticky, cập nhật real-time)

```typescript
// Tính toán real-time khi user thay đổi bất kỳ field nào
// Debounce 300ms để tránh tính quá nhiều lần

const summary = useMemo(() => {
  const byType = groupBy(items, 'item_type');
  const laborTotal = sumBy(byType.labor, 'total_price');
  const materialTotal = sumBy(byType.material, 'total_price');
  const outsourceTotal = sumBy(byType.outsource, 'total_price');
  const serviceTotal = sumBy([...(byType.service || []), ...(byType.delivery || [])], 'total_price');
  const subtotal = laborTotal + materialTotal + outsourceTotal + serviceTotal;
  const discountAmount = subtotal * discountPercent / 100;
  const afterDiscount = subtotal - discountAmount;
  const vatAmount = afterDiscount * vatPercent / 100;
  const total = afterDiscount + vatAmount;
  return { laborTotal, materialTotal, outsourceTotal, serviceTotal, subtotal, discountAmount, vatAmount, total };
}, [items, discountPercent, vatPercent]);
```

**Margin bar (chỉ ADMIN thấy):**
- Bar gradient từ amber (thấp) → green (cao)
- Ngưỡng: < 20% → red, 20–35% → amber, > 35% → green

#### Sidebar: Action Buttons

```
[💾 Lưu nháp]              → POST/PUT quotation, status = DRAFT
[👁 Xem trước PDF]         → Mở tab /sales/quotations/:id/preview
[📤 Gửi Zalo / Email]      → Modal chọn kênh + note → POST /send
[✅ Khách đã duyệt → Tạo Dự án]  → POST /customer-approve → POST /convert
```

**Trạng thái buttons theo status:**

| Status | Lưu nháp | Preview | Gửi | Convert |
|---|---|---|---|---|
| DRAFT | ✅ | ✅ | ✅ | ❌ |
| SENT | ❌ | ✅ | ❌ (đã gửi) | ✅ |
| APPROVED | ❌ | ✅ | ❌ | ✅ |
| CONVERTED | ❌ | ✅ | ❌ | ❌ (đã convert) |

### 6.6 Modal "Gửi Báo giá"

```
┌──────────────────────────────────────┐
│  Gửi báo giá BG-2604-013            │
│                                      │
│  Kênh gửi:  ○ Zalo  ○ Email  ○ Khác │
│                                      │
│  Ghi chú gửi:                        │
│  [Đã gửi Zalo cho anh Hùng 10:30]   │
│                                      │
│  [Hủy]          [Xác nhận Đã gửi]   │
└──────────────────────────────────────┘
```

Action: POST /api/quotations/:id/send → status DRAFT → SENT, log activity.

---

## 7. Màn hình 2 — Preview & Xuất PDF

### 7.1 Route

```
/sales/quotations/:id/preview
```

### 7.2 Layout tổng thể

```
┌─────────────────────────────────────────────────────┐
│  Action Bar (sticky top)                            │
│  [← Quay lại] [BG-2604-013 — Cty Thái Bình]       │
│  [Chỉnh sửa] [In] [Gửi Zalo] [⬇ Tải PDF]          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Paper — 780px wide, white background]             │
│   → Header band (dark navy)                         │
│   → Status strip                                    │
│   → Body: Parties, Items table, Totals, Footer     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 7.3 Cấu trúc tờ báo giá PDF

#### Header Band (dark navy #0f1c3a)
- Logo công ty (tên + icon)
- Địa chỉ, điện thoại, website
- Mã báo giá (font mono, lớn)
- Ngày lập + ngày hết hiệu lực (highlight amber)

#### Status Strip (light blue #f0f4ff)
5 thông tin ngang: Trạng thái pill | Người lập | Thời gian giao | Điều khoản TT | Loại tiền

#### Thông tin 2 bên (grid 2 cột)
- **Bên A (Bán):** Tên công ty, MST, địa chỉ, email, SĐT
- **Bên B (Mua):** Tên công ty, người liên hệ, SĐT, email, tên dự án

#### Bảng chi tiết hạng mục
- Header row: dark navy, text light
- Group header rows: light blue, uppercase, bold
- Item rows: border bottom, hover highlight
- Columns: # | Mô tả | Loại (pill) | SL | ĐVT | Đơn giá | Thành tiền

**Item type pill colors (light theme):**
- labor → blue pill (#e8f0ff / #2a5ccc)
- material → green pill (#e8fff5 / #1a7a4a)
- outsource → orange pill (#fff0e8 / #8a3a00)
- service → yellow pill (#fff8e8 / #8a5a00)

#### Tổng tiền + Ghi chú (grid 2 cột)
- **Trái:** Notes box (vàng nhạt) + Điều khoản thanh toán + Thông tin giao hàng
- **Phải:** Bảng totals (từng dòng → tổng cuối dark navy)
- **Số tiền bằng chữ** bên dưới bảng tổng

#### Footer: Chữ ký 2 bên
- Ô chữ ký Bên A (sales rep)
- Ô chữ ký Bên B (khách hàng)
- Dấu tròn placeholder

### 7.4 PDF Generation Implementation

**Option A: `@react-pdf/renderer` (Recommended)**

```typescript
// quotation-pdf.tsx
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

const QuotationPDF = ({ quotation }: { quotation: QuotationDetailResponse }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <QuotationHeader company={COMPANY_INFO} quotation={quotation} />
      <StatusStrip quotation={quotation} />
      <PartiesSection quotation={quotation} />
      <ItemsTable items={quotation.items} />
      <TotalsSection quotation={quotation} />
      <PaymentSection quotation={quotation} />
      <SignatureSection />
    </Page>
  </Document>
);

// Render endpoint
// GET /api/quotations/:id/pdf
export async function generatePDF(quotationId: string): Promise<Buffer> {
  const quotation = await getQuotationDetail(quotationId);
  const stream = await renderToStream(<QuotationPDF quotation={quotation} />);
  return streamToBuffer(stream);
}
```

**Option B: Puppeteer (nếu cần pixel-perfect từ HTML)**

```typescript
// Render trang /preview trong browser headless → chụp PDF
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto(`${BASE_URL}/sales/quotations/${id}/preview?print=true`);
await page.emulateMediaType('print');
const pdf = await page.pdf({
  format: 'A4',
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
});
await browser.close();
return pdf;
```

**Tên file PDF xuất ra:** `BaoGia-{quote_number}-{company_name_slug}.pdf`  
Ví dụ: `BaoGia-BG-2604-013-CtyThaiB inh.pdf`

---

## 8. Luồng nghiệp vụ (Workflow)

### 8.1 Luồng tạo → gửi → convert

```
[Sales] Tạo báo giá
    │
    ▼
DRAFT ──[Lưu nháp nhiều lần]──► DRAFT
    │
    │ [Submit duyệt nội bộ — nếu có rule]
    ▼
PENDING_APPROVAL
    │
    │ [Admin duyệt]          [Admin từ chối]
    ├──────────────────────────────────────┐
    ▼                                      ▼
Sẵn gửi KH                            Trả về DRAFT
    │
    │ [Sales xác nhận đã gửi Zalo/Email]
    ▼
SENT
    │
    ├──[Khách đồng ý]──► APPROVED ──[Sales Convert]──► CONVERTED
    │                                                      │
    │                                                      ▼
    │                                            Project được tạo tự động
    │
    └──[Khách từ chối]──► REJECTED
    
    [Cron job] SENT + valid_until < today ──► EXPIRED
```

### 8.2 Convert to Project — chi tiết

```typescript
// quotation.service.ts
async convertToProject(quotationId: string, userId: string): Promise<Project> {
  const quotation = await this.findById(quotationId);
  
  // Validate
  if (quotation.status !== QuotationStatus.APPROVED) {
    throw new BadRequestException('Chỉ báo giá đã được khách duyệt mới có thể convert');
  }
  if (quotation.project_id) {
    throw new BadRequestException('Báo giá này đã được convert thành dự án');
  }
  
  // Tạo Project
  const project = await this.projectService.create({
    project_name: quotation.project_name,
    status: 'ACTIVE',
    customer_id: quotation.customer_id,
    quotation_id: quotation.id,
    billing_amount: quotation.total_amount,
    created_by: userId,
  });
  
  // Tạo Categories từ group_name của items
  const groups = [...new Set(quotation.items.map(i => i.group_name))];
  for (const groupName of groups) {
    await this.categoryService.create({
      project_id: project.id,
      name: groupName,
    });
  }
  
  // Cập nhật quotation
  await this.update(quotationId, {
    status: QuotationStatus.CONVERTED,
    project_id: project.id,
    converted_at: new Date(),
  });
  
  // Log activity
  await this.logActivity(quotationId, userId, 'converted', `Đã tạo dự án ${project.id}`);
  
  return project;
}
```

---

## 9. Tích hợp với các Module hiện có

### 9.1 Module Dự án (Projects)

- Khi Convert: tự động tạo project với `quotation_id` reference
- Trên màn hình Dự án: hiển thị badge "Từ BG-2604-013" nếu có quotation_id
- `billing_amount` trên project lấy từ `quotation.total_amount`

### 9.2 Module Hạng mục (Categories)

- Items trong báo giá có thể liên kết với `category_id` có sẵn
- Khi Convert: các `group_name` được import thành categories của project mới

### 9.3 Module Dashboard

Bổ sung vào Dashboard Admin các widget:
- **Tổng giá trị báo giá tháng này** (tất cả status trừ REJECTED)
- **Tỉ lệ chốt đơn** = APPROVED / SENT × 100%
- **Pipeline:** DRAFT → SENT → APPROVED → CONVERTED (funnel chart)
- **Top khách hàng** theo tổng giá trị báo giá

### 9.4 Module Báo cáo Tài chính (Accountant)

- Accountant xem được báo giá CONVERTED để đối chiếu với doanh thu thực tế
- So sánh: `quotation.total_amount` vs `project.actual_revenue` (từ WorkLogs)

### 9.5 Bảng User (Hiện có)

- Bổ sung role `SALES` vào ENUM role
- `billing_rate` của user (hiện có) → dùng để gợi ý đơn giá nhân công khi thêm item

---

## 10. Cấu trúc File / Thư mục

### 10.1 Frontend (ReactJS)

```
src/
├── modules/
│   └── sales/
│       ├── quotations/
│       │   ├── index.tsx                    ← Route /sales/quotations
│       │   ├── QuotationListPage.tsx        ← Màn hình danh sách
│       │   ├── QuotationFormPage.tsx        ← Màn hình tạo/sửa
│       │   ├── QuotationPreviewPage.tsx     ← Màn hình preview PDF
│       │   │
│       │   ├── components/
│       │   │   ├── QuotationCard.tsx        ← Card trong list
│       │   │   ├── QuotationFilters.tsx     ← Tab + filter bar
│       │   │   ├── CustomerSection.tsx      ← Panel 1: thông tin KH
│       │   │   ├── QuoteInfoSection.tsx     ← Panel 2: thông tin BG
│       │   │   ├── ItemsTable.tsx           ← Panel 3: bảng hạng mục
│       │   │   ├── ItemRow.tsx              ← Một dòng trong bảng
│       │   │   ├── GroupHeader.tsx          ← Dòng nhóm
│       │   │   ├── SummaryPanel.tsx         ← Sidebar tổng tiền
│       │   │   ├── StatusTimeline.tsx       ← Timeline trạng thái
│       │   │   ├── ActionPanel.tsx          ← Buttons thao tác
│       │   │   ├── SendModal.tsx            ← Modal gửi BG
│       │   │   └── ConvertModal.tsx         ← Modal xác nhận convert
│       │   │
│       │   ├── pdf/
│       │   │   ├── QuotationPDF.tsx         ← react-pdf Document
│       │   │   ├── PDFHeader.tsx
│       │   │   ├── PDFStatusStrip.tsx
│       │   │   ├── PDFParties.tsx
│       │   │   ├── PDFItemsTable.tsx
│       │   │   ├── PDFTotals.tsx
│       │   │   └── PDFSignature.tsx
│       │   │
│       │   ├── hooks/
│       │   │   ├── useQuotations.ts         ← List + filters
│       │   │   ├── useQuotationForm.ts      ← Form state + validation
│       │   │   ├── useQuotationCalc.ts      ← Tính toán real-time
│       │   │   └── useQuotationActions.ts   ← Send, approve, convert
│       │   │
│       │   ├── store/
│       │   │   └── quotationStore.ts        ← Zustand store
│       │   │
│       │   └── types/
│       │       └── quotation.types.ts
│       │
│       └── customers/
│           ├── CustomerListPage.tsx
│           ├── components/
│           │   ├── CustomerCard.tsx
│           │   └── CustomerQuickCreate.tsx  ← Inline modal
│           └── hooks/
│               └── useCustomers.ts
```

### 10.2 Backend (NestJS)

```
src/
├── modules/
│   ├── quotations/
│   │   ├── quotations.module.ts
│   │   ├── quotations.controller.ts
│   │   ├── quotations.service.ts
│   │   ├── quotations.repository.ts
│   │   ├── dto/
│   │   │   ├── create-quotation.dto.ts
│   │   │   ├── update-quotation.dto.ts
│   │   │   ├── create-item.dto.ts
│   │   │   └── send-quotation.dto.ts
│   │   ├── entities/
│   │   │   ├── quotation.entity.ts
│   │   │   ├── quotation-item.entity.ts
│   │   │   └── quotation-activity.entity.ts
│   │   ├── pdf/
│   │   │   └── quotation-pdf.service.ts
│   │   └── utils/
│   │       ├── quote-number.generator.ts
│   │       ├── amount-to-words.ts
│   │       └── quotation.calculator.ts
│   │
│   └── customers/
│       ├── customers.module.ts
│       ├── customers.controller.ts
│       ├── customers.service.ts
│       └── entities/
│           └── customer.entity.ts
│
└── jobs/
    └── quotation-expire.job.ts      ← Cron: tự động EXPIRED
```

---

## 11. Edge Cases & Validation

### 11.1 Form Validation

```typescript
// create-quotation.dto.ts
import { IsUUID, IsString, IsOptional, IsNumber, Min, Max, IsDateString, IsEnum, ValidateNested, ArrayMinSize } from 'class-validator';

export class CreateQuotationDto {
  @IsUUID()
  customer_id: string;

  @IsString()
  @MaxLength(500)
  project_name: string;

  @IsOptional()
  @IsString()
  quantity_desc?: string;

  @IsDateString()
  valid_until: string;

  @IsEnum(PaymentTerms)
  payment_terms: PaymentTerms;

  @IsOptional()
  @IsNumber()
  @Min(0)
  delivery_days?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  discount_percent: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  vat_percent: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: 'Báo giá phải có ít nhất 1 hạng mục' })
  items: CreateItemDto[];
}

export class CreateItemDto {
  @IsString()
  group_name: string;

  @IsNumber()
  @Min(0)
  group_order: number;

  @IsNumber()
  @Min(0)
  item_order: number;

  @IsString()
  @MinLength(1)
  description: string;

  @IsEnum(ItemType)
  item_type: ItemType;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsString()
  unit: string;

  @IsNumber()
  @Min(0)
  unit_price: number;
}
```

### 11.2 Edge Cases cần xử lý

| Case | Xử lý |
|---|---|
| User xóa tất cả items rồi Submit | Validation: phải có >= 1 item |
| unit_price = 0 | Cho phép (hạng mục miễn phí) nhưng hiện warning |
| quantity = 0 | Không cho phép, validate > 0 |
| discount = 100% | Cảnh báo xác nhận trước khi lưu |
| valid_until < today | Cảnh báo, vẫn cho phép lưu |
| Convert khi project đã tồn tại | Trả về link đến project cũ, không tạo lại |
| 2 sales tạo BG cùng lúc → trùng số | Dùng sequence/serial DB, lock khi generate |
| Sửa BG đã SENT (ADMIN) | Bắt buộc nhập lý do, log vào activities |
| Khách hàng không có email | Vẫn cho phép, chỉ vô hiệu hóa nút gửi Email |
| Total = 0 | Cảnh báo trước khi gửi khách |

---

## 12. PDF Generation Spec

### 12.1 Thông tin công ty (config)

```typescript
// config/company.config.ts
export const COMPANY_INFO = {
  name: 'KOSUMI FACTORY',
  full_name: 'Công ty TNHH Gia công Khuôn Đúc Kosumi',
  tax_code: '0108xxxxxxx',
  address: 'Khu CN Phú Nghĩa, Chương Mỹ, Hà Nội',
  phone: '024 3998 xxxx',
  email: 'sales@kosumi.vn',
  website: 'kosumi.vn',
  bank_name: 'Vietcombank — Chi nhánh Hà Nội',
  bank_account: '1234 5678 xxxx',
  logo_url: '/assets/logo.png',
};
```

### 12.2 Màu sắc PDF

```typescript
export const PDF_COLORS = {
  headerBg: '#0f1c3a',          // Navy đậm — header band
  headerText: '#ffffff',
  headerSubText: '#7a98c8',
  headerAccent: '#e8b458',      // Amber — ngày hết hiệu lực
  
  stripBg: '#f0f4ff',           // Light blue — status strip
  stripBorder: '#dce6ff',
  
  bodyBg: '#ffffff',
  bodyText: '#1a1a2e',
  bodyMuted: '#5a6a8a',
  bodyBorder: '#edf0fa',
  
  groupHeaderBg: '#f0f4ff',
  groupHeaderText: '#4a6098',
  
  totalsBg: '#0f1c3a',
  totalsText: '#ffffff',
  totalsAmount: '#5affa0',      // Green sáng — số tổng
  
  discountText: '#d05030',      // Đỏ — số tiền chiết khấu
  vatText: '#2a5ccc',           // Blue — VAT
  
  notesBg: '#fffbf0',
  notesBorder: '#f0d88a',
  notesText: '#5a4a10',
  
  paymentBg: '#f0f4ff',
  paymentBorder: '#dce6ff',
  
  signatureLine: '#c0cce8',
  
  // Item type pills
  pillLaborBg: '#e8f0ff',
  pillLaborText: '#2a5ccc',
  pillMaterialBg: '#e8fff5',
  pillMaterialText: '#1a7a4a',
  pillOutsourceBg: '#fff0e8',
  pillOutsourceText: '#8a3a00',
  pillServiceBg: '#fff8e8',
  pillServiceText: '#8a5a00',
};
```

### 12.3 Kích thước & Typography PDF

```typescript
export const PDF_STYLES = {
  page: { size: 'A4', margin: 0 },
  
  // Header
  headerPadding: { horizontal: 36, vertical: 28 },
  companyNameSize: 18,
  companySubSize: 9,
  quoteNumberSize: 20,
  
  // Body
  bodyPadding: { horizontal: 36, vertical: 28 },
  bodyFontSize: 11,
  bodyLineHeight: 1.5,
  
  // Table
  tableHeaderFontSize: 9,
  tableBodyFontSize: 10,
  tableCellPadding: { horizontal: 8, vertical: 7 },
  
  // Totals
  totalFontSize: 13,
  totalAmountFontSize: 14,
  
  // Footer
  signatureSpaceHeight: 60,   // px để ký tên
  signatureLineWidth: '100%',
};
```

### 12.4 Tên file và Content-Type

```typescript
// Backend response headers khi tải PDF
res.setHeader('Content-Type', 'application/pdf');
res.setHeader('Content-Disposition', 
  `attachment; filename="BaoGia-${quote.quote_number}-${slugify(quote.customer.company_name)}.pdf"`
);
```

---

## Phụ lục A — Màn hình bổ sung (Phase 2)

Những màn hình dưới đây không nằm trong scope Phase 1 nhưng nên thiết kế sẵn schema để không phải migrate sau:

1. **Khách hàng (CRM nhẹ):** `/sales/customers` — danh sách, lịch sử báo giá, tỉ lệ chốt đơn
2. **Template báo giá:** `/sales/quotation-templates` — quản lý template có thể tái sử dụng
3. **Đơn hàng (Order):** `/sales/orders` — sau khi có project, theo dõi tiến độ giao hàng
4. **Báo cáo Sales:** Dashboard riêng cho Sales Manager — funnel, tỉ lệ chốt, doanh thu pipeline

---

## Phụ lục B — Checklist Implement

### Backend
- [ ] Migrate DB: tạo bảng `customers`, `quotations`, `quotation_items`, `quotation_activities`, `quotation_templates`
- [ ] Thêm role `SALES` vào ENUM users.role
- [ ] Implement `QuotationsModule` với đầy đủ CRUD
- [ ] Implement `CustomersModule`
- [ ] Implement logic tính toán (calculator)
- [ ] Implement số tiền bằng chữ (tiếng Việt)
- [ ] Implement PDF generation (react-pdf hoặc puppeteer)
- [ ] Implement Cron job auto-EXPIRED
- [ ] Implement Convert to Project
- [ ] Viết unit tests cho calculator và business rules
- [ ] Cấu hình COMPANY_INFO từ env variables

### Frontend
- [ ] Tạo route `/sales/*` với layout mới (sidebar có section Bán hàng)
- [ ] Màn hình danh sách với tabs + filter
- [ ] Form tạo/sửa: 3 panels + sidebar sticky
- [ ] Inline autocomplete khách hàng
- [ ] Inline quick-create khách hàng (modal)
- [ ] Bảng items: editable inline, drag-drop groups
- [ ] Tính toán real-time (useMemo/useCallback)
- [ ] Màn hình Preview PDF (white paper layout)
- [ ] Nút tải PDF (call API → download blob)
- [ ] Modal Gửi Zalo/Email
- [ ] Modal Convert to Project
- [ ] Timeline trạng thái
- [ ] Kiểm tra responsive (tablet)
- [ ] Phân quyền: ẩn margin với SALES

---

*Hết đặc tả — Version 1.0.0*

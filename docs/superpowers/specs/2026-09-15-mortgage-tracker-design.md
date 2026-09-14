# Design Specification: Mortgage Tracking System (สินเชื่อบ้าน ธอส.)

- **Project:** Nubtang (ระบบจัดการการเงินส่วนบุคคล)
- **Date:** 2026-09-15
- **Status:** Approved by User

---

## 1. Overview & Background

ผู้ใช้งานมีสัญญาเงินกู้กับธนาคารอาคารสงเคราะห์ (ธอส.) เริ่มต้นเมื่อวันที่ 22 พฤษภาคม 2569 โดยแบ่งออกเป็น 2 สัญญาย่อยที่ได้รับใบเสร็จรับเงินอิเล็กทรอนิกส์แยกฉบับในแต่ละเดือน:

1. **สินเชื่อเพื่อที่อยู่อาศัย (บ้านหลัก):**
   - เลขที่บัญชี: `011690010474`
   - วงเงินกู้: 2,100,000.00 บาท
   - ระยะเวลาตามสัญญา: 480 เดือน (40 ปี)
2. **สินเชื่อเบี้ยประกันชีวิตคุ้มครองวงเงิน (MRTA):**
   - เลขที่บัญชี: `011690010482`
   - วงเงินกู้: 100,023.00 บาท
   - ระยะเวลาตามสัญญา: 204 เดือน (17 ปี)
3. **วงเงินกู้รวมทั้งหมด:** 2,200,023.00 บาท
4. **โครงสร้างอัตราดอกเบี้ยทั้งสองบัญชี:**
   - ปีที่ 1 (เดือน 1-12): 2.2000% ต่อปี (คงที่)
   - ปีที่ 2 (เดือน 13-24): 3.2500% ต่อปี (คงที่)
   - ปีที่ 3 (เดือน 25-36): MRR - 2.8950% ต่อปี
   - ปีที่ 4 เป็นต้นไป (เดือน 37+): MRR - 0.5000% ต่อปี (อ้างอิง MRR ณ วันทำสัญญา 6.1450%)

ระบบนี้ถูกออกแบบมาเพื่อติดตามการผ่อนชำระหนี้บ้านอย่างละเอียด โดยเชื่อมโยงข้อมูลจากใบเสร็จ PDF ในอีเมลเข้ามาจัดเก็บในฐานข้อมูลกลางของ Nubtang ช่วยแสดงยอดหนี้คงเหลือ ความคืบหน้า สัดส่วนเงินต้น vs ดอกเบี้ย และมีเครื่องมือจำลองการโปะบ้านเพื่อวางแผนปลดหนี้เร็วขึ้น

---

## 2. Architecture & Data Model

ใช้สถาปัตยกรรม **Hybrid Database + Email Sync** โดยเก็บข้อมูลลงฐานข้อมูล PostgreSQL ของ Nubtang เพื่อให้แสดงผลได้ทันทีและมีเสถียรภาพสูง

### 2.1 Database Tables (PostgreSQL)

#### `mortgage_accounts`
เก็บข้อมูลสัญญาเงินกู้และโครงสร้างดอกเบี้ย:
- `id` (VARCHAR(50) PRIMARY KEY): เช่น `011690010474`, `011690010482`
- `account_number` (VARCHAR(100) UNIQUE NOT NULL)
- `name` (VARCHAR(255) NOT NULL)
- `loan_amount` (NUMERIC(15, 2) NOT NULL)
- `contract_date` (DATE NOT NULL)
- `term_months` (INTEGER NOT NULL)
- `interest_config` (JSONB NOT NULL)
- `created_at` (TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)

#### `mortgage_payments`
เก็บประวัติการผ่อนชำระแต่ละงวด:
- `id` (SERIAL PRIMARY KEY)
- `account_id` (VARCHAR(50) REFERENCES mortgage_accounts(id))
- `payment_date` (DATE NOT NULL)
- `installment_no` (INTEGER)
- `total_paid` (NUMERIC(15, 2) NOT NULL)
- `principal` (NUMERIC(15, 2) NOT NULL)
- `interest` (NUMERIC(15, 2) NOT NULL)
- `fee` (NUMERIC(15, 2) DEFAULT 0)
- `remaining_balance` (NUMERIC(15, 2) NOT NULL)
- `receipt_uid` (VARCHAR(100))
- `source` (VARCHAR(50) DEFAULT 'EMAIL_SYNC')
- `created_at` (TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)
- **Constraint:** `UNIQUE (account_id, payment_date, total_paid)`

---

## 3. Data Flow & Sync Engine

1. **Auto-Seed on Startup / Schema Init:**
   - เมื่อระบบเริ่มต้น ตาราง `mortgage_accounts` จะถูกสร้างและ Seed ข้อมูล 2 สัญญา (2.1M และ 100,023 บาท) พร้อมเงื่อนไขดอกเบี้ยให้อัตโนมัติหากยังไม่มีข้อมูล
2. **Email Parsing Enhancement (`src/lib/ghb/sync.ts`):**
   - ดึง `accountNo`, `payment_date`, `total_paid`, `interest`, `principal`, `fee`
   - ค้นหา `remaining_balance` จากข้อความใน PDF (เช่น `เงินต้นคงเหลือ`, `ยอดคงเหลือ`)
   - Fallback คำนวณ: `remaining_balance = previous_balance - principal` หากไม่พบตัวเลขใน PDF
3. **API Routes:**
   - `GET /api/mortgage`: ดึงข้อมูลสรุปภาพรวม, แยกรายบัญชี, สถิติสะสม (% ผ่อนแล้ว, หนี้คงเหลือ), และประวัติการผ่อน
   - `POST /api/mortgage/sync`: เชื่อมต่อ Gmail IMAP ดึงใบเสร็จใหม่อัตโนมัติและบันทึกลงฐานข้อมูล
   - `POST /api/mortgage/payments`: เพิ่มรายการผ่อนด้วยมือ (Manual Entry)
   - `DELETE /api/mortgage/payments/[id]`: ลบรายการผ่อน

---

## 4. UI / UX Design (`/mortgage`)

1. **Header & Quick Actions:**
   - ชื่อหน้า "ติดตามการผ่อนบ้าน (Mortgage Tracker)"
   - ปุ่ม `Sync จากอีเมล ธอส.` พร้อม Loading state และ Toast แจ้งเตือน
   - ปุ่ม `+ บันทึกรายการผ่อน`
2. **Account Tabs Selector:**
   - `[ 🌟 ภาพรวมทั้งหมด (2.2M) ]`
   - `[ 🏡 สินเชื่อบ้านหลัก (2.1M) ]`
   - `[ 🛡️ สินเชื่อ MRTA (100k) ]`
3. **KPI Summary Cards:**
   - ยอดหนี้คงเหลือรวม (Current Balance)
   - ตัดเงินต้นไปแล้วสะสม (Principal Paid) + Progress Bar (%)
   - ดอกเบี้ยสะสมที่จ่ายไป (Total Interest Paid)
   - ค่าประกัน/ค่าธรรมเนียมสะสม (Total Fees)
4. **Interactive Analytics Charts (Recharts):**
   - **Monthly Payment Breakdown (Stacked Bar Chart):** แสดงการแบ่งสัดส่วน เงินต้น (เขียว) vs ดอกเบี้ย (ส้ม) vs ประกัน (ฟ้า) ในแต่ละงวด
   - **Balance Reduction Curve (Area/Line Chart):** แสดงการลดลงของเงินต้นคงเหลือเทียบกับเป้าหมาย
5. **Extra Payment Simulator (เครื่องคำนวณการโปะบ้าน):**
   - ผู้ใช้สามารถเลื่อน Slider หรือกรอกยอดเงินโปะเพิ่มต่อเดือน (เช่น +3,000 บาท)
   - คำนวณแบบ Real-time:
     - หนี้จะหมดเร็วขึ้นกี่ปี กี่เดือน
     - ประหยัดดอกเบี้ยไปได้ทั้งหมดกี่บาท
     - กราฟเปรียบเทียบการผ่อนแบบปกติ vs แบบมีเงินโปะ
6. **Payment History Table:**
   - ตารางแจกแจงงวด: วันที่, บัญชี, ยอดชำระรวม, เงินต้น, ดอกเบี้ย, ค่าประกัน, ยอดคงเหลือ, ที่มา (Auto Sync / Manual)
7. **Navbar Navigation:**
   - เพิ่มเมนู "ผ่อนบ้าน" พร้อมไอคอน `Home` ในแถบ Navbar หลักของ Nubtang

---

## 5. Verification & Testing Plan

1. **Database Schema Verification:** ทดสอบการสร้างตารางและ Seed ข้อมูลสัญญาตั้งต้น
2. **IMAP & Parser Verification:** ทดสอบการดึงใบเสร็จจริงของ ธอส. ทั้ง 2 บัญชี และตรวจสอบการลงฐานข้อมูลโดยไม่มีรายการซ้ำ
3. **Calculation Verification:** ตรวจสอบความถูกต้องของการคำนวณ Progress %, ยอดเงินต้นคงเหลือ และสูตรจำลองการโปะบ้าน (Amortization)
4. **UI Verification:** ตรวจสอบการแสดงผลบนหน้าจอทั้งโหมด Desktop/Mobile และรองรับ Dark/Light Mode

import pandas as pd
import numpy as np

# โหลดข้อมูล
df = pd.read_excel(
    r"../dataset/bakery_synthetic_dataset.csv (1).xlsx"
)

# ----------------------------------
# 1. ตรวจสอบข้อมูลเบื้องต้น
# ----------------------------------
print("Shape:", df.shape)
print(df.info())

# ----------------------------------
# 2. ตรวจสอบ Missing Values
# ----------------------------------
missing_values = df.isnull().sum()
print("\nMissing Values:")
print(missing_values)

# ลบแถวที่ข้อมูลสำคัญหายไป
df = df.dropna(subset=['Transaction_ID'])

# ----------------------------------
# 3. ตรวจสอบ Duplicate Data
# ----------------------------------
duplicate_count = df.duplicated().sum()
print("\nDuplicate Records:", duplicate_count)

# ลบข้อมูลซ้ำ
df = df.drop_duplicates()

# ----------------------------------
# 4. แปลงข้อมูลวันที่และเวลา
# ----------------------------------
df['Date'] = pd.to_datetime(df['Date'], errors='coerce')

# ----------------------------------
# 5. แก้ปัญหา Floating Point
# ----------------------------------
numeric_cols = [
    'Unit_Price',
    'Discount_Amount',
    'Selling_Price',
    'Total_Bill',
    'Profit',
    'Waste_Cost'
]

for col in numeric_cols:
    if col in df.columns:
        df[col] = df[col].round(2)

# ----------------------------------
# 6. ตรวจสอบค่าผิดปกติ (Outlier)
# ใช้วิธี IQR
# ----------------------------------
for col in ['Total_Bill', 'Profit']:
    if col in df.columns:
        Q1 = df[col].quantile(0.25)
        Q3 = df[col].quantile(0.75)
        IQR = Q3 - Q1

        lower = Q1 - 1.5 * IQR
        upper = Q3 + 1.5 * IQR

        df = df[(df[col] >= lower) & (df[col] <= upper)]

# ----------------------------------
# 7. ตรวจสอบความถูกต้องของยอดขาย
# ----------------------------------
if all(col in df.columns for col in
       ['Quantity', 'Selling_Price', 'Total_Bill']):

    expected_bill = df['Quantity'] * df['Selling_Price']

    df = df[
        abs(expected_bill - df['Total_Bill']) < 1
    ]

# ----------------------------------
# 8. สร้างคอลัมน์เพิ่มเติม
# ----------------------------------

# วันในสัปดาห์
df['Day_Name'] = df['Date'].dt.day_name()

# เดือน
df['Month'] = df['Date'].dt.month_name()

# ----------------------------------
# 9. บันทึกข้อมูลที่ทำความสะอาดแล้ว
# ----------------------------------
df.to_csv("cleaned_bakery_dataset.csv",
          index=False,
          encoding='utf-8')

print("\nData Cleaning Complete")
print("Final Shape:", df.shape)
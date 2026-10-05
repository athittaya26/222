import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# ==========================
# โหลดข้อมูล
# ==========================

df = pd.read_excel(
    r"../dataset/bakery_synthetic_dataset.csv (1).xlsx"
)

# ==========================
# Data Cleaning
# ==========================

# Missing Values
df['Festival'] = df['Festival'].fillna('No Festival')
df['Promotion_Type'] = df['Promotion_Type'].fillna('No Promotion')

# Duplicate
df = df.drop_duplicates()

# Date Format
df['Date'] = pd.to_datetime(df['Date'])

# Floating Point
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

# ==========================
# Outlier Removal (IQR)
# ==========================

for col in ['Total_Bill', 'Profit']:

    q1 = df[col].quantile(0.25)
    q3 = df[col].quantile(0.75)

    iqr = q3 - q1

    lower = q1 - (1.5 * iqr)
    upper = q3 + (1.5 * iqr)

    df = df[
        (df[col] >= lower) &
        (df[col] <= upper)
    ]

# ==========================
# Create New Columns
# ==========================

df['Day_Name'] = df['Date'].dt.day_name()
df['Month'] = df['Date'].dt.month_name()

print("\n===== Dataset Summary =====")
print(df.shape)

# ==========================
# Descriptive Statistics
# ==========================

print("\n===== Statistics =====")
print(df.describe())

# ==========================
# Sales by Category
# ==========================

sales_by_category = (
    df.groupby('Category')['Total_Bill']
    .sum()
    .sort_values(ascending=False)
)

print("\n===== Sales by Category =====")
print(sales_by_category)

plt.figure(figsize=(10, 5))
sales_by_category.plot(kind='bar')

plt.title('Total Sales by Category')
plt.xlabel('Category')
plt.ylabel('Sales')

plt.tight_layout()
plt.show()

# ==========================
# Profit by Category
# ==========================

profit_by_category = (
    df.groupby('Category')['Profit']
    .sum()
    .sort_values(ascending=False)
)

print("\n===== Profit by Category =====")
print(profit_by_category)

# ==========================
# Payment Method
# ==========================

payment_count = df['Payment_Method'].value_counts()

print("\n===== Payment Method =====")
print(payment_count)

plt.figure(figsize=(7, 7))

payment_count.plot(
    kind='pie',
    autopct='%1.1f%%'
)

plt.title('Payment Method Distribution')
plt.ylabel('')

plt.show()

# ==========================
# Monthly Sales
# ==========================

monthly_sales = (
    df.groupby('Month')['Total_Bill']
    .sum()
)

print("\n===== Monthly Sales =====")
print(monthly_sales)

plt.figure(figsize=(10, 5))

monthly_sales.plot(
    kind='line',
    marker='o'
)

plt.title('Monthly Sales Trend')
plt.xlabel('Month')
plt.ylabel('Sales')

plt.grid(True)
plt.tight_layout()

plt.show()

# ==========================
# Season Analysis
# ==========================

season_sales = (
    df.groupby('Season')['Total_Bill']
    .sum()
    .sort_values(ascending=False)
)

print("\n===== Sales by Season =====")
print(season_sales)

# ==========================
# Promotion Analysis
# ==========================

promo_profit = (
    df.groupby('Promotion_Type')['Profit']
    .mean()
    .sort_values(ascending=False)
)

print("\n===== Promotion Analysis =====")
print(promo_profit)

# ==========================
# Customer Segment
# ==========================

segment_sales = (
    df.groupby('Customer_Segment')['Total_Bill']
    .sum()
    .sort_values(ascending=False)
)

print("\n===== Customer Segment =====")
print(segment_sales)

# ==========================
# Average Rating
# ==========================

print("\n===== Customer Rating =====")
print(df['Customer_Rating'].describe())

print(
    "\nAverage Rating:",
    round(df['Customer_Rating'].mean(), 2)
)

# ==========================
# Scatter Plot
# ==========================

plt.figure(figsize=(10, 5))

sns.scatterplot(
    data=df,
    x='Discount_Percentage',
    y='Profit'
)

plt.title('Discount Percentage vs Profit')

plt.tight_layout()
plt.show()

# ==========================
# Correlation Analysis
# ==========================

numeric_df = df.select_dtypes(
    include=['int64', 'float64']
)

corr = numeric_df.corr()

print("\n===== Correlation with Profit =====")

print(
    corr['Profit']
    .sort_values(ascending=False)
)

plt.figure(figsize=(12, 8))

sns.heatmap(
    corr,
    cmap='coolwarm'
)

plt.title('Correlation Matrix')

plt.tight_layout()
plt.show()

# ==========================
# Save Cleaned Dataset
# ==========================

df.to_csv(
    r'../dataset/cleaned_bakery_dataset.csv',
    index=False,
    encoding='utf-8'
)

print("\nEDA Completed Successfully")
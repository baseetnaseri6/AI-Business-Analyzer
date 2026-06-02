from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
from io import BytesIO
import requests

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    question: str
    data: dict

@app.get("/")
def home():
    return {"message": "AI Business Analyzer Backend Running"}

def ask_ollama(prompt):
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llama3.2",
                "prompt": prompt,
                "stream": False
            },
            timeout=90
        )

        data = response.json()
        return data.get("response", "No AI response generated.")

    except Exception as e:
        return f"Ollama error: {str(e)}"

def read_uploaded_file(file: UploadFile, contents: bytes):
    filename = file.filename.lower()

    if filename.endswith(".csv"):
        return pd.read_csv(BytesIO(contents))

    elif filename.endswith(".xlsx"):
        return pd.read_excel(BytesIO(contents))

    else:
        return None

@app.post("/analyze")
async def analyze_file(files: list[UploadFile] = File(...)):
    dataframes = []
    uploaded_files = []

    for file in files:
        contents = await file.read()
        df = read_uploaded_file(file, contents)

        if df is not None:
            df["Source_File"] = file.filename
            dataframes.append(df)
            uploaded_files.append(file.filename)

    if not dataframes:
        return {"error": "Only CSV and Excel files are supported."}

    df = pd.concat(dataframes, ignore_index=True)

    rows = len(df)
    columns = list(df.columns)

    total_sales = 0
    total_profit = 0
    avg_sale = 0
    profit_margin = 0
    top_product = "---"
    top_region = "---"

    sales_by_product = {}
    sales_by_region = {}
    sales_by_file = {}

    preview_rows = df.head(8).fillna("").to_dict(orient="records")

    if "Sales" in df.columns:
        total_sales = float(df["Sales"].sum())
        avg_sale = float(df["Sales"].mean())

    if "Sales" in df.columns and "Cost" in df.columns:
        total_profit = float((df["Sales"] - df["Cost"]).sum())

        if total_sales > 0:
            profit_margin = round((total_profit / total_sales) * 100, 2)

    if "Product" in df.columns and "Sales" in df.columns:
        product_group = df.groupby("Product")["Sales"].sum()
        top_product = product_group.idxmax()
        sales_by_product = {str(k): float(v) for k, v in product_group.items()}

    if "Region" in df.columns and "Sales" in df.columns:
        region_group = df.groupby("Region")["Sales"].sum()
        top_region = region_group.idxmax()
        sales_by_region = {str(k): float(v) for k, v in region_group.items()}

    if "Source_File" in df.columns and "Sales" in df.columns:
        file_group = df.groupby("Source_File")["Sales"].sum()
        sales_by_file = {str(k): float(v) for k, v in file_group.items()}

    prompt = f"""
You are an AI business analyst.

Analyze this combined multi-file business dataset and provide:
1. Business overview
2. Key insight
3. Weakness or risk
4. Recommendation
5. Next business action

Business Data:
- Uploaded Files: {uploaded_files}
- Rows: {rows}
- Columns: {columns}
- Total Sales: {total_sales}
- Total Profit: {total_profit}
- Average Sale: {avg_sale}
- Profit Margin: {profit_margin}%
- Top Product: {top_product}
- Top Region: {top_region}
- Sales by Product: {sales_by_product}
- Sales by Region: {sales_by_region}
- Sales by File: {sales_by_file}

Keep the answer professional and concise.
"""

    ai_insight = ask_ollama(prompt)

    return {
        "filename": ", ".join(uploaded_files),
        "uploaded_files": uploaded_files,
        "rows": rows,
        "columns": columns,
        "total_sales": total_sales,
        "total_profit": total_profit,
        "avg_sale": avg_sale,
        "profit_margin": profit_margin,
        "top_product": top_product,
        "top_region": top_region,
        "sales_by_product": sales_by_product,
        "sales_by_region": sales_by_region,
        "sales_by_file": sales_by_file,
        "preview_rows": preview_rows,
        "ai_insight": ai_insight
    }

@app.post("/chat")
async def chat_with_data(request: ChatRequest):
    data = request.data
    question = request.question

    prompt = f"""
You are an AI business data assistant.

Business summary:
- Files: {data.get("uploaded_files")}
- Rows: {data.get("rows")}
- Columns: {data.get("columns")}
- Total Sales: {data.get("total_sales")}
- Total Profit: {data.get("total_profit")}
- Average Sale: {data.get("avg_sale")}
- Profit Margin: {data.get("profit_margin")}%
- Top Product: {data.get("top_product")}
- Top Region: {data.get("top_region")}
- Sales by Product: {data.get("sales_by_product")}
- Sales by Region: {data.get("sales_by_region")}
- Sales by File: {data.get("sales_by_file")}
- Preview Rows: {data.get("preview_rows")}

User question:
{question}

Answer clearly and professionally based only on this data.
"""

    answer = ask_ollama(prompt)

    return {"answer": answer}

@app.post("/forecast")
async def forecast_business(data: dict):
    total_sales = float(data.get("total_sales", 0))
    total_profit = float(data.get("total_profit", 0))

    predicted_sales = round(total_sales * 1.12, 2)
    predicted_profit = round(total_profit * 1.10, 2)

    growth_trend = "Positive Growth" if predicted_sales > total_sales else "Stable"

    prompt = f"""
You are an AI business forecasting analyst.

Based on this business summary:
- Uploaded Files: {data.get("uploaded_files")}
- Current Total Sales: {total_sales}
- Current Total Profit: {total_profit}
- Predicted Next Sales: {predicted_sales}
- Predicted Next Profit: {predicted_profit}
- Sales by Product: {data.get("sales_by_product")}
- Sales by Region: {data.get("sales_by_region")}
- Sales by File: {data.get("sales_by_file")}
- Top Product: {data.get("top_product")}
- Top Region: {data.get("top_region")}

Write a short professional forecast report:
1. Forecast overview
2. Expected growth
3. Possible risk
4. Recommendation
"""

    forecast_report = ask_ollama(prompt)

    return {
        "predicted_sales": predicted_sales,
        "predicted_profit": predicted_profit,
        "growth_trend": growth_trend,
        "forecast_report": forecast_report
    }

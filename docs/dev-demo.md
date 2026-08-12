# Development Demo: React, FastAPI và Docker

## Kiến trúc

Demo gồm hai services:

* React frontend hiển thị summary, metrics, filters, answers và retrieval traces
* FastAPI backend đọc `golden_dataset.json` cùng hai benchmark artifacts

Backend là read-only. Demo không nhận hoặc sử dụng OpenAI API key.

## Chạy bằng Docker

Build và khởi động toàn bộ demo:

```powershell
docker compose up --build -d
```

Mở giao diện:

```text
http://localhost:8088
```

Kiểm tra trạng thái containers:

```powershell
docker compose ps
```

Xem logs:

```powershell
docker compose logs -f
```

Dừng demo:

```powershell
docker compose down
```

## Chạy development không dùng Docker

Backend:

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload --port 8000
```

Frontend trong terminal khác:

```powershell
Set-Location frontend
npm install
npm run dev
```

Mở `http://localhost:5173`. Vite proxy chuyển `/api` đến FastAPI tại port 8000.

## API endpoints

```text
GET /api/health
GET /api/summary
GET /api/cases
GET /api/cases/{case_id}
```

`GET /api/cases` hỗ trợ query parameters `difficulty` và `status`.

## Deploy

Docker Compose phù hợp để demo trên một VM có Docker. Clone repository, bảo đảm
artifacts tồn tại, sau đó chạy `docker compose up --build -d`. Mặc định chỉ port
8088 được publish; backend ở private Docker network. Có thể chọn port khác bằng
`$env:DEMO_PORT=8090` trước khi chạy Compose.

Trong production nên đặt reverse proxy có TLS ở trước port 8088 và pin image
versions theo release. Không copy `.env` vào image và không expose OpenAI key.

from fastapi import FastAPI, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
import uvicorn
from dotenv import load_dotenv
from rag_engine import RAGEngine

# Load environment variables
load_dotenv()

app = FastAPI(title="UniVault RAG Backend")

# Hyper-permissive CORS for production stability
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"DEBUG: Incoming {request.method} request to {request.url.path}")
    if request.method in ("POST", "PUT", "PATCH"):
        body = await request.body()
        if body:
            print(f"DEBUG: Payload: {body.decode('utf-8', errors='replace')}")
    response = await call_next(request)
    return response

# Initialize RAG Engine
api_key = os.getenv("GEMINI_API_KEY")
rag_engine = RAGEngine(api_key=api_key)


# --- Pydantic Models ---
class ChatRequest(BaseModel):
    query: str


# --- Routes ---
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "UniVault RAG Backend"}


@app.post("/api/chat")
async def chat(payload: ChatRequest):
    try:
        response = rag_engine.query(payload.query)
        return {"response": response}
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    try:
        # Save file temporarily
        upload_folder = "uploads"
        os.makedirs(upload_folder, exist_ok=True)

        file_path = os.path.join(upload_folder, file.filename)
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)

        # Process file with RAG engine
        num_chunks = rag_engine.ingest_file(file_path)

        return {"message": f"Successfully processed {file.filename}", "chunks": num_chunks}

    except Exception as e:
        print(f"Error in upload endpoint: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print("\n✅ UniVault Backend is running!")
    print(f"   - API listening on: http://localhost:{port}")
    print(f"   - Swagger docs at:  http://localhost:{port}/docs")
    print("   - NOW: Open 'client/index.html' with Live Server to use the app.\n")
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True)

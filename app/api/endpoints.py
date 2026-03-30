from fastapi import APIRouter, File, UploadFile, Request
from fastapi.responses import FileResponse
from fastapi.templating import Jinja2Templates
import psutil
from datetime import datetime
import os
import shutil

router = APIRouter()

templates = Jinja2Templates(directory="templates")

STORAGE_PATH = os.getenv("STORAGE_PATH", "./storage")
SECRET_PASSWORD = os.getenv("SECRET_PASSWORD", "")

if not os.path.exists(STORAGE_PATH):
    os.makedirs(STORAGE_PATH)


@router.get("/")
async def get_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@router.get("/files")
def list_files(password: str = None):
    if password != SECRET_PASSWORD:
        return {"error": "unauthorized"}
    return {"files": os.listdir(STORAGE_PATH)}


@router.get("/download/{filename}")
def download_file(filename: str, password: str = None):
    if password != SECRET_PASSWORD:
        return {"error": "unauthorized"}
    file_path = os.path.join(STORAGE_PATH, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path)
    return {"error": "file not found"}


@router.get("/stats")
def get_stats():
    return {
        "cpu": psutil.cpu_percent(interval=0.1),
        "ram": psutil.virtual_memory().percent,
        "disk": psutil.disk_usage('C:\\').percent,
        "proc": len(psutil.pids()),
        "boot_time": datetime.fromtimestamp(psutil.boot_time()).strftime("%Y-%m-%d %H:%M:%S")
    }


@router.post("/upload")
async def upload_file(password: str, file: UploadFile = File(...)):
    if password != SECRET_PASSWORD:
        return {"error": "unauthorized"}
    file_path = os.path.join(STORAGE_PATH, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"status": "success", "filename": file.filename}


@router.delete("/files/{filename}")
def delete_file(filename: str, password: str = None):
    if password != SECRET_PASSWORD:
        return {"error": "unauthorized"}
    
    file_path = os.path.join(STORAGE_PATH, filename)

    if not os.path.exists(file_path):
        return {"error": "file not found"}
    
    os.remove(file_path)
    return {"status": "deleted", "filename": filename}
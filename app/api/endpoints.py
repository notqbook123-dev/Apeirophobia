from fastapi import APIRouter, File, UploadFile, Request, Depends, Header, HTTPException 
from fastapi.responses import FileResponse
from fastapi.templating import Jinja2Templates
import psutil
from datetime import datetime
import os
import shutil
import secrets
import pathlib

router = APIRouter()

templates = Jinja2Templates(directory="templates")

STORAGE_PATH = os.getenv("STORAGE_PATH", "./storage")
SECRET_PASSWORD = os.getenv("SECRET_PASSWORD", "")

def check_auth(x_password: str = Header(None)):
    if not x_password or not secrets.compare_digest(x_password, SECRET_PASSWORD):
        raise HTTPException (status_code=401, detail="unauthorized")


if not os.path.exists(STORAGE_PATH):
    os.makedirs(STORAGE_PATH)


@router.get("/")
async def get_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@router.get("/files")
def list_files(auth: None = Depends(check_auth)):
    return {"files": os.listdir(STORAGE_PATH)}


@router.get("/download/{filename}")
def download_file(filename: str, auth: None = Depends(check_auth)):
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
async def upload_file(file: UploadFile = File(...), auth: None = Depends(check_auth)): # <-- помоему решили проблему с загрузкой вредоносного файла
    # берём только имя файла, без пути
    safe_name = pathlib.Path(file.filename).name

    # если имя пустое или это скрытый файл
    if not safe_name or safe_name.startswith('.'):
        raise HTTPException(status_code=400, detail="invalid filename")

    file_path = os.path.join(STORAGE_PATH, safe_name)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"status": "success", "filename": safe_name}


@router.delete("/files/{filename}")
def delete_file(filename: str, auth: None = Depends(check_auth)):
    file_path = os.path.join(STORAGE_PATH, filename)
    if not os.path.exists(file_path):
        return {"error": "file not found"}
    os.remove(file_path)
    return {"status": "deleted", "filename": filename}
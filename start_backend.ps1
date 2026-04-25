Set-Location -Path .\backend
if (!(Test-Path -Path venv)) {
    py -m venv venv
}
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe -m uvicorn main:app --reload

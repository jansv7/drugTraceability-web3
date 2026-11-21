@echo off
REM ==========================================================================
REM  Menjalankan aplikasi DrugTraceability di komputer sendiri (Windows).
REM  Klik dua kali berkas ini, atau jalankan dari Command Prompt.
REM ==========================================================================
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js tidak ditemukan. Pasang Node.js 18 atau lebih baru lebih dahulu:
  echo https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Memasang dependensi, mohon tunggu...
  call npm install
  if errorlevel 1 (
    echo Gagal memasang dependensi.
    pause
    exit /b 1
  )
)

echo.
echo ==========================================================
echo   DrugTraceability - lingkungan pengujian lokal
echo ==========================================================
echo   Jendela 1 dari 3: node blockchain lokal akan dibuka.
echo   Biarkan jendela itu tetap terbuka.
echo ==========================================================
echo.

start "DrugTraceability - Node Blockchain" cmd /k "npx hardhat node"

echo Menunggu node siap...
timeout /t 12 /nobreak >nul

echo Melakukan deployment kontrak...
call npm run deploy:local
if errorlevel 1 (
  echo Deployment gagal. Pastikan jendela node blockchain masih berjalan.
  pause
  exit /b 1
)

echo Mengisi data contoh untuk demonstrasi...
call npm run seed:local

echo.
echo ==========================================================
echo   Membuka antarmuka web.
echo   Alamat: http://127.0.0.1:5173/
echo   Hentikan dengan menutup jendela server ini.
echo ==========================================================
echo.
start "" http://127.0.0.1:5173/
call npm run web

endlocal

#!/usr/bin/env bash
# ==========================================================================
#  Menjalankan aplikasi DrugTraceability di Linux / macOS.
#  Jalankan: bash JALANKAN-DI-LINUX-MAC.sh
# ==========================================================================
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js tidak ditemukan. Pasang Node.js 18 atau lebih baru lebih dahulu."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Memasang dependensi..."
  npm install
fi

echo "=========================================================="
echo "  DrugTraceability - lingkungan pengujian lokal"
echo "=========================================================="

# Node blockchain lokal di latar belakang
npx hardhat node > /tmp/drugtrace-node.log 2>&1 &
NODE_PID=$!
trap 'kill $NODE_PID 2>/dev/null || true' EXIT

echo "Menunggu node siap..."
sleep 10

echo "Melakukan deployment kontrak..."
npm run deploy:local

echo "Mengisi data contoh untuk demonstrasi..."
npm run seed:local

echo "=========================================================="
echo "  Antarmuka web: http://127.0.0.1:5173/"
echo "  Hentikan dengan Ctrl+C"
echo "=========================================================="
npm run web

// Server statis kecil untuk folder web/ tanpa dependensi tambahan.
// Dipakai agar MetaMask dapat diakses dari halaman (beberapa peramban
// memblokir window.ethereum pada halaman yang dibuka via file://).
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "web");
const PORT = Number(process.env.PORT || 5173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = path.join(ROOT, path.normalize(urlPath).replace(/^([/\\])+/, ""));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end("Akses ditolak");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Berkas tidak ditemukan: " + urlPath);
      return;
    }
    const type = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
    res.end(data);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("=================================================");
  console.log("Server antarmuka DrugTraceability berjalan");
  console.log("  alamat : http://127.0.0.1:" + PORT + "/");
  console.log("  folder : " + ROOT);
  console.log("Hentikan dengan Ctrl+C");
  console.log("=================================================");
});

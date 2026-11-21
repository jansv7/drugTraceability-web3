// Uji cepat server statis: jalankan server, minta beberapa berkas, lalu tutup.
const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

const srv = spawn(process.execPath, [path.join(__dirname, "serve.js")], {
  cwd: path.join(__dirname, ".."),
  stdio: ["ignore", "pipe", "pipe"],
});
let out = "";
srv.stdout.on("data", (d) => { out += d; });
srv.stderr.on("data", (d) => { out += "[err] " + d; });
srv.on("exit", (code) => console.log("server exit code:", code));

function get(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let body = "";
      res.on("data", (d) => { body += d; });
      res.on("end", () => resolve({ status: res.statusCode, len: body.length, head: body.slice(0, 60).replace(/\n/g, " ") }));
    });
    req.on("error", (e) => resolve({ status: "ERR", msg: e.message }));
  });
}

(async () => {
  await new Promise((r) => setTimeout(r, 1200));
  const urls = [
    "http://127.0.0.1:5173/",
    "http://127.0.0.1:5173/verifikasi.html",
    "http://127.0.0.1:5173/dashboard.html",
    "http://127.0.0.1:5173/daftar-aktor.html",
    "http://127.0.0.1:5173/panduan.html",
    "http://127.0.0.1:5173/contract-config.js",
    "http://127.0.0.1:5173/abi/DrugTraceability.js",
    "http://127.0.0.1:5173/assets/js/app.js",
    "http://127.0.0.1:5173/assets/js/dashboard.js",
    "http://127.0.0.1:5173/assets/css/app.css",
    "http://127.0.0.1:5173/vendor/ethers.umd.min.js",
    "http://127.0.0.1:5173/vendor/qrcode.min.js",
    "http://127.0.0.1:5173/tidak-ada.html",
  ];
  for (const u of urls) {
    const r = await get(u);
    console.log(String(r.status).padEnd(4), String(r.len || "").padEnd(8), u.replace("http://127.0.0.1:5173", ""), r.head ? "| " + r.head : (r.msg || ""));
  }
  srv.kill();
  await new Promise((r) => setTimeout(r, 400));
  console.log("--- output server ---");
  console.log(out.trim());
  process.exit(0);
})();

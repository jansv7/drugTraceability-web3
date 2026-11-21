/* ==========================================================================
   DrugTraceability - skrip bersama
   Berisi: konfigurasi jaringan, koneksi MetaMask, pemanggilan kontrak,
   penyimpanan permintaan pendaftaran aktor (localStorage, bukan blockchain),
   serta komponen UI bersama (toast, modal, format).
   Semua data batch dan role dibaca langsung dari smart contract.
   ========================================================================== */

const DT = (() => {
  // ---- Konstanta role, HARUS sama dengan enum DrugTypes.Role ----
  const ROLE = { NONE: 0, MANUFACTURER: 1, DISTRIBUTOR: 2, PHARMACY: 3, REGULATOR: 4 };
  const ROLE_LABEL = { 0: "Belum terdaftar", 1: "Pabrik", 2: "Distributor", 3: "Apotek / RS", 4: "BPOM (Regulator)" };
  const NETWORK_LABEL = { 31337: "Hardhat Local", 11155111: "Sepolia Testnet", 1337: "Ganache / node lokal" };

  const STORAGE_KEY = "drugtrace.requests.v1";
  const EXPLORER = {
    11155111: "https://sepolia.etherscan.io",
  };

  const cfg = window.DRUGTRACE_CONFIG || {};
  const abiWrap = window.DRUGTRACE_ABI || { abi: [] };
  const ABI = abiWrap.abi;

  const state = {
    provider: null,
    signer: null,
    contract: null,
    address: null,
    chainId: null,
    role: null,
    ethers: null,
  };

  /* ------------------------------------------------------------------ UI --- */
  function toast(message, type = "info", title = "") {
    let box = document.querySelector(".toasts");
    if (!box) {
      box = document.createElement("div");
      box.className = "toasts";
      box.setAttribute("role", "status");
      box.setAttribute("aria-live", "polite");
      document.body.appendChild(box);
    }
    const el = document.createElement("div");
    el.className = "toast " + (type === "success" ? "ok" : type === "error" ? "err" : type === "warn" ? "warn" : "");
    const head = title || (type === "success" ? "Berhasil" : type === "error" ? "Gagal" : type === "warn" ? "Perhatian" : "Informasi");
    el.innerHTML =
      '<div class="t-title"></div><div class="t-body"></div>';
    el.querySelector(".t-title").textContent = head;
    const body = el.querySelector(".t-body");
    if (message instanceof Node) body.appendChild(message);
    else body.textContent = message;
    box.appendChild(el);
    const kill = () => el.remove();
    if (type !== "error") setTimeout(kill, 6000);
    el.addEventListener("click", kill);
    return el;
  }

  function shorten(addr, head = 6, tail = 4) {
    if (!addr || typeof addr !== "string") return "";
    return addr.length > head + tail + 2 ? addr.slice(0, head) + "…" + addr.slice(-tail) : addr;
  }

  function fmtUnix(ts) {
    if (!ts || ts === 0n || ts === 0) return "-";
    const d = new Date(Number(ts) * 1000);
    return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function fmtDate(ts) {
    if (!ts || ts === 0n || ts === 0) return "-";
    return new Date(Number(ts) * 1000).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  }

  function toLocalInput(ts) {
    const d = new Date(Number(ts) * 1000);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function dateToUnix(value) {
    // <input type="date"> -> awal hari waktu lokal
    const d = new Date(value + "T00:00:00");
    return BigInt(Math.floor(d.getTime() / 1000));
  }

  function isExpired(ts) {
    return Number(ts) * 1000 < Date.now();
  }

  function daysLeft(ts) {
    return Math.ceil((Number(ts) * 1000 - Date.now()) / 86400000);
  }

  function explorerTx(hash) {
    const base = EXPLORER[state.chainId];
    return base ? `${base}/tx/${hash}` : null;
  }

  function explorerAddr(addr) {
    const base = EXPLORER[state.chainId];
    return base ? `${base}/address/${addr}` : null;
  }

  function el(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // Alamat Ethereum tidak peka huruf besar/kecil. Checksum hanya petunjuk, jadi
  // setiap alamat dari input pengguna dinormalkan ke huruf kecil agar wallet
  // tidak menolak dengan pesan "bad address checksum" ketika pengguna menempel
  // alamat yang huruf besar/kecilnya tidak konsisten.
  function normAddr(a) {
    return String(a || "").trim().toLowerCase();
  }

  function isAddr(a) {
    return /^0x[0-9a-fA-F]{40}$/.test(String(a || "").trim());
  }

  function isBatchId(v) {
    return /^0x[0-9a-fA-F]{64}$/.test(String(v || "").trim());
  }

  /* --------------------------------------------------------------- Modal --- */
  function modal({ title, bodyHtml, confirmText = "Konfirmasi", cancelText = "Batal", danger = false }) {
    return new Promise((resolve) => {
      const wrap = el(`
        <div class="modal open" role="dialog" aria-modal="true">
          <div class="modal-backdrop"></div>
          <div class="modal-card">
            <h3></h3>
            <div class="modal-body"></div>
            <div class="modal-actions">
              <button class="btn ghost" data-act="cancel"></button>
              <button class="btn ${danger ? "danger" : "primary"}" data-act="ok"></button>
            </div>
          </div>
        </div>`);
      wrap.querySelector("h3").textContent = title;
      const body = wrap.querySelector(".modal-body");
      if (bodyHtml instanceof Node) body.appendChild(bodyHtml);
      else body.innerHTML = bodyHtml;
      wrap.querySelector('[data-act="cancel"]').textContent = cancelText;
      wrap.querySelector('[data-act="ok"]').textContent = confirmText;
      document.body.appendChild(wrap);
      const close = (val) => {
        wrap.remove();
        document.removeEventListener("keydown", onKey);
        resolve(val);
      };
      const onKey = (e) => { if (e.key === "Escape") close(false); };
      document.addEventListener("keydown", onKey);
      wrap.querySelector(".modal-backdrop").addEventListener("click", () => close(false));
      wrap.querySelector('[data-act="cancel"]').addEventListener("click", () => close(false));
      wrap.querySelector('[data-act="ok"]').addEventListener("click", () => close(true));
    });
  }

  /* -------------------------------------------------------- Wallet / Chain --- */
  function hasWallet() {
    return typeof window.ethereum !== "undefined";
  }

  async function connectWallet() {
    if (!hasWallet()) throw new Error("MetaMask tidak terdeteksi. Pasang ekstensi MetaMask lalu muat ulang halaman.");
    const ethers = state.ethers || window.ethers;
    state.ethers = ethers;
    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    state.provider = provider;
    state.signer = await provider.getSigner();
    state.address = await state.signer.getAddress();
    const net = await provider.getNetwork();
    state.chainId = Number(net.chainId);
    state.contract = makeContract(state.signer);
    await refreshRole();
    emitChange();
    return state;
  }

  function makeContract(runner) {
    const address = cfg[state.chainId] && cfg[state.chainId].contractAddress;
    if (!address) return null;
    return new state.ethers.Contract(address, ABI, runner);
  }

  async function attachExisting() {
    if (!hasWallet()) return null;
    const ethers = state.ethers || window.ethers;
    state.ethers = ethers;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_accounts", []);
    if (!accounts || accounts.length === 0) return null;
    state.provider = provider;
    state.signer = await provider.getSigner();
    state.address = accounts[0];
    const net = await provider.getNetwork();
    state.chainId = Number(net.chainId);
    state.contract = makeContract(state.signer);
    await refreshRole();
    emitChange();
    return state;
  }

  async function refreshRole() {
    state.role = null;
    if (!state.address) return null;
    try {
      const c = contractConfigFor(state.chainId);
      if (!c) return null;
      const read = new state.ethers.Contract(c.contractAddress, ABI, state.provider);
      const r = await read.roles(state.address);
      state.role = Number(r);
      const regAddr = await read.regulator();
      state.regulator = regAddr;
    } catch (e) {
      console.warn("Gagal membaca role:", e);
      state.role = -1; // pembacaan gagal (kontrak belum terpasang di jaringan ini)
    }
    return state.role;
  }

  function contractConfigFor(chainId) {
    return cfg[chainId] || null;
  }

  function configuredChainIds() {
    return Object.keys(cfg).map(Number);
  }

  // Chain yang dipakai untuk pembacaan: jaringan wallet bila ada, jika tidak
  // jaringan pertama yang punya alamat kontrak pada contract-config.js.
  function activeChainId() {
    if (state.chainId && cfg[state.chainId]) return state.chainId;
    const ids = configuredChainIds();
    return ids.length ? ids[0] : null;
  }

  // Provider baca-saja. Verifikasi batch bisa dilakukan tanpa wallet.
  function getReadProvider(chainId) {
    const cid = chainId || activeChainId();
    if (!cid) throw new Error("Belum ada alamat kontrak pada contract-config.js. Jalankan deployment lebih dulu.");
    if (state.chainId === cid && state.provider) return state.provider;
    const c = cfg[cid];
    if (c.readProvider) return c.readProvider;
    if (!c.rpcUrl) throw new Error(`Alamat RPC untuk chainId ${cid} belum diisi di web/contract-config.js.`);
    const p = new state.ethers.JsonRpcProvider(c.rpcUrl, cid);
    cfg[cid].readProvider = p;
    return p;
  }

  function readContract(chainId) {
    const cid = chainId || activeChainId();
    const c = contractConfigFor(cid);
    if (!c) throw new Error("Kontrak belum dikonfigurasi untuk jaringan ini.");
    return new state.ethers.Contract(c.contractAddress, ABI, getReadProvider(cid));
  }

  // Membaca satu batch lengkap: struktur Batch + riwayat perpindahan.
  async function loadBatch(batchId, chainId) {
    const c = readContract(chainId);
    const [raw, history] = await Promise.all([
      c.batches(batchId),
      c.getTransferHistory(batchId),
    ]);
    const b = {
      batchId,
      nie: raw[0],
      batchCode: raw[1],
      manufactureDate: raw[2],
      expiryDate: raw[3],
      serialNumber: raw[4],
      manufacturer: raw[5],
      currentHolder: raw[6],
      recalled: raw[7],
      recallReason: raw[8],
      exists: raw[9],
    };
    const transfers = history.map((t) => ({ from: t[0], to: t[1], timestamp: t[2] }));
    return { batch: b, transfers };
  }

  async function computeBatchId(nie, batchCode, serialNumber, chainId) {
    const c = readContract(chainId);
    return await c.computeBatchId(nie, batchCode, serialNumber);
  }

  function batchStatus(batch) {
    if (!batch.exists) return { key: "none", label: "Tidak terdaftar", cls: "danger" };
    if (batch.recalled) return { key: "recalled", label: "Status recall", cls: "danger" };
    if (isExpired(batch.expiryDate)) return { key: "expired", label: "Kedaluwarsa", cls: "warn" };
    return { key: "active", label: "Terdaftar dan berlaku", cls: "ok" };
  }


  function roleLabel(role) {
    return ROLE_LABEL[Number(role)] || "Tidak dikenal";
  }

  function hasRole(role) {
    return Number(state.role) === Number(role);
  }

  function isRegulator() { return hasRole(ROLE.REGULATOR); }
  function isManufacturer() { return hasRole(ROLE.MANUFACTURER); }
  function isDistributor() { return hasRole(ROLE.DISTRIBUTOR); }
  function isPharmacy() { return hasRole(ROLE.PHARMACY); }

  async function switchToConfiguredChain() {
    const ids = configuredChainIds();
    if (ids.length === 0) throw new Error("Belum ada alamat kontrak pada contract-config.js. Jalankan deployment lebih dulu.");
    const target = ids[0];
    const hex = "0x" + target.toString(16);
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
    } catch (e) {
      if (e && (e.code === 4902 || e.code === -32603)) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [chainParams(target)],
        });
      } else throw e;
    }
  }

  function chainParams(chainId) {
    if (chainId === 31337) {
      return {
        chainId: "0x7a69",
        chainName: "Hardhat Local (DrugTraceability)",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: ["http://127.0.0.1:8545"],
      };
    }
    return {
      chainId: "0x" + chainId.toString(16),
      chainName: NETWORK_LABEL[chainId] || "Jaringan " + chainId,
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: [],
    };
  }

  /* ------------------------------------------------------- Transaksi tulis --- */
  async function writeTx(fnName, args, { successTitle = "Transaksi berhasil" } = {}) {
    if (!state.contract) throw new Error("Kontrak belum terhubung. Hubungkan wallet dan pastikan jaringan benar.");
    const fn = state.contract[fnName];
    if (!fn) throw new Error(`Fungsi ${fnName}() tidak tersedia pada ABI kontrak.`);
    const t = toast("Menunggu konfirmasi pada MetaMask…", "warn", "Menunggu wallet");
    let hash = null;
    try {
      const tx = await fn(...args);
      hash = tx.hash;
      t.querySelector(".t-title").textContent = "Transaksi dikirim";
      t.querySelector(".t-body").textContent = "Menunggu transaksi masuk ke blok…";
      const receipt = await tx.wait();
      t.remove();
      const link = explorerTx(receipt.hash);
      const msg = document.createElement("div");
      msg.innerHTML =
        `Transaksi masuk blok <span class="mono">${receipt.blockNumber}</span>` +
        (link ? ` · <a href="${link}" target="_blank" rel="noopener">lihat di explorer</a>` : "");
      toast(msg, "success", successTitle);
      return receipt;
    } catch (err) {
      t.remove();
      throw err;
    }
  }

  // Ubah error mentah MetaMask / require() menjadi pesan yang bisa dibaca.
  function txError(err) {
    if (!err) return "Terjadi kesalahan tidak dikenal.";
    if (err.code === "ACTION_REJECTED" || err.code === 4001) return "Transaksi dibatalkan pada wallet.";
    const msg = err.shortMessage || err.reason || err.message || String(err);
    if (/user rejected|denied transaction/i.test(msg)) return "Transaksi dibatalkan pada wallet.";
    if (/insufficient funds/i.test(msg)) return "Saldo ETH tidak cukup untuk biaya transaksi.";
    if (/nonce/i.test(msg)) return "Nonce transaksi tidak sinkron. Reset akun di MetaMask (Advanced > Clear activity tab data).";
    const m = msg.match(/execution reverted:? ?(.*)/i);
    if (m && m[1]) return m[1].trim();
    return msg;
  }

  /* ---------------------------------------------------- Permintaan aktor --- */
  // Catatan: fitur ini TIDAK menyimpan apa pun ke blockchain. Ia hanya
  // menyimpan permintaan di browser agar Regulator dapat menyalin alamat
  // lalu memanggil registerActor() dari walletnya sendiri.
  function readRequests() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function writeRequests(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-200)));
  }

  function addRequest(entry) {
    const list = readRequests();
    const dup = list.find((r) => r.address.toLowerCase() === entry.address.toLowerCase() && r.status === "menunggu");
    if (dup) return { duplicate: true, entry: dup };
    list.push(entry);
    writeRequests(list);
    return { duplicate: false, entry };
  }

  function updateRequest(address, patch) {
    const list = readRequests();
    const idx = list.findIndex((r) => r.address.toLowerCase() === String(address).toLowerCase());
    if (idx >= 0) { list[idx] = { ...list[idx], ...patch }; writeRequests(list); }
    return list;
  }

  /* --------------------------------------------------------------- Events --- */
  const listeners = new Set();
  function onChange(fn) { listeners.add(fn); }
  function emitChange() { listeners.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } }); }

  function watchWallet() {
    if (!hasWallet()) return;
    window.ethereum.on("accountsChanged", () => window.location.reload());
    window.ethereum.on("chainChanged", () => window.location.reload());
  }

  /* ------------------------------------------------- Header & navigasi global */
  function renderHeader(active) {
    const host = document.getElementById("site-header");
    if (!host) return;
    const nav = [
      ["index.html", "Beranda", "home"],
      ["verifikasi.html", "Verifikasi Obat", "verify"],
      ["dashboard.html", "Dashboard", "dash"],
      ["daftar-aktor.html", "Pendaftaran Aktor", "register"],
      ["panduan.html", "Panduan", "guide"],
    ];
    host.innerHTML = `
      <div class="container">
        <div class="header-inner">
          <a class="brand" href="index.html">
            <span class="brand-mark" aria-hidden="true">DT</span>
            <span class="brand-text"><strong>DrugTraceability</strong><span>Rantai Pasok Farmasi</span></span>
          </a>
          <button class="nav-toggle" id="navToggle" aria-label="Buka menu" aria-expanded="false" aria-controls="mainNav">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M3 6h18M3 12h18M3 18h18"/>
            </svg>
          </button>
          <nav class="main-nav" id="mainNav" aria-label="Navigasi utama">
            ${nav.map(([href, label, key]) => `<a href="${href}"${key === active ? ' aria-current="page"' : ""}>${label}</a>`).join("")}
          </nav>
          <div class="header-actions">
            <button class="wallet-chip off" id="walletChip" type="button">
              <span class="dot" aria-hidden="true"></span><span id="walletChipText">Hubungkan Wallet</span>
            </button>
          </div>
        </div>
      </div>`;

    const toggle = host.querySelector("#navToggle");
    const navEl = host.querySelector("#mainNav");
    toggle.addEventListener("click", () => {
      const open = navEl.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    host.querySelector("#walletChip").addEventListener("click", async () => {
      try {
        if (!state.address) await connectWallet();
        else window.location.href = "dashboard.html";
      } catch (e) {
        toast(txError(e), "error");
      }
    });
    updateHeader();
  }

  function updateHeader() {
    const chip = document.getElementById("walletChip");
    if (!chip) return;
    const text = document.getElementById("walletChipText");
    if (!state.address) {
      chip.className = "wallet-chip off";
      text.textContent = "Hubungkan Wallet";
      return;
    }
    const cfgOk = !!contractConfigFor(state.chainId);
    chip.className = "wallet-chip" + (cfgOk ? "" : " warn");
    text.innerHTML = `<span class="addr">${shorten(state.address)}</span>` +
      (cfgOk ? ` <span class="faint">${roleLabel(state.role)}</span>` : " <span>jaringan tidak dikenal</span>");
  }

  function renderFooter() {
    const host = document.getElementById("site-footer");
    if (!host) return;
    host.innerHTML = `
      <div class="container footer-inner">
        <span>DrugTraceability · purwarupa UAS Blockchain, Kelompok 4E Informatika, Universitas Singaperbangsa Karawang.</span>
        <span>Aturan sistem dijalankan oleh smart contract Solidity, bukan oleh server web.</span>
      </div>`;
  }

  function boot(active) {
    state.ethers = window.ethers;
    renderHeader(active);
    renderFooter();
    attachExisting().catch(() => {});
    watchWallet();
    onChange(updateHeader);
    // tangani tautan lama yang memakai hash untuk verifikasi
    return state;
  }

  return {
    ROLE, ROLE_LABEL, NETWORK_LABEL,
    state, ABI,
    hasWallet, connectWallet, attachExisting, refreshRole, switchToConfiguredChain,
    contractConfigFor, configuredChainIds, chainParams, activeChainId,
    getReadProvider, readContract, loadBatch, computeBatchId, batchStatus,
    roleLabel, hasRole, isRegulator, isManufacturer, isDistributor, isPharmacy,
    writeTx, txError,
    toast, modal, shorten, fmtUnix, fmtDate, toLocalInput, dateToUnix, isExpired, daysLeft,
    explorerTx, explorerAddr, el, escapeHtml, normAddr, isAddr, isBatchId,
    readRequests, writeRequests, addRequest, updateRequest,
    onChange, boot,
  };
})();

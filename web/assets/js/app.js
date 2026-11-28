/* ==========================================================================
   DrugTraceability - lapisan bersama
   Koneksi wallet, pemanggilan kontrak, format, notifikasi, rel atas.
   Semua data batch dan role dibaca dari smart contract; tidak ada data palsu.
   ========================================================================== */

const DT = (() => {
  /* Enum Role, HARUS sama dengan DrugTypes.Role di Solidity */
  const ROLE = { NONE: 0, MANUFACTURER: 1, DISTRIBUTOR: 2, PHARMACY: 3, REGULATOR: 4 };
  const ROLE_LABEL = { 0: "Belum terdaftar", 1: "Pabrik", 2: "Distributor", 3: "Apotek / RS", 4: "BPOM" };
  const ROLE_LONG = {
    0: "Belum terdaftar",
    1: "Pabrik (Manufacturer)",
    2: "Distributor (PBF)",
    3: "Apotek / Rumah Sakit",
    4: "BPOM (Regulator)",
  };
  const NETWORK_LABEL = { 31337: "Hardhat Local", 11155111: "Sepolia Testnet", 1337: "Ganache / node lokal" };
  const EXPLORER = { 11155111: "https://sepolia.etherscan.io" };

  const STORAGE_KEY = "drugtrace.requests.v1";
  const NEW_MARK = "drugtrace.seenBlocks";

  const cfg = window.DRUGTRACE_CONFIG || {};
  const ABI = (window.DRUGTRACE_ABI || { abi: [] }).abi;

  const state = {
    provider: null,
    signer: null,
    contract: null,
    address: null,
    chainId: null,
    role: null,
    regulator: null,
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
    const head = title || (type === "success" ? "Berhasil" : type === "error" ? "Gagal" : type === "warn" ? "Perhatian" : "Keterangan");
    const t1 = document.createElement("div");
    t1.className = "tt";
    t1.textContent = head;
    const t2 = document.createElement("div");
    t2.className = "tb";
    if (message instanceof Node) t2.appendChild(message);
    else t2.textContent = message;
    el.appendChild(t1);
    el.appendChild(t2);
    box.appendChild(el);
    const kill = () => el.remove();
    if (type !== "error") setTimeout(kill, 6500);
    el.addEventListener("click", kill);
    return el;
  }

  function shorten(addr, head = 6, tail = 4) {
    if (!addr || typeof addr !== "string") return "";
    return addr.length > head + tail + 2 ? addr.slice(0, head) + "…" + addr.slice(-tail) : addr;
  }

  function fmtUnix(ts) {
    if (!ts || ts === 0n || ts === 0) return "—";
    return new Date(Number(ts) * 1000).toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  function fmtDate(ts) {
    if (!ts || ts === 0n || ts === 0) return "—";
    return new Date(Number(ts) * 1000).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  }

  // Bentuk ringkas untuk kolom tabel: 20-11-2028
  function fmtShort(ts) {
    if (!ts || ts === 0n || ts === 0) return "—";
    const d = new Date(Number(ts) * 1000);
    const p = (n) => String(n).padStart(2, "0");
    return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
  }

  function toLocalInput(ts) {
    const d = new Date(Number(ts) * 1000);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function dateToUnix(value) {
    const d = new Date(value + "T00:00:00");
    return BigInt(Math.floor(d.getTime() / 1000));
  }

  function isExpired(ts) { return Number(ts) * 1000 < Date.now(); }

  function daysLeft(ts) { return Math.ceil((Number(ts) * 1000 - Date.now()) / 86400000); }

  // Bagian masa berlaku yang sudah berjalan (0..1) untuk bilah masa berlaku
  function lifeUsed(manufactureDate, expiryDate) {
    const a = Number(manufactureDate) * 1000;
    const b = Number(expiryDate) * 1000;
    if (!a || !b || b <= a) return 0;
    return Math.min(1, Math.max(0, (Date.now() - a) / (b - a)));
  }

  function explorerTx(hash) {
    const base = EXPLORER[state.chainId];
    return base ? `${base}/tx/${hash}` : null;
  }
  function explorerAddr(addr) {
    const base = EXPLORER[state.chainId];
    return base ? `${base}/address/${addr}` : null;
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // Alamat Ethereum tidak peka huruf besar/kecil; checksum hanya petunjuk.
  // Dinormalkan ke huruf kecil supaya wallet tidak menolak dengan
  // "bad address checksum" ketika alamat ditempel apa adanya.
  function normAddr(a) { return String(a || "").trim().toLowerCase(); }
  function isAddr(a) { return /^0x[0-9a-fA-F]{40}$/.test(String(a || "").trim()); }
  function isBatchId(v) { return /^0x[0-9a-fA-F]{64}$/.test(String(v || "").trim()); }

  /* --------------------------------------------------------------- Dialog --- */
  function modal({ title, bodyHtml, confirmText = "Konfirmasi", cancelText = "Batal", danger = false }) {
    return new Promise((resolve) => {
      const wrap = document.createElement("div");
      wrap.className = "dlg open";
      wrap.setAttribute("role", "dialog");
      wrap.setAttribute("aria-modal", "true");
      wrap.innerHTML = `
        <div class="scrim"></div>
        <div class="card">
          <h3></h3>
          <div class="dlg-body"></div>
          <div class="acts">
            <button class="btn ghost" data-act="cancel"></button>
            <button class="btn ${danger ? "danger" : "solid"}" data-act="ok"></button>
          </div>
        </div>`;
      wrap.querySelector("h3").textContent = title;
      const body = wrap.querySelector(".dlg-body");
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
      wrap.querySelector(".scrim").addEventListener("click", () => close(false));
      wrap.querySelector('[data-act="cancel"]').addEventListener("click", () => close(false));
      wrap.querySelector('[data-act="ok"]').addEventListener("click", () => close(true));
      const ok = wrap.querySelector('[data-act="ok"]');
      if (ok) ok.focus();
    });
  }

  /* -------------------------------------------------------- Wallet / Jaringan --- */
  function hasWallet() { return typeof window.ethereum !== "undefined"; }

  async function connectWallet() {
    if (!hasWallet()) throw new Error("MetaMask tidak terdeteksi. Pasang ekstensi MetaMask lalu muat ulang halaman.");
    state.ethers = window.ethers;
    const provider = new window.ethers.BrowserProvider(window.ethereum);
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
    const c = cfg[state.chainId];
    if (!c) return null;
    return new state.ethers.Contract(c.contractAddress, ABI, runner);
  }

  async function attachExisting() {
    if (!hasWallet()) return null;
    state.ethers = window.ethers;
    const provider = new window.ethers.BrowserProvider(window.ethereum);
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
    const c = contractConfigFor(state.chainId);
    if (!c) return null;
    try {
      const read = new state.ethers.Contract(c.contractAddress, ABI, state.provider);
      state.role = Number(await read.roles(state.address));
      state.regulator = await read.regulator();
    } catch (e) {
      console.warn("Gagal membaca role:", e);
      state.role = -1;
    }
    return state.role;
  }

  function contractConfigFor(chainId) { return cfg[chainId] || null; }
  function configuredChainIds() { return Object.keys(cfg).map(Number); }

  function activeChainId() {
    if (state.chainId && cfg[state.chainId]) return state.chainId;
    const ids = configuredChainIds();
    return ids.length ? ids[0] : null;
  }

  // Ethers selalu tersedia setelah berkas vendor dimuat. Diambil malas dari
  // window supaya fungsi baca tetap bekerja walau DT.boot belum dijalankan.
  function eth() {
    if (!state.ethers) state.ethers = window.ethers;
    return state.ethers;
  }

  function getReadProvider(chainId) {
    const E = eth();
    const cid = chainId || activeChainId();
    if (!cid) throw new Error("Belum ada alamat kontrak pada contract-config.js. Jalankan deployment lebih dulu.");
    if (state.chainId === cid && state.provider) return state.provider;
    const c = cfg[cid];
    if (c.readProvider) return c.readProvider;
    if (!c.rpcUrl) throw new Error(`Alamat RPC untuk chainId ${cid} belum diisi pada web/contract-config.js.`);
    const p = new E.JsonRpcProvider(c.rpcUrl, cid);
    cfg[cid].readProvider = p;
    return p;
  }

  function readContract(chainId) {
    const E = eth();
    const cid = chainId || activeChainId();
    const c = contractConfigFor(cid);
    if (!c) throw new Error("Kontrak belum dikonfigurasi untuk jaringan ini.");
    return new E.Contract(c.contractAddress, ABI, getReadProvider(cid));
  }

  async function loadBatch(batchId, chainId, opts = {}) {
    const withBlocks = opts.blocks !== false;   // daftar panjang boleh melewati ini
    const c = readContract(chainId);
    const cid = chainId || activeChainId();
    const deployBlock = (cfg[cid] && typeof cfg[cid].deployBlock === "number") ? cfg[cid].deployBlock : 0;

    const [raw, history] = await Promise.all([c.batches(batchId), c.getTransferHistory(batchId)]);

    const batch = {
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

    // Nomor blok tidak dikembalikan getTransferHistory(), jadi diambil dari event.
    // Ini yang membuat kolom "blok" pada kartu stok benar-benar berisi.
    let blocks = [];
    let recallBlock = null;
    let registerBlock = null;
    if (withBlocks) try {
      const [xferEv, recEv, regEv] = await Promise.all([
        c.queryFilter(c.filters.CustodyTransferred(batchId), deployBlock, "latest"),
        c.queryFilter(c.filters.BatchRecalled(batchId), deployBlock, "latest"),
        c.queryFilter(c.filters.BatchRegistered(batchId), deployBlock, "latest"),
      ]);
      blocks = xferEv
        .sort((a, b) => a.blockNumber - b.blockNumber || a.index - b.index)
        .map((e) => ({ block: e.blockNumber, tx: e.transactionHash }));
      if (recEv.length) recallBlock = { block: recEv[0].blockNumber, tx: recEv[0].transactionHash };
      if (regEv.length) registerBlock = { block: regEv[0].blockNumber, tx: regEv[0].transactionHash };
    } catch (e) {
      console.warn("Nomor blok tidak terbaca:", e);
    }

    const transfers = history.map((t, i) => ({
      from: t[0],
      to: t[1],
      timestamp: t[2],
      block: blocks[i] ? blocks[i].block : null,
      tx: blocks[i] ? blocks[i].tx : null,
    }));

    return { batch, transfers, registerBlock, recallBlock };
  }

  async function computeBatchId(nie, batchCode, serialNumber, chainId) {
    return await readContract(chainId).computeBatchId(nie, batchCode, serialNumber);
  }

  // Status satu batch, dipakai seragam di semua halaman
  function batchStatus(batch) {
    if (!batch.exists) return { key: "none", cls: "bad", label: "Tidak terdaftar", stamp: "Tidak terdaftar" };
    if (batch.recalled) return { key: "recalled", cls: "bad", label: "Recall", stamp: "Ditarik dari peredaran" };
    if (isExpired(batch.expiryDate)) return { key: "expired", cls: "warn", label: "Kedaluwarsa", stamp: "Lewat kedaluwarsa" };
    return { key: "active", cls: "ok", label: "Berlaku", stamp: "Berlaku" };
  }

  function roleLabel(role) { return ROLE_LABEL[Number(role)] || "Tidak dikenal"; }
  function roleLong(role) { return ROLE_LONG[Number(role)] || "Tidak dikenal"; }
  function hasRole(role) { return Number(state.role) === Number(role); }
  function isRegulator() { return hasRole(ROLE.REGULATOR); }
  function isManufacturer() { return hasRole(ROLE.MANUFACTURER); }
  function isDistributor() { return hasRole(ROLE.DISTRIBUTOR); }
  function isPharmacy() { return hasRole(ROLE.PHARMACY); }

  async function switchToConfiguredChain() {
    const ids = configuredChainIds();
    if (ids.length === 0) throw new Error("Belum ada alamat kontrak pada contract-config.js.");
    const target = ids[0];
    const hex = "0x" + target.toString(16);
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
    } catch (e) {
      if (e && (e.code === 4902 || e.code === -32603)) {
        await window.ethereum.request({ method: "wallet_addEthereumChain", params: [chainParams(target)] });
      } else throw e;
    }
  }

  const CHAIN_META = {
    31337: { name: "Hardhat Local (DrugTraceability)", rpc: ["http://127.0.0.1:8545"], sym: "ETH" },
    11155111: { name: "Sepolia Testnet", rpc: [], sym: "ETH" },
  };

  function chainParams(chainId) {
    const m = CHAIN_META[chainId];
    if (m) {
      return {
        chainId: "0x" + chainId.toString(16),
        chainName: m.name,
        nativeCurrency: { name: "Ether", symbol: m.sym, decimals: 18 },
        rpcUrls: m.rpc,
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

    // Simulasi dulu (staticCall): kalau kontrak akan menolak, alasannya terbaca
    // di sini. Tanpa ini wallet hanya melaporkan "missing revert data".
    if (typeof fn.staticCall === "function") {
      try {
        await fn.staticCall(...args);
      } catch (simErr) {
        const reason = extractRevert(simErr);
        if (reason) throw new Error(reason);
      }
    }

    const t = toast("Menunggu konfirmasi pada MetaMask…", "warn", "Menunggu wallet");
    try {
      const tx = await fn(...args);
      t.querySelector(".tt").textContent = "Transaksi dikirim";
      t.querySelector(".tb").textContent = "Menunggu transaksi masuk ke blok…";
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

  // Mengambil alasan revert dari berbagai bentuk error ethers/provider.
  // Hardhat & node lain menaruh alasannya di info.error.message dengan bentuk
  // "VM Exception while processing transaction: reverted with reason string '...'".
  function extractRevert(err) {
    if (!err) return null;
    const seen = new Set();

    const fromString = (s) => {
      if (typeof s !== "string") return null;
      // Hanya pola yang pasti memuat alasan. Pola longgar seperti /revert/ 
      // menangkap kata lain dari pesan teknis ("missing revert data") dan
      // menghasilkan alasan palsu.
      const pats = [
        /reverted with reason string ['"](.+?)['"]/i,
        /reverted with custom error\s+\S+/i,
        /execution reverted:\s*([^()]{4,})/i,
      ];
      for (const p of pats) {
        const m = s.match(p);
        if (m && m[1]) {
          const v = m[1].trim().replace(/^["']|["']$/g, "");
          if (v && !/missing revert data|CALL_EXCEPTION|VM Exception|^data$/i.test(v)) return v;
        }
        if (m && p === pats[1]) return "Kontrak menolak transaksi ini (custom error).";
      }
      return null;
    };

    const walk = (o, depth) => {
      if (o == null || depth > 5) return null;
      if (typeof o === "string") return fromString(o);
      if (typeof o !== "object") return null;
      if (seen.has(o)) return null;
      seen.add(o);

      // bentuk yang paling sering: { info: { error: { message } } }
      const direct = fromString(o.reason) || fromString(o.message) || fromString(o.shortMessage);
      if (direct) return direct;

      for (const key of ["info", "error", "data", "cause", "revert", "underlyingError", "payload"]) {
        const nested = walk(o[key], depth + 1);
        if (nested) return nested;
      }
      return null;
    };

    return walk(err, 0);
  }

  // Menerjemahkan error wallet / require() menjadi kalimat yang bisa dibaca
  function txError(err) {
    if (!err) return "Terjadi kesalahan tidak dikenal.";
    if (err.code === "ACTION_REJECTED" || err.code === 4001) return "Transaksi dibatalkan pada wallet.";
    const msg = err.shortMessage || err.reason || err.message || String(err);
    if (/user rejected|denied transaction/i.test(msg)) return "Transaksi dibatalkan pada wallet.";
    if (/insufficient funds/i.test(msg)) return "Saldo ETH tidak cukup untuk biaya transaksi.";
    if (/nonce/i.test(msg)) return "Nonce transaksi tidak sinkron. Reset akun di MetaMask (Pengaturan, Lanjutan, Clear activity tab data).";
    if (/bad address checksum/i.test(msg)) return "Alamat wallet tidak valid. Periksa kembali penulisannya.";
    if (/could not coalesce|ECONNREFUSED|failed to fetch|network changed/i.test(msg))
      return "Tidak dapat menghubungi node blockchain. Pastikan jaringan berjalan.";
    const m = msg.match(/execution reverted:? ?"?(.*?)"?$/i);
    if (m && m[1]) return m[1].trim();
    // Simulasi staticCall melempar pesan alasan apa adanya; jangan diganti
    // dengan "missing revert data" yang tidak menjelaskan apa pun.
    if (/missing revert data/i.test(msg)) return "Kontrak menolak transaksi ini.";
    return msg;
  }

  /* ---------------------------------------------------- Permintaan aktor --- */
  // Catatan kerja, BUKAN data blockchain. Tersimpan di peramban pengaju.
  function readRequests() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }
  function writeRequests(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-200))); }

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
    const i = list.findIndex((r) => r.address.toLowerCase() === String(address).toLowerCase());
    if (i >= 0) { list[i] = { ...list[i], ...patch }; writeRequests(list); }
    return list;
  }

  /* ---------------------------------------------------------------- Events --- */
  const listeners = new Set();
  function onChange(fn) { listeners.add(fn); }
  function emitChange() { listeners.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } }); }

  function watchWallet() {
    if (!hasWallet()) return;
    window.ethereum.on("accountsChanged", () => window.location.reload());
    window.ethereum.on("chainChanged", () => window.location.reload());
  }

  /* ---------------------------------------------------- Rel atas & tepi --- */
  const NAV = [
    ["index.html", "Beranda", "home"],
    ["verifikasi.html", "Periksa Batch", "verify"],
    ["dashboard.html", "Ruang Kerja", "dash"],
    ["daftar-aktor.html", "Pengajuan Aktor", "register"],
    ["panduan.html", "Panduan", "guide"],
  ];

  function renderHeader(active) {
    const host = document.getElementById("site-header");
    if (!host) return;
    host.innerHTML = `
      <div class="railbar">
        <div class="wrap">
          <a class="mark" href="index.html">
            <b>DrugTraceability</b><span>Kartu stok obat</span>
          </a>
          <button class="navbtn" id="navBtn" aria-label="Buka menu" aria-expanded="false" aria-controls="mainNav">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M3 6h18M3 12h18M3 18h18"/>
            </svg>
          </button>
          <nav class="rnav" id="mainNav" aria-label="Navigasi utama">
            ${NAV.map(([href, label, key]) => `<a href="${href}"${key === active ? ' aria-current="page"' : ""}>${label}</a>`).join("")}
          </nav>
          <div class="acts">
            <button class="wchip" id="walletChip" type="button">
              <span class="dot" aria-hidden="true"></span><span id="walletChipText">Hubungkan wallet</span>
            </button>
          </div>
        </div>
      </div>
      <div class="rulebar" aria-hidden="true"></div>`;

    const btn = host.querySelector("#navBtn");
    const nav = host.querySelector("#mainNav");
    btn.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
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
    const txt = document.getElementById("walletChipText");
    if (!state.address) {
      chip.className = "wchip";
      txt.textContent = "Hubungkan wallet";
      return;
    }
    const ok = !!contractConfigFor(state.chainId);
    chip.className = "wchip " + (ok ? "on" : "warn");
    txt.innerHTML =
      `<span>${shorten(state.address)}</span>` +
      (ok
        ? `<span class="role">${roleLabel(state.role)}</span>`
        : `<span class="role">jaringan tidak sesuai</span>`);
  }

  function renderFooter() {
    const host = document.getElementById("site-footer");
    if (!host) return;
    host.innerHTML = `
      <div class="wrap">
        <p>Seluruh angka pada halaman ini dibaca langsung dari smart contract DrugTraceability.
           Aturan sistem dijalankan oleh kontrak, bukan oleh halaman web.</p>
        <p class="mono">UAS Blockchain · Kelompok 4E Informatika · Universitas Singaperbangsa Karawang</p>
      </div>`;
  }

  function boot(active) {
    state.ethers = window.ethers;
    renderHeader(active);
    renderFooter();
    attachExisting().catch(() => {});
    watchWallet();
    onChange(updateHeader);

    // Beberapa halaman memanggil DT.boot() sebelum DOM selesai diparse,
    // sehingga skrip halaman perlu menunggu DOMContentLoaded. Acara ini
    // memastikan urutan itu seragam di semua halaman.
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => emitChange());
    } else {
      setTimeout(() => emitChange(), 0);
    }
    return state;
  }

  return {
    ROLE, ROLE_LABEL, ROLE_LONG, NETWORK_LABEL,
    state, ABI,
    hasWallet, connectWallet, attachExisting, refreshRole, switchToConfiguredChain,
    contractConfigFor, configuredChainIds, activeChainId, chainParams, getReadProvider,
    readContract, loadBatch, computeBatchId, batchStatus,
    roleLabel, roleLong, hasRole, isRegulator, isManufacturer, isDistributor, isPharmacy,
    writeTx, txError,
    toast, modal, shorten, fmtUnix, fmtDate, fmtShort, toLocalInput, dateToUnix,
    isExpired, daysLeft, lifeUsed, explorerTx, explorerAddr,
    escapeHtml, normAddr, isAddr, isBatchId,
    readRequests, writeRequests, addRequest, updateRequest,
    onChange, boot, NEW_MARK,
  };
})();

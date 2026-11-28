/* ==========================================================================
   Dashboard DrugTraceability
   Menampilkan panel berbeda sesuai role yang dibaca dari smart contract.
   Setiap aksi di sini mengirim transaksi nyata melalui wallet pengguna.
   ========================================================================== */

(function () {
  const S = DT.state;
  const ROLE = DT.ROLE;

  let MY_BATCHES = [];      // hasil pemindaian event dari kontrak
  let ACTORS = [];          // hasil pemindaian event ActorRegistered
  let ALL_BATCHES = [];     // seluruh batch yang terdeteksi dari event
  let SCAN_ERROR = null;

  const host = {
    gate: document.getElementById("gate"),
    app: document.getElementById("app"),
    roleBanner: document.getElementById("roleBanner"),
    tabs: document.getElementById("tabs"),
    tabBody: document.getElementById("tabBody"),
  };

  /* --------------------------------------------------------------- util --- */
  function shortAddr(a) { return DT.shorten(a, 10, 8); }

  function addrCell(a) {
    return `<span class="mono" title="${DT.escapeHtml(a)}">${shortAddr(a)}</span>`;
  }

  function statusBadge(batch) {
    const s = DT.batchStatus(batch);
    return `<span class="badge ${s.cls}">${s.label}</span>`;
  }

  function scanRange() {
    const c = DT.contractConfigFor(DT.activeChainId());
    return (c && typeof c.deployBlock === "number") ? c.deployBlock : 0;
  }

  function sets() {
    const read = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    return { read, val: (id) => (document.getElementById(id) || {}).value || "" };
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      DT.toast("Alamat disalin ke clipboard.", "success");
    } catch (e) {
      DT.toast("Gagal menyalin otomatis. Salin manual: " + text, "warn");
    }
  }

  /* ---------------------------------------------------- pemindaian data --- */
  async function scanChain() {
    SCAN_ERROR = null;
    try {
      const c = DT.readContract();
      const from = scanRange();
      const [regs, xfers, recalls, actorEvs] = await Promise.all([
        c.queryFilter(c.filters.BatchRegistered(), from, "latest"),
        c.queryFilter(c.filters.CustodyTransferred(), from, "latest"),
        c.queryFilter(c.filters.BatchRecalled(), from, "latest"),
        c.queryFilter(c.filters.ActorRegistered(), from, "latest"),
      ]);

      const ids = new Set();
      regs.forEach((e) => ids.add(e.args.batchId));

      const loaded = await Promise.all(
        [...ids].map(async (id) => {
          try {
            const d = await DT.loadBatch(id, DT.activeChainId());
            return d.batch;
          } catch (e) { return null; }
        })
      );
      ALL_BATCHES = loaded.filter(Boolean).sort((a, b) => Number(b.manufactureDate - a.manufactureDate));

      ACTORS = [];
      const seen = new Set();
      actorEvs.forEach((e) => {
        const key = e.args.actor.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        ACTORS.push({ actor: e.args.actor, role: Number(e.args.role), block: e.blockNumber, tx: e.transactionHash });
      });

      const me = (S.address || "").toLowerCase();
      MY_BATCHES = ALL_BATCHES.filter((b) => {
        if (DT.isManufacturer()) return b.manufacturer.toLowerCase() === me;
        return b.currentHolder.toLowerCase() === me;
      });

      // Jumlah transaksi custody per batch (untuk kolom ringkas)
      const xcount = {};
      xfers.forEach((e) => {
        const k = e.args.batchId;
        xcount[k] = (xcount[k] || 0) + 1;
      });
      ALL_BATCHES.forEach((b) => { b.txCount = xcount[b.batchId] || 0; });

      const rcount = {};
      recalls.forEach((e) => { rcount[e.args.batchId] = e.args.reason; });
      ALL_BATCHES.forEach((b) => { b.recallReason = b.recalled ? (b.recallReason || rcount[b.batchId] || "") : ""; });
    } catch (e) {
      SCAN_ERROR = DT.txError(e);
      console.warn("Pemindaian event gagal:", e);
    }
  }

  /* ------------------------------------------------------------ kerangka --- */
  function renderGate() {
    if (!DT.hasWallet()) {
      host.gate.innerHTML = `
        <div class="panel">
          <h3>MetaMask tidak terdeteksi</h3>
          <p class="muted">Halaman dashboard memerlukan wallet untuk menandatangani transaksi. Pasang ekstensi MetaMask pada peramban, lalu muat ulang halaman ini.</p>
          <div class="notice tiny">Halaman verifikasi batch tetap dapat dibuka tanpa wallet karena hanya melakukan pembacaan data.</div>
          <div class="row mt-2"><a class="btn ghost" href="verifikasi.html">Buka verifikasi batch</a></div>
        </div>`;
      return;
    }
    host.gate.innerHTML = `
      <div class="panel">
        <h3>Hubungkan wallet untuk membuka dashboard</h3>
        <p class="muted">Wallet berfungsi sebagai identitas alamat blockchain. Role Anda dibaca dari smart contract setelah wallet terhubung.</p>
        <div class="row">
          <button class="btn primary" id="btnConnect">Hubungkan MetaMask</button>
          <a class="btn ghost" href="verifikasi.html">Verifikasi tanpa wallet</a>
        </div>
        <div class="notice tiny mt-2" id="cfgNotice"></div>
      </div>`;
    document.getElementById("btnConnect").addEventListener("click", async () => {
      try { await DT.connectWallet(); } catch (e) { DT.toast(DT.txError(e), "error"); }
    });
    const n = document.getElementById("cfgNotice");
    const ids = DT.configuredChainIds();
    if (ids.length === 0) {
      n.className = "notice warn tiny mt-2";
      n.innerHTML = "Kontrak belum dikonfigurasi. Jalankan <span class='mono'>npm run deploy:local</span> lebih dahulu.";
    } else {
      const cid = ids[0];
      n.innerHTML = "Kontrak terdeteksi pada " + (DT.NETWORK_LABEL[cid] || "chainId " + cid) +
        ": <span class='mono wrap-any'>" + DT.contractConfigFor(cid).contractAddress + "</span>";
    }
  }

  async function render() {
    if (!S.address) { host.app.classList.add("hidden"); renderGate(); return; }
    host.gate.classList.add("hidden");
    host.app.classList.remove("hidden");

    const cfgOk = !!DT.contractConfigFor(S.chainId);
    if (!cfgOk) {
      host.roleBanner.innerHTML = `
        <div class="notice warn">
          <strong>Jaringan wallet belum dikonfigurasi.</strong>
          Wallet Anda terhubung ke chainId ${S.chainId}. Kontrak DrugTraceability belum memiliki alamat pada jaringan tersebut,
          sehingga halaman ini tidak dapat mengirim transaksi.
        </div>
        <div class="row mt-2">
          <button class="btn primary" id="btnSwitch">Pindah ke jaringan kontrak</button>
          <button class="btn ghost" id="btnRetryRole">Periksa ulang role</button>
        </div>`;
      document.getElementById("btnSwitch").addEventListener("click", async () => {
        try { await DT.switchToConfiguredChain(); } catch (e) { DT.toast(DT.txError(e), "error"); }
      });
      document.getElementById("btnRetryRole").addEventListener("click", async () => {
        await DT.refreshRole(); DT.toast("Role dibaca ulang dari kontrak.", "info");
      });
      host.tabs.innerHTML = "";
      host.tabBody.innerHTML =
        '<div class="empty"><strong>Transaksi dinonaktifkan</strong>Pindahkan wallet ke jaringan tempat kontrak di-deploy untuk membuka menu sesuai role.</div>';
      return;
    }

    if (S.role === -1) {
      host.roleBanner.innerHTML = '<div class="notice danger"><strong>Gagal membaca role dari kontrak.</strong> Periksa koneksi jaringan dan alamat kontrak pada <span class="mono">web/contract-config.js</span>.</div>';
      host.tabs.innerHTML = "";
      host.tabBody.innerHTML = "";
      return;
    }

    if (Number(S.role) === ROLE.NONE) {
      host.roleBanner.innerHTML = `
        <div class="panel">
          <h3>Wallet ini belum terdaftar sebagai aktor</h3>
          <p class="muted">
            Kontrak hanya mengizinkan BPOM (regulator) memanggil <span class="mono">registerActor()</span>.
            Karena itu permintaan pendaftaran diajukan ke regulator, bukan dipilih sendiri oleh pengguna.
          </p>
          <dl class="kv">
            <dt>Alamat wallet</dt><dd class="mono wrap-any">${DT.escapeHtml(S.address)}</dd>
            <dt>Jaringan</dt><dd>${DT.NETWORK_LABEL[S.chainId] || "chainId " + S.chainId}</dd>
            <dt>Role saat ini</dt><dd><span class="badge neutral">Belum terdaftar</span></dd>
          </dl>
          <div class="row mt-2">
            <a class="btn primary" href="daftar-aktor.html">Ajukan pendaftaran aktor</a>
            <a class="btn ghost" href="verifikasi.html">Verifikasi batch sebagai pengunjung</a>
          </div>
        </div>`;
      host.tabs.innerHTML = "";
      host.tabBody.innerHTML = "";
      return;
    }

    renderBanner();
    await renderTabs();
  }

  function renderBanner() {
    const labels = {
      1: ["Pabrik (Manufacturer)", "Mendaftarkan batch obat dan menyerahkan custody pertama."],
      2: ["Distributor (PBF)", "Menerima dan meneruskan custody batch yang menjadi tanggung jawabnya."],
      3: ["Apotek / Rumah Sakit (Pharmacy)", "Menerima batch pada tahap akhir distribusi dan memeriksa statusnya."],
      4: ["BPOM (Regulator)", "Mendaftarkan aktor rantai pasok dan menandai batch bermasalah."],
    };
    const meta = labels[Number(S.role)] || ["Aktor", ""];
    const reg = DT.contractConfigFor(S.chainId).contractAddress;
    host.roleBanner.innerHTML = `
      <div class="panel">
        <div class="row between">
          <div>
            <h2 class="mb-1">${meta[0]}</h2>
            <p class="muted mb-0 small">${meta[1]}</p>
          </div>
          <span class="badge accent">${DT.roleLabel(S.role)}</span>
        </div>
        <div class="metrics mt-2">
          <div class="metric"><div class="label">Wallet aktif</div><div class="value" style="font-size:1rem">${shortAddr(S.address)}</div><div class="foot">${DT.contractConfigFor(S.chainId).network || "jaringan kontrak"}</div></div>
          <div class="metric"><div class="label">Batch terkait</div><div class="value" id="mBatch">-</div><div class="foot">${DT.isManufacturer() ? "yang Anda daftarkan" : "yang Anda pegang"}</div></div>
          <div class="metric"><div class="label">Total batch jaringan</div><div class="value" id="mAll">-</div><div class="foot">terdeteksi dari event kontrak</div></div>
          <div class="metric"><div class="label">Aktor terdaftar</div><div class="value" id="mActor">-</div><div class="foot">hasil event ActorRegistered</div></div>
        </div>
        <p class="tiny faint mt-2 mb-0">Kontrak: <span class="mono wrap-any">${reg}</span></p>
      </div>`;
  }

  function updateMetrics() {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set("mBatch", MY_BATCHES.length);
    set("mAll", ALL_BATCHES.length);
    set("mActor", ACTORS.length);
  }

  /* ------------------------------------------------------------- tab set --- */
  const TABS = [
    { id: "batch", label: DT.isManufacturer() ? "Batch yang saya daftarkan" : "Batch yang saya pegang", roles: [1, 2, 3], render: renderBatchTab },
    { id: "registrasi", label: "Registrasi batch", roles: [1], render: renderRegistrasiTab },
    { id: "transfer", label: "Transfer custody", roles: [1, 2, 3], render: renderTransferTab },
    { id: "recall", label: "Recall batch", roles: [1, 4], render: renderRecallTab },
    { id: "aktor", label: "Aktor rantai pasok", roles: [1, 2, 3, 4], render: renderAktorTab },
    { id: "permintaan", label: "Permintaan pendaftaran", roles: [4], render: renderPermintaanTab },
    { id: "log", label: "Log aktivitas", roles: [1, 2, 3, 4], render: renderLogTab },
  ];

  let activeTab = null;

  async function renderTabs() {
    const mine = TABS.filter((t) => t.roles.includes(Number(S.role)));
    if (mine.length === 0) return;
    if (!activeTab || !mine.some((t) => t.id === activeTab)) activeTab = mine[0].id;
    host.tabs.innerHTML = mine
      .map((t) => `<button class="btn sm ${t.id === activeTab ? "primary" : "ghost"}" data-tab="${t.id}" role="tab" aria-selected="${t.id === activeTab}">${DT.escapeHtml(t.label)}</button>`)
      .join("");
    host.tabs.querySelectorAll("[data-tab]").forEach((b) => {
      b.addEventListener("click", async () => {
        activeTab = b.dataset.tab;
        await renderTabs();
      });
    });
    const tab = mine.find((t) => t.id === activeTab);
    host.tabBody.innerHTML = "";
    await tab.render(host.tabBody);
    updateMetrics();
  }

  /* ---------------------------------------------------- TAB: batch saya --- */
  function batchTableRows(list, { withActions = true, emptyText = "" } = {}) {
    if (list.length === 0) {
      return `<tr><td colspan="${withActions ? 7 : 6}"><div class="empty"><strong>Belum ada batch</strong>${emptyText}</div></td></tr>`;
    }
    return list.map((b) => `
      <tr>
        <td>${DT.escapeHtml(b.nie)}</td>
        <td>${DT.escapeHtml(b.batchCode)}</td>
        <td class="mono">${DT.escapeHtml(b.serialNumber)}</td>
        <td>${statusBadge(b)}</td>
        <td>${addrCell(b.currentHolder)}</td>
        <td class="mono">${DT.fmtDate(b.expiryDate)}</td>
        ${withActions ? `<td class="nowrap">
          <button class="btn sm ghost" data-detail="${b.batchId}">Detail</button>
          <button class="btn sm ghost" data-to-transfer="${b.batchId}">Transfer</button>
          ${DT.isManufacturer() && !b.recalled ? `<button class="btn sm ghost" data-to-recall="${b.batchId}">Recall</button>` : ""}
        </td>` : ""}
      </tr>`).join("");
  }

  function wireBatchTable(root) {
    root.querySelectorAll("[data-detail]").forEach((b) =>
      b.addEventListener("click", () => showBatchDetail(b.dataset.detail)));
    root.querySelectorAll("[data-to-transfer]").forEach((b) =>
      b.addEventListener("click", () => { activeTab = "transfer"; renderTabs().then(() => prefillTransfer(b.dataset.toTransfer)); }));
    root.querySelectorAll("[data-to-recall]").forEach((b) =>
      b.addEventListener("click", () => { activeTab = "recall"; renderTabs().then(() => prefillRecall(b.dataset.toRecall)); }));
  }

  async function renderBatchTab(root) {
    root.innerHTML = `
      <div class="panel">
        <div class="panel-head">
          <div>
            <h3>${DT.isManufacturer() ? "Batch yang Anda daftarkan" : "Batch yang sedang Anda pegang"}</h3>
            <p class="sub">Daftar ini disusun dari event <span class="mono">BatchRegistered</span> dan <span class="mono">CustodyTransferred</span>, lalu diverifikasi ulang dengan membaca <span class="mono">batches()</span>.</p>
          </div>
          <button class="btn sm ghost" id="btnRescan">Pindai ulang</button>
        </div>
        <div class="field" style="max-width:320px">
          <label for="filterBatch">Saring batch</label>
          <input id="filterBatch" placeholder="Cari NIE, kode batch, atau nomor serial" autocomplete="off">
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>NIE</th><th>Kode batch</th><th>Serial</th><th>Status</th><th>Pemegang saat ini</th><th>Kedaluwarsa</th><th>Aksi</th></tr></thead>
            <tbody id="batchRows"></tbody>
          </table>
        </div>
        <p class="tiny faint mt-2 mb-0">Daftar ini memuat batch yang Anda pegang saat ini. Untuk memeriksa batch lain, gunakan tab transfer dengan Batch ID yang diketahui, atau halaman verifikasi.</p>
      </div>
      <div id="detailHost"></div>`;

    const rows = root.querySelector("#batchRows");

    function paint() {
      const q = (root.querySelector("#filterBatch").value || "").toLowerCase().trim();
      const list = !q ? MY_BATCHES : MY_BATCHES.filter((b) =>
        (b.nie + " " + b.batchCode + " " + b.serialNumber + " " + b.currentHolder).toLowerCase().includes(q));
      rows.innerHTML = batchTableRows(list, { emptyText: DT.isManufacturer() ? "Daftarkan batch melalui tab registrasi." : "Belum ada batch yang diserahkan kepada wallet ini." });
      wireBatchTable(root);
    }

    root.querySelector("#filterBatch").addEventListener("input", paint);
    root.querySelector("#btnRescan").addEventListener("click", async () => {
      const el = root.querySelector("#btnRescan");
      el.disabled = true; el.textContent = "Memindai…";
      await scanChain();
      el.disabled = false; el.textContent = "Pindai ulang";
      paint(); updateMetrics();
      DT.toast("Data batch dimuat ulang dari kontrak.", "success");
    });
    paint();
  }

  async function showBatchDetail(batchId) {
    const target = document.getElementById("detailHost") || host.tabBody;
    const holder = document.createElement("div");
    holder.className = "panel";
    holder.innerHTML = '<h3>Memuat detail batch…</h3><div class="skeleton mt-2" style="width:70%"></div><div class="skeleton mt-1" style="width:50%"></div>';
    target.prepend(holder);
    try {
      const { batch, transfers } = await DT.loadBatch(batchId, DT.activeChainId());
      const tl = transfers.length
        ? `<ul class="timeline">${transfers.map((t, i) => `<li><div class="tl-head">${i === 0 ? "Serah terima dari pabrik" : "Perpindahan " + (i + 1)}</div>
            <div class="tl-meta">dari ${shortAddr(t.from)} ke ${shortAddr(t.to)} · ${DT.fmtUnix(t.timestamp)}</div></li>`).join("")}</ul>`
        : '<div class="empty"><strong>Tanpa perpindahan</strong>Batch masih pada pemegang pertamanya.</div>';
      holder.innerHTML = `
        <div class="panel-head">
          <div>
            <h3>Detail batch ${DT.escapeHtml(batch.batchCode)}</h3>
            <p class="sub mono wrap-any">${DT.escapeHtml(batchId)}</p>
          </div>
          <div class="row">${statusBadge(batch)}<button class="btn sm ghost" data-close>Tutup</button></div>
        </div>
        <div class="grid split">
          <dl class="kv mb-0">
            <dt>NIE</dt><dd>${DT.escapeHtml(batch.nie)}</dd>
            <dt>Nomor serial</dt><dd class="mono">${DT.escapeHtml(batch.serialNumber)}</dd>
            <dt>Tanggal produksi</dt><dd>${DT.fmtDate(batch.manufactureDate)}</dd>
            <dt>Tanggal kedaluwarsa</dt><dd>${DT.fmtDate(batch.expiryDate)}</dd>
            <dt>Didaftarkan oleh</dt><dd>${addrCell(batch.manufacturer)}</dd>
            <dt>Pemegang saat ini</dt><dd>${addrCell(batch.currentHolder)}</dd>
            <dt>Status recall</dt><dd>${batch.recalled ? '<span class="badge danger">Ya</span>' : '<span class="badge ok">Tidak</span>'}</dd>
            <dt>Alasan recall</dt><dd>${DT.escapeHtml(batch.recallReason || "-")}</dd>
          </dl>
          <div>
            <h4>Riwayat distribusi</h4>
            ${tl}
          </div>
        </div>`;
      holder.querySelector("[data-close]").addEventListener("click", () => holder.remove());
    } catch (e) {
      holder.innerHTML = `<div class="notice danger">${DT.escapeHtml(DT.txError(e))}</div>`;
    }
  }

  /* ----------------------------------------------------- TAB: registrasi --- */
  async function renderRegistrasiTab(root) {
    const today = DT.toLocalInput(Math.floor(Date.now() / 1000));
    const nextYear = DT.toLocalInput(Math.floor(Date.now() / 1000) + 540 * 86400);
    root.innerHTML = `
      <div class="grid split">
        <div class="panel">
          <div class="panel-head">
            <div>
              <h3>Registrasi batch baru</h3>
              <p class="sub">Memanggil <span class="mono">registerBatch()</span>. Peran pemanggil harus Manufacturer.</p>
            </div>
          </div>
          <form id="fBatch" novalidate>
            <div class="field">
              <label for="rNie">NIE (nomor izin edar)</label>
              <input id="rNie" value="DKI123456789" required>
              <span class="hint">Ikuti format nomor izin edar pada kemasan.</span>
              <span class="err">NIE wajib diisi.</span>
            </div>
            <div class="field">
              <label for="rBatch">Kode batch</label>
              <input id="rBatch" value="BATCH-2026-001" required>
              <span class="err">Kode batch wajib diisi.</span>
            </div>
            <div class="field-inline">
              <div class="field">
                <label for="rMfg">Tanggal produksi</label>
                <input type="date" id="rMfg" value="${today}" required>
                <span class="err">Tanggal produksi wajib diisi.</span>
              </div>
              <div class="field">
                <label for="rExp">Tanggal kedaluwarsa</label>
                <input type="date" id="rExp" value="${nextYear}" required>
                <span class="hint">Kontrak menolak tanggal yang tidak setelah tanggal produksi.</span>
                <span class="err">Tanggal kedaluwarsa wajib diisi.</span>
              </div>
            </div>
            <div class="field">
              <label for="rSerial">Nomor serial</label>
              <input id="rSerial" value="SN-0001" required>
              <span class="err">Nomor serial wajib diisi.</span>
            </div>
            <div class="notice tiny">
              Batch ID dihitung kontrak dari NIE + kode batch + nomor serial.
              Kombinasi yang sama tidak dapat didaftarkan dua kali.
            </div>
            <div class="row mt-2">
              <button class="btn primary" type="submit" id="btnRegBatch">Kirim transaksi registrasi</button>
              <button class="btn ghost" type="button" id="btnPreview">Hitung Batch ID</button>
            </div>
          </form>
        </div>

        <div class="stack">
          <div class="panel">
            <h3>Pratinjau Batch ID</h3>
            <p class="sub">Hasil fungsi <span class="mono">computeBatchId()</span> untuk data di sebelah kiri.</p>
            <input id="pBatchId" class="mono" readonly placeholder="Belum dihitung">
            <div class="row mt-2">
              <button class="btn sm ghost" id="btnCopyId">Salin Batch ID</button>
              <a class="btn sm ghost" id="btnOpenVerify" href="#" target="_blank" rel="noopener">Buka halaman verifikasi</a>
            </div>
          </div>
          <div class="panel">
            <h3>Alur yang dijalankan kontrak</h3>
            <ol class="flow-list" style="font-size:.86rem">
              <li><span class="step">1</span><div><strong>Periksa role pemanggil</strong><span>Modifier onlyRole(Manufacturer).</span></div></li>
              <li><span class="step">2</span><div><strong>Periksa urutan tanggal</strong><span>expiryDate harus lebih besar dari manufactureDate.</span></div></li>
              <li><span class="step">3</span><div><strong>Hitung Batch ID</strong><span>keccak256 dari tiga data utama.</span></div></li>
              <li><span class="step">4</span><div><strong>Tolak duplikat</strong><span>Batch dengan ID sama tidak dapat didaftarkan ulang.</span></div></li>
              <li><span class="step">5</span><div><strong>Simpan dan jadikan pabrik pemegang</strong><span>currentHolder diisi alamat pengirim.</span></div></li>
            </ol>
          </div>
        </div>
      </div>`;

    const g = sets();
    async function preview() {
      try {
        const id = await DT.computeBatchId(g.val("rNie").trim(), g.val("rBatch").trim(), g.val("rSerial").trim(), DT.activeChainId());
        document.getElementById("pBatchId").value = id;
        const link = document.getElementById("btnOpenVerify");
        link.href = "verifikasi.html?id=" + id;
        return id;
      } catch (e) {
        DT.toast(DT.txError(e), "error");
        return null;
      }
    }
    document.getElementById("btnPreview").addEventListener("click", preview);
    document.getElementById("btnCopyId").addEventListener("click", () => {
      const v = document.getElementById("pBatchId").value;
      if (v) copyText(v); else DT.toast("Hitung Batch ID lebih dulu.", "warn");
    });

    document.getElementById("fBatch").addEventListener("submit", async (e) => {
      e.preventDefault();
      const mark = (id, bad) => document.getElementById(id).parentElement.classList.toggle("invalid", bad);
      const nie = g.val("rNie").trim(), bc = g.val("rBatch").trim(), sn = g.val("rSerial").trim();
      const mfg = g.val("rMfg"), exp = g.val("rExp");
      mark("rNie", !nie); mark("rBatch", !bc); mark("rSerial", !sn);
      mark("rMfg", !mfg); mark("rExp", !exp);
      if (!nie || !bc || !sn || !mfg || !exp) return;

      const mfgUnix = DT.dateToUnix(mfg), expUnix = DT.dateToUnix(exp);
      if (expUnix <= mfgUnix) {
        document.getElementById("rExp").parentElement.classList.add("invalid");
        DT.toast("Tanggal kedaluwarsa harus setelah tanggal produksi. Kontrak akan menolak transaksi ini.", "error");
        return;
      }

      const btn = document.getElementById("btnRegBatch");
      btn.disabled = true;
      const original = btn.textContent;
      btn.innerHTML = '<span class="spinner"></span> Menunggu wallet…';
      try {
        await DT.writeTx("registerBatch", [nie, bc, mfgUnix, expUnix, sn], { successTitle: "Batch terdaftar" });
        const id = await DT.computeBatchId(nie, bc, sn, DT.activeChainId());
        document.getElementById("pBatchId").value = id;
        const verifyEl = document.createElement("div");
        verifyEl.innerHTML = 'Batch ID: <span class="mono">' + id + '</span> · <a href="verifikasi.html?id=' + id + '" target="_blank" rel="noopener">verifikasi</a>';
        DT.toast(verifyEl, "success", "Batch berhasil dicatat pada ledger");
        await scanChain();
        updateMetrics();
      } catch (err) {
        DT.toast(DT.txError(err), "error", "Registrasi batch gagal");
      } finally {
        btn.disabled = false; btn.textContent = original;
      }
    });
    preview();
  }

  /* ------------------------------------------------------- TAB: transfer --- */
  async function renderTransferTab(root) {
    const options = MY_BATCHES.map((b) => `<option value="${b.batchId}">${DT.escapeHtml(b.batchCode)} · ${DT.escapeHtml(b.serialNumber)} · ${DT.shorten(b.currentHolder, 8, 6)}</option>`).join("");
    root.innerHTML = `
      <div class="grid split">
        <div class="panel">
          <div class="panel-head">
            <div>
              <h3>Pindahkan custody batch</h3>
              <p class="sub">Memanggil <span class="mono">transferCustody()</span>. Pengirim harus pemegang batch saat ini.</p>
            </div>
          </div>
          <form id="fTransfer" novalidate>
            <div class="field">
              <label for="tChoose">Pilih dari batch yang Anda kuasai</label>
              <select id="tChoose"><option value="">(pilih batch)</option>${options}</select>
              <span class="hint">Atau tempel Batch ID langsung pada kolom di bawah.</span>
            </div>
            <div class="field">
              <label for="tBatchId">Batch ID</label>
              <input id="tBatchId" class="mono" placeholder="0x…" required>
              <span class="err">Batch ID wajib diisi dengan format 0x diikuti 64 karakter heksadesimal.</span>
            </div>
            <div class="field">
              <label for="tTo">Alamat wallet penerima</label>
              <input id="tTo" class="mono" placeholder="0x…" required>
              <span class="hint" id="toRoleHint">Penerima harus sudah terdaftar sebagai aktor pada kontrak.</span>
              <span class="err">Alamat penerima tidak valid.</span>
            </div>
            <div class="notice tiny">
              Kontrak menolak transaksi jika batch berstatus recall, Anda bukan pemegang saat ini,
              atau alamat penerima belum memiliki role.
            </div>
            <div class="row mt-2">
              <button class="btn primary" type="submit" id="btnTransfer">Kirim transaksi transfer</button>
              <a class="btn ghost" href="dashboard.html" onclick="location.reload();return false;">Muat ulang data</a>
            </div>
          </form>
        </div>

        <div class="stack">
          <div id="tPreview"></div>
          <div class="panel">
            <h3>Aturan yang diperiksa kontrak</h3>
            <ul class="small muted" style="padding-left:18px;margin:0">
              <li>Batch harus ada pada ledger.</li>
              <li>Batch tidak boleh berstatus recall.</li>
              <li>Pemanggil harus pemegang batch saat ini.</li>
              <li>Penerima harus memiliki role selain None.</li>
            </ul>
          </div>
        </div>
      </div>`;

    const g = sets();
    document.getElementById("tChoose").addEventListener("change", (e) => {
      if (e.target.value) g.read("tBatchId", e.target.value);
      previewBatch();
    });

    let timer = null;
    async function previewBatch() {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const id = g.val("tBatchId").trim();
        const box = document.getElementById("tPreview");
        if (!DT.isBatchId(id)) { box.innerHTML = ""; return; }
        box.innerHTML = '<div class="panel"><h3>Memuat batch…</h3><div class="skeleton mt-2" style="width:80%"></div></div>';
        try {
          const { batch, transfers } = await DT.loadBatch(id, DT.activeChainId());
          if (!batch.exists) {
            box.innerHTML = '<div class="panel"><div class="notice danger"><strong>Batch tidak ditemukan.</strong> Periksa kembali Batch ID.</div></div>';
            return;
          }
          const isHolder = S.address && batch.currentHolder.toLowerCase() === S.address.toLowerCase();
          box.innerHTML = `
            <div class="panel">
              <div class="panel-head">
                <div><h3>Pratinjau batch</h3><p class="sub mono wrap-any">${DT.escapeHtml(id)}</p></div>
                ${statusBadge(batch)}
              </div>
              <dl class="kv mb-0">
                <dt>NIE</dt><dd>${DT.escapeHtml(batch.nie)}</dd>
                <dt>Kode batch</dt><dd>${DT.escapeHtml(batch.batchCode)}</dd>
                <dt>Pemegang saat ini</dt><dd>${addrCell(batch.currentHolder)} ${isHolder ? '<span class="badge ok">Anda</span>' : ""}</dd>
                <dt>Perpindahan tercatat</dt><dd class="mono">${transfers.length}</dd>
              </dl>
              ${!isHolder ? '<div class="notice warn mt-2">Wallet Anda bukan pemegang batch ini. Kontrak akan menolak transaksi transfer.</div>' : ""}
              ${batch.recalled ? '<div class="notice danger mt-2">Batch berstatus recall. Transfer tidak dimungkinkan.</div>' : ""}
            </div>`;
        } catch (e) {
          box.innerHTML = `<div class="panel"><div class="notice danger">${DT.escapeHtml(DT.txError(e))}</div></div>`;
        }
      }, 350);
    }
    document.getElementById("tBatchId").addEventListener("input", previewBatch);

    // periksa role penerima saat alamat diketik
    let toTimer = null;
    document.getElementById("tTo").addEventListener("input", () => {
      clearTimeout(toTimer);
      toTimer = setTimeout(async () => {
        const addr = DT.normAddr(g.val("tTo"));
        const hint = document.getElementById("toRoleHint");
        if (!DT.isAddr(addr)) { hint.textContent = "Penerima harus sudah terdaftar sebagai aktor pada kontrak."; return; }
        try {
          const c = DT.readContract();
          const r = Number(await c.roles(addr));
          hint.textContent = r === 0
            ? "Alamat ini belum terdaftar sebagai aktor. Kontrak akan menolak transaksi."
            : "Penerima terdaftar sebagai " + DT.roleLabel(r) + ".";
          hint.style.color = r === 0 ? "var(--danger)" : "var(--text-faint)";
        } catch (e) { hint.textContent = "Tidak dapat memeriksa role penerima."; }
      }, 400);
    });

    document.getElementById("fTransfer").addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = g.val("tBatchId").trim(), to = DT.normAddr(g.val("tTo"));
      document.getElementById("tBatchId").parentElement.classList.toggle("invalid", !DT.isBatchId(id));
      document.getElementById("tTo").parentElement.classList.toggle("invalid", !DT.isAddr(to));
      if (!DT.isBatchId(id) || !DT.isAddr(to)) return;

      const btn = document.getElementById("btnTransfer");
      btn.disabled = true;
      const original = btn.textContent;
      btn.innerHTML = '<span class="spinner"></span> Menunggu wallet…';
      try {
        await DT.writeTx("transferCustody", [id, to], { successTitle: "Custody berpindah" });
        const after = await DT.loadBatch(id, DT.activeChainId());
        const el = document.createElement("div");
        el.innerHTML = 'Pemegang baru: <span class="mono">' + shortAddr(after.batch.currentHolder) + "</span>";
        DT.toast(el, "success", "Batch berhasil dipindahtangankan");
        await scanChain();
        g.read("tBatchId", "");
        document.getElementById("tTo").value = "";
        previewBatch();
        updateMetrics();
      } catch (err) {
        DT.toast(DT.txError(err), "error", "Transfer gagal");
      } finally {
        btn.disabled = false; btn.textContent = original;
      }
    });
  }

  function prefillTransfer(batchId) {
    const el = document.getElementById("tBatchId");
    if (el) { el.value = batchId; el.dispatchEvent(new Event("input")); el.scrollIntoView({ block: "center" }); }
  }

  /* --------------------------------------------------------- TAB: recall --- */
  async function renderRecallTab(root) {
    const isReg = DT.isRegulator();
    root.innerHTML = `
      <div class="grid split">
        <div class="panel">
          <div class="panel-head">
            <div>
              <h3>Tandai batch sebagai recall</h3>
              <p class="sub">Memanggil <span class="mono">flagRecall()</span>. Hanya BPOM atau pabrik yang berwenang.</p>
            </div>
          </div>
          <form id="fRecall" novalidate>
            <div class="field">
              <label for="kBatchId">Batch ID</label>
              <input id="kBatchId" class="mono" placeholder="0x…" required>
              <span class="err">Batch ID wajib diisi dengan format 0x diikuti 64 karakter heksadesimal.</span>
            </div>
            <div class="field">
              <label for="kReason">Alasan recall</label>
              <textarea id="kReason" placeholder="Contoh: hasil pengujian stabilitas tidak memenuhi syarat" required></textarea>
              <span class="hint">Alasan ikut tercatat pada ledger sehingga dapat diaudit kemudian.</span>
              <span class="err">Alasan recall wajib diisi.</span>
            </div>
            <div class="notice warn tiny">
              Recall bersifat permanen pada kontrak: batch tidak dapat dikembalikan ke status normal
              dan tidak dapat dipindahtangankan lagi.
            </div>
            <div class="row mt-2">
              <button class="btn danger" type="submit" id="btnRecall">Kirim transaksi recall</button>
            </div>
          </form>
        </div>
        <div id="kPreview"></div>
      </div>`;

    const g = sets();
    let timer = null;
    async function preview() {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const id = g.val("kBatchId").trim();
        const box = document.getElementById("kPreview");
        if (!DT.isBatchId(id)) { box.innerHTML = ""; return; }
        box.innerHTML = '<div class="panel"><h3>Memuat batch…</h3><div class="skeleton mt-2" style="width:75%"></div></div>';
        try {
          const { batch, transfers } = await DT.loadBatch(id, DT.activeChainId());
          if (!batch.exists) {
            box.innerHTML = '<div class="panel"><div class="notice danger"><strong>Batch tidak ditemukan.</strong> Recall tidak dapat dijalankan.</div></div>';
            return;
          }
          const alasanTolak = [];
          if (batch.recalled) alasanTolak.push("Batch sudah berstatus recall sebelumnya.");
          if (!isReg && batch.manufacturer.toLowerCase() !== (S.address || "").toLowerCase())
            alasanTolak.push("Batch ini didaftarkan oleh pabrik lain, wallet Anda tidak berwenang.");
          box.innerHTML = `
            <div class="panel">
              <div class="panel-head">
                <div><h3>Pratinjau batch</h3><p class="sub mono wrap-any">${DT.escapeHtml(id)}</p></div>
                ${statusBadge(batch)}
              </div>
              <dl class="kv mb-0">
                <dt>NIE</dt><dd>${DT.escapeHtml(batch.nie)}</dd>
                <dt>Kode batch</dt><dd>${DT.escapeHtml(batch.batchCode)}</dd>
                <dt>Didaftarkan oleh</dt><dd>${addrCell(batch.manufacturer)}</dd>
                <dt>Pemegang saat ini</dt><dd>${addrCell(batch.currentHolder)}</dd>
                <dt>Perpindahan tercatat</dt><dd class="mono">${transfers.length}</dd>
              </dl>
              ${alasanTolak.length ? '<div class="notice danger mt-2"><strong>Perhatian:</strong> ' + alasanTolak.join(" ") + "</div>" : '<div class="notice ok mt-2">Batch valid untuk diberi status recall oleh wallet ini.</div>'}
            </div>`;
        } catch (e) {
          box.innerHTML = `<div class="panel"><div class="notice danger">${DT.escapeHtml(DT.txError(e))}</div></div>`;
        }
      }, 350);
    }
    document.getElementById("kBatchId").addEventListener("input", preview);

    document.getElementById("fRecall").addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = g.val("kBatchId").trim(), reason = g.val("kReason").trim();
      document.getElementById("kBatchId").parentElement.classList.toggle("invalid", !DT.isBatchId(id));
      document.getElementById("kReason").parentElement.classList.toggle("invalid", !reason);
      if (!DT.isBatchId(id) || !reason) return;

      const ok = await DT.modal({
        title: "Konfirmasi recall",
        bodyHtml: `<p class="small">Batch berikut akan ditandai recall secara permanen pada ledger:</p>
          <p class="mono wrap-any small">${DT.escapeHtml(id)}</p>
          <p class="small muted mb-0">Alasan: ${DT.escapeHtml(reason)}</p>`,
        confirmText: "Ya, tandai recall",
        danger: true,
      });
      if (!ok) return;

      const btn = document.getElementById("btnRecall");
      btn.disabled = true;
      const original = btn.textContent;
      btn.innerHTML = '<span class="spinner"></span> Menunggu wallet…';
      try {
        await DT.writeTx("flagRecall", [id, reason], { successTitle: "Batch ditandai recall" });
        await scanChain();
        updateMetrics();
        preview();
      } catch (err) {
        DT.toast(DT.txError(err), "error", "Recall gagal");
      } finally {
        btn.disabled = false; btn.textContent = original;
      }
    });
  }

  function prefillRecall(batchId) {
    const el = document.getElementById("kBatchId");
    if (el) { el.value = batchId; el.dispatchEvent(new Event("input")); el.scrollIntoView({ block: "center" }); }
  }

  /* ---------------------------------------------------------- TAB: aktor --- */
  async function renderAktorTab(root) {
    const isReg = DT.isRegulator();
    root.innerHTML = `
      ${isReg ? `
      <div class="panel mb-2">
        <div class="panel-head">
          <div>
            <h3>Daftarkan aktor rantai pasok</h3>
            <p class="sub">Memanggil <span class="mono">registerActor()</span>. Hanya wallet regulator yang dapat mengirim transaksi ini.</p>
          </div>
        </div>
        <form id="fActor" novalidate>
          <div class="grid cols-2">
            <div class="field">
              <label for="aAddr">Alamat wallet aktor</label>
              <input id="aAddr" class="mono" placeholder="0x…" required>
              <span class="err">Alamat wallet tidak valid.</span>
            </div>
            <div class="field">
              <label for="aRole">Role yang diberikan</label>
              <select id="aRole">
                <option value="1">Pabrik (Manufacturer)</option>
                <option value="2">Distributor</option>
                <option value="3">Apotek / Rumah Sakit (Pharmacy)</option>
                <option value="4">BPOM (Regulator)</option>
              </select>
              <span class="hint">Role Regulator memberi kewenangan mendaftarkan aktor lain dan melakukan recall.</span>
            </div>
          </div>
          <div class="notice tiny" id="aCurrent">Masukkan alamat wallet untuk melihat role yang tercatat saat ini.</div>
          <div class="row mt-2">
            <button class="btn primary" type="submit" id="btnRegActor">Kirim transaksi pendaftaran</button>
          </div>
        </form>
      </div>` : `
      <div class="notice mb-2">
        <strong>Hanya regulator yang dapat mendaftarkan aktor.</strong>
        Tabel di bawah menampilkan aktor yang sudah tercatat pada kontrak, dibaca dari event
        <span class="mono">ActorRegistered</span>.
      </div>`}

      <div class="panel">
        <div class="panel-head">
          <div>
            <h3>Aktor terdaftar</h3>
            <p class="sub">Sumber: event <span class="mono">ActorRegistered</span> dari blok deployment sampai blok terakhir.</p>
          </div>
          <button class="btn sm ghost" id="btnRescanActors">Pindai ulang</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Aktor</th><th>Role</th><th>Blok</th><th>Alamat</th><th>Aksi</th></tr></thead>
            <tbody id="actorRows"></tbody>
          </table>
        </div>
      </div>`;

    const rows = document.getElementById("actorRows");
    function paintActors() {
      if (ACTORS.length === 0) {
        rows.innerHTML = '<tr><td colspan="5"><div class="empty"><strong>Belum ada aktor selain regulator</strong>Panggil registerActor() untuk menambahkan pabrik, distributor, atau apotek.</div></td></tr>';
        return;
      }
      rows.innerHTML = ACTORS.map((a) => `
        <tr>
          <td>${DT.escapeHtml(S.address && a.actor.toLowerCase() === S.address.toLowerCase() ? "Wallet ini" : "Aktor " + DT.shorten(a.actor, 6, 4))}</td>
          <td><span class="badge ${a.role === 4 ? "accent" : a.role === 0 ? "neutral" : "ok"}">${DT.roleLabel(a.role)}</span></td>
          <td class="mono">${a.block}</td>
          <td class="mono wrap-any">${DT.escapeHtml(a.actor)}</td>
          <td class="nowrap">
            <button class="btn sm ghost" data-copy="${DT.escapeHtml(a.actor)}">Salin</button>
            ${isReg ? `<button class="btn sm ghost" data-pick="${DT.escapeHtml(a.actor)}">Ubah role</button>` : ""}
          </td>
        </tr>`).join("");
      rows.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", () => copyText(b.dataset.copy)));
      rows.querySelectorAll("[data-pick]").forEach((b) => b.addEventListener("click", () => {
        const f = document.getElementById("aAddr");
        if (f) { f.value = b.dataset.pick; f.dispatchEvent(new Event("input")); f.scrollIntoView({ block: "center" }); }
      }));
    }
    paintActors();

    const btnScan = document.getElementById("btnRescanActors");
    if (btnScan) btnScan.addEventListener("click", async () => {
      btnScan.disabled = true; btnScan.textContent = "Memindai…";
      await scanChain(); paintActors(); updateMetrics();
      btnScan.disabled = false; btnScan.textContent = "Pindai ulang";
    });

    if (!isReg) return;

    const g = sets();
    let t = null;
    document.getElementById("aAddr").addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(async () => {
        const addr = DT.normAddr(g.val("aAddr"));
        const box = document.getElementById("aCurrent");
        if (!DT.isAddr(addr)) { box.textContent = "Masukkan alamat wallet untuk melihat role yang tercatat saat ini."; return; }
        try {
          const c = DT.readContract();
          const r = Number(await c.roles(addr));
          box.innerHTML = r === 0
            ? "Alamat ini <strong>belum memiliki role</strong>. Pendaftaran dapat dilakukan."
            : "Alamat ini sudah terdaftar sebagai <strong>" + DT.roleLabel(r) + "</strong>. Transaksi baru akan menimpa role tersebut.";
        } catch (e) { box.textContent = "Tidak dapat membaca role dari kontrak."; }
      }, 400);
    });

    document.getElementById("fActor").addEventListener("submit", async (e) => {
      e.preventDefault();
      const addr = DT.normAddr(g.val("aAddr"));
      const role = Number(document.getElementById("aRole").value);
      document.getElementById("aAddr").parentElement.classList.toggle("invalid", !DT.isAddr(addr));
      if (!DT.isAddr(addr)) return;

      const ok = await DT.modal({
        title: "Konfirmasi pendaftaran aktor",
        bodyHtml: `<p class="small">Memberikan role <strong>${DT.roleLabel(role)}</strong> kepada:</p>
          <p class="mono wrap-any small">${DT.escapeHtml(addr)}</p>
          <p class="small muted mb-0">Role disimpan pada smart contract dan langsung berlaku setelah transaksi masuk ke blok.</p>`,
        confirmText: "Kirim transaksi",
      });
      if (!ok) return;

      const btn = document.getElementById("btnRegActor");
      btn.disabled = true;
      const original = btn.textContent;
      btn.innerHTML = '<span class="spinner"></span> Menunggu wallet…';
      try {
        await DT.writeTx("registerActor", [addr, role], { successTitle: "Aktor terdaftar" });
        await scanChain();
        paintActors(); updateMetrics();
      } catch (err) {
        DT.toast(DT.txError(err), "error", "Pendaftaran aktor gagal");
      } finally {
        btn.disabled = false; btn.textContent = original;
      }
    });
  }

  /* ---------------------------------------------------- TAB: permintaan --- */
  async function renderPermintaanTab(root) {
    root.innerHTML = `
      <div class="panel">
        <div class="panel-head">
          <div>
            <h3>Permintaan pendaftaran aktor</h3>
            <p class="sub">
              Daftar ini <strong>bukan</strong> data blockchain. Permintaan disimpan sementara pada
              <span class="mono">localStorage</span> peramban, sebagai catatan bagi regulator.
              Pendaftaran resmi tetap dilakukan melalui transaksi <span class="mono">registerActor()</span>.
            </p>
          </div>
          <button class="btn sm ghost" id="btnReloadReq">Muat ulang</button>
        </div>
        <div class="notice tiny mb-2">
          Keterbatasan yang perlu diketahui saat demo: permintaan hanya terlihat pada peramban tempat
          pengajuan dilakukan. Untuk membuktikan pendaftaran lintas pengguna, gunakan alamat wallet yang
          dikirim calon aktor lalu jalankan transaksi dari wallet regulator.
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Instansi</th><th>Role yang diminta</th><th>Alamat wallet</th><th>Diajukan</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody id="reqRows"></tbody>
          </table>
        </div>
      </div>`;

    function paint() {
      const list = DT.readRequests().slice().reverse();
      const rows = document.getElementById("reqRows");
      if (list.length === 0) {
        rows.innerHTML = '<tr><td colspan="6"><div class="empty"><strong>Belum ada permintaan</strong>Calon aktor dapat mengajukan melalui halaman Pendaftaran Aktor.</div></td></tr>';
        return;
      }
      rows.innerHTML = list.map((r, i) => `
        <tr>
          <td>${DT.escapeHtml(r.institution || "-")}</td>
          <td><span class="badge neutral">${DT.roleLabel(r.role)}</span></td>
          <td class="mono wrap-any">${DT.escapeHtml(r.address)}</td>
          <td class="small">${DT.escapeHtml(new Date(r.createdAt).toLocaleString("id-ID"))}</td>
          <td>${r.status === "terdaftar" ? '<span class="badge ok">Terdaftar</span>' : '<span class="badge warn">Menunggu</span>'}</td>
          <td class="nowrap">
            <button class="btn sm ghost" data-copy="${DT.escapeHtml(r.address)}">Salin</button>
            <button class="btn sm primary" data-register="${DT.escapeHtml(r.address)}" data-role="${r.role}">Daftarkan</button>
          </td>
        </tr>`).join("");

      rows.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", () => copyText(b.dataset.copy)));
      rows.querySelectorAll("[data-register]").forEach((b) => b.addEventListener("click", async () => {
        const addr = DT.normAddr(b.dataset.register), role = Number(b.dataset.role);
        const ok = await DT.modal({
          title: "Konfirmasi pendaftaran aktor",
          bodyHtml: `<p class="small">Memberikan role <strong>${DT.roleLabel(role)}</strong> kepada:</p><p class="mono wrap-any small">${DT.escapeHtml(addr)}</p>`,
          confirmText: "Kirim transaksi",
        });
        if (!ok) return;
        b.disabled = true;
        try {
          await DT.writeTx("registerActor", [addr, role], { successTitle: "Aktor terdaftar" });
          DT.updateRequest(addr, { status: "terdaftar", registeredAt: new Date().toISOString() });
          await scanChain();
          paint(); updateMetrics();
        } catch (err) {
          DT.toast(DT.txError(err), "error", "Pendaftaran aktor gagal");
        } finally { b.disabled = false; }
      }));
    }
    document.getElementById("btnReloadReq").addEventListener("click", paint);
    paint();
  }

  /* ----------------------------------------------------------- TAB: log --- */
  async function renderLogTab(root) {
    root.innerHTML = `
      <div class="panel">
        <div class="panel-head">
          <div>
            <h3>Log aktivitas kontrak</h3>
            <p class="sub">Rangkaian event terakhir dari kontrak DrugTraceability. Tautan explorer hanya tersedia pada jaringan publik.</p>
          </div>
          <button class="btn sm ghost" id="btnReloadLog">Muat ulang</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Blok</th><th>Event</th><th>Rincian</th><th>Transaksi</th></tr></thead>
            <tbody id="logRows"><tr><td colspan="4"><div class="empty"><strong>Memuat event…</strong></div></td></tr></tbody>
          </table>
        </div>
      </div>`;

    async function paint() {
      const rows = document.getElementById("logRows");
      try {
        const c = DT.readContract();
        const from = scanRange();
        const [regs, xfers, recalls, actors] = await Promise.all([
          c.queryFilter(c.filters.BatchRegistered(), from, "latest"),
          c.queryFilter(c.filters.CustodyTransferred(), from, "latest"),
          c.queryFilter(c.filters.BatchRecalled(), from, "latest"),
          c.queryFilter(c.filters.ActorRegistered(), from, "latest"),
        ]);
        const all = [
          ...regs.map((e) => ({ block: e.blockNumber, name: "BatchRegistered", detail: `${e.args.nie} · ${e.args.batchCode}`, tx: e.transactionHash })),
          ...xfers.map((e) => ({ block: e.blockNumber, name: "CustodyTransferred", detail: `${DT.shorten(e.args[1], 8, 6)} ke ${DT.shorten(e.args[2], 8, 6)}`, tx: e.transactionHash })),
          ...recalls.map((e) => ({ block: e.blockNumber, name: "BatchRecalled", detail: DT.escapeHtml(e.args.reason), tx: e.transactionHash })),
          ...actors.map((e) => ({ block: e.blockNumber, name: "ActorRegistered", detail: `${DT.roleLabel(Number(e.args.role))} · ${DT.shorten(e.args.actor, 8, 6)}`, tx: e.transactionHash })),
        ].sort((a, b) => b.block - a.block).slice(0, 40);

        if (all.length === 0) {
          rows.innerHTML = '<tr><td colspan="4"><div class="empty"><strong>Belum ada event</strong>Belum satu pun transaksi tercatat pada kontrak ini.</div></td></tr>';
          return;
        }
        rows.innerHTML = all.map((e) => {
          const link = DT.explorerTx(e.tx);
          return `<tr>
            <td class="mono">${e.block}</td>
            <td><span class="badge ${e.name === "BatchRecalled" ? "danger" : e.name === "ActorRegistered" ? "accent" : "neutral"}">${e.name}</span></td>
            <td class="small">${e.detail}</td>
            <td class="mono">${link ? `<a href="${link}" target="_blank" rel="noopener">${DT.shorten(e.tx, 8, 6)}</a>` : DT.shorten(e.tx, 8, 6)}</td>
          </tr>`;
        }).join("");
      } catch (e) {
        rows.innerHTML = `<tr><td colspan="4"><div class="notice danger">${DT.escapeHtml(DT.txError(e))}</div></td></tr>`;
      }
    }
    document.getElementById("btnReloadLog").addEventListener("click", paint);
    paint();
  }

  /* ---------------------------------------------------------------- init --- */
  DT.onChange(async () => {
    if (S.address && DT.contractConfigFor(S.chainId)) {
      await scanChain();
    }
    render();
  });

  (async function init() {
    DT.boot("dash");
    if (S.address && DT.contractConfigFor(S.chainId)) await scanChain();
    await render();
  })();
})();

/* ==========================================================================
   DrugTraceability - Ruang Kerja
   Panel berbeda menurut peran yang dibaca dari smart contract.
   Setiap aksi mengirim transaksi nyata lewat wallet pengguna.
   ========================================================================== */

(function () {
  const S = DT.state;
  const ROLE = DT.ROLE;

  let MY = [];          // batch terkait peran (milik pabrik / yang dipegang)
  let ALL = [];         // seluruh batch di jaringan
  let ACTORS = [];      // aktor terdaftar dari event
  let SCAN_ERR = null;

  const gate = document.getElementById("gate");
  const app = document.getElementById("app");
  const banner = document.getElementById("roleBanner");
  const tabsEl = document.getElementById("tabs");
  const bodyEl = document.getElementById("tabBody");

  /* --------------------------------------------------------------- util --- */
  const A = (a) => `<span class="mono" title="${DT.escapeHtml(a)}">${DT.shorten(a, 8, 6)}</span>`;
  const seal = (b) => {
    const s = DT.batchStatus(b);
    return `<span class="seal ${s.cls}"><i></i>${s.label}</span>`;
  };

  function cfg() { return DT.contractConfigFor(DT.activeChainId()); }
  function fromBlock() { const c = cfg(); return (c && typeof c.deployBlock === "number") ? c.deployBlock : 0; }

  async function copyText(t) {
    try {
      await navigator.clipboard.writeText(t);
      DT.toast("Alamat disalin ke papan klip.", "success");
    } catch (e) {
      DT.toast("Gagal menyalin otomatis. Salin manual: " + t, "warn");
    }
  }

  /* ------------------------------------------------------------- pemindaian --- */
  async function scan() {
    SCAN_ERR = null;
    try {
      const c = DT.readContract();
      const from = fromBlock();
      const [regs, xfers, actorEvs] = await Promise.all([
        c.queryFilter(c.filters.BatchRegistered(), from, "latest"),
        c.queryFilter(c.filters.CustodyTransferred(), from, "latest"),
        c.queryFilter(c.filters.ActorRegistered(), from, "latest"),
      ]);

      const ids = [...new Set(regs.map((e) => e.args.batchId))];
      const loaded = await Promise.all(
        ids.map((id) => DT.loadBatch(id, DT.activeChainId(), { blocks: false }).then((d) => d.batch).catch(() => null))
      );
      ALL = loaded.filter(Boolean).sort((a, b) => Number(b.manufactureDate - a.manufactureDate));

      const xcount = {};
      xfers.forEach((e) => { xcount[e.args.batchId] = (xcount[e.args.batchId] || 0) + 1; });
      ALL.forEach((b) => { b.txCount = xcount[b.batchId] || 0; });

      ACTORS = [];
      const seen = new Set();
      actorEvs.forEach((e) => {
        const k = e.args.actor.toLowerCase();
        if (seen.has(k)) return;
        seen.add(k);
        ACTORS.push({ actor: e.args.actor, role: Number(e.args.role), block: e.blockNumber });
      });

      const me = (S.address || "").toLowerCase();
      MY = ALL.filter((b) => DT.isManufacturer()
        ? b.manufacturer.toLowerCase() === me
        : b.currentHolder.toLowerCase() === me);
    } catch (e) {
      SCAN_ERR = DT.txError(e);
      console.warn("Pemindaian event gagal:", e);
    }
  }

  /* ------------------------------------------------------------------ gate --- */
  function renderGate() {
    if (!DT.hasWallet()) {
      gate.innerHTML = `<div class="sheet">
        <div class="sheet-head"><b>Wallet tidak terdeteksi</b></div>
        <div class="sheet-body">
          <p class="muted">Ruang kerja memerlukan wallet untuk menandatangani transaksi. Pasang
             ekstensi MetaMask pada peramban, lalu muat ulang halaman ini.</p>
          <p class="small muted">Halaman Periksa Batch tetap terbuka tanpa wallet karena hanya
             membaca data.</p>
          <a class="btn ghost" href="verifikasi.html">Buka Periksa Batch</a>
        </div></div>`;
      return;
    }
    const ids = DT.configuredChainIds();
    const n = ids.length === 0
      ? `<div class="note warn"><b>Kontrak belum dikonfigurasi</b>
           <p>Jalankan <span class="mono">npm run deploy:local</span> lebih dahulu.</p></div>`
      : `<div class="note"><b>Kontrak tujuan</b>
           <p><span class="mono wrapany">${DT.contractConfigFor(ids[0]).contractAddress}</span>
           pada ${DT.NETWORK_LABEL[ids[0]] || "chainId " + ids[0]}.</p></div>`;

    gate.innerHTML = `<div class="sheet">
      <div class="sheet-head"><b>Hubungkan wallet untuk masuk</b></div>
      <div class="sheet-body">
        <p class="muted">Wallet adalah identitas alamat pada blockchain. Setelah terhubung, peran
           Anda dibaca dari kontrak dan menu yang muncul mengikuti peran itu.</p>
        <div class="row mt2">
          <button class="btn solid" id="btnConnect">Hubungkan MetaMask</button>
          <a class="btn ghost" href="verifikasi.html">Periksa batch tanpa wallet</a>
        </div>
        <div class="mt3">${n}</div>
      </div></div>`;
    document.getElementById("btnConnect").addEventListener("click", async () => {
      try { await DT.connectWallet(); } catch (e) { DT.toast(DT.txError(e), "error"); }
    });
  }

  /* ------------------------------------------------------------------ render --- */
  async function render() {
    if (!S.address) {
      app.classList.add("hidden");
      gate.classList.remove("hidden");
      renderGate();
      return;
    }
    gate.classList.add("hidden");
    app.classList.remove("hidden");

    const cfgOk = !!DT.contractConfigFor(S.chainId);
    if (!cfgOk) {
      banner.innerHTML = `<div class="note warn">
        <b>Jaringan wallet belum dikonfigurasi</b>
        <p>Wallet terhubung ke chainId ${S.chainId}, sedangkan kontrak belum memiliki alamat pada
           jaringan itu, sehingga transaksi tidak dapat dikirim.</p>
        <div class="row mt2">
          <button class="btn solid" id="btnSwitch">Pindah ke jaringan kontrak</button>
          <button class="btn ghost" id="btnRetry">Periksa ulang peran</button>
        </div></div>`;
      document.getElementById("btnSwitch").addEventListener("click", async () => {
        try { await DT.switchToConfiguredChain(); } catch (e) { DT.toast(DT.txError(e), "error"); }
      });
      document.getElementById("btnRetry").addEventListener("click", async () => {
        await DT.refreshRole();
        DT.toast("Peran dibaca ulang dari kontrak.", "info");
      });
      tabsEl.innerHTML = "";
      bodyEl.innerHTML = `<div class="sheet"><div class="sheet-body"><div class="empty">
        <b>Transaksi dinonaktifkan</b><span>Pindahkan wallet ke jaringan tempat kontrak di-deploy.</span>
        </div></div></div>`;
      return;
    }

    if (S.role === -1) {
      banner.innerHTML = `<div class="note bad"><b>Gagal membaca peran</b>
        <p>Periksa koneksi jaringan dan alamat pada <span class="mono">web/contract-config.js</span>.</p></div>`;
      tabsEl.innerHTML = "";
      bodyEl.innerHTML = "";
      return;
    }

    if (Number(S.role) === ROLE.NONE) {
      banner.innerHTML = `<div class="sheet">
        <div class="sheet-head"><b>Wallet ini belum memiliki peran</b></div>
        <div class="sheet-body">
          <p class="muted">Kontrak hanya mengizinkan BPOM memanggil
             <span class="mono">registerActor()</span>, jadi peran tidak dapat dipilih sendiri.
             Ajukan permintaan, lalu BPOM yang menjalankan transaksinya.</p>
          <dl class="facts mt3">
            <dt>Alamat wallet</dt><dd>${DT.escapeHtml(S.address)}</dd>
            <dt>Jaringan</dt><dd>${DT.NETWORK_LABEL[S.chainId] || "chainId " + S.chainId}</dd>
            <dt>Peran</dt><dd><span class="seal warn"><i></i>belum terdaftar</span></dd>
          </dl>
          <div class="row mt3">
            <a class="btn solid" href="daftar-aktor.html">Ajukan peran</a>
            <a class="btn ghost" href="verifikasi.html">Periksa batch sebagai pengunjung</a>
          </div>
        </div></div>`;
      tabsEl.innerHTML = "";
      bodyEl.innerHTML = "";
      return;
    }

    renderBanner();
    await renderTabs();
  }

  function renderBanner() {
    const copy = {
      1: ["Pabrik", "Mencatat batch obat dan menyerahkan custody pertama."],
      2: ["Distributor", "Menerima dan meneruskan custody batch yang menjadi tanggung jawabnya."],
      3: ["Apotek / Rumah Sakit", "Menerima batch pada tahap akhir distribusi dan memeriksa statusnya."],
      4: ["BPOM", "Mendaftarkan aktor rantai pasok dan menarik batch bermasalah."],
    }[Number(S.role)] || ["Aktor", ""];

    banner.innerHTML = `<div class="sheet">
      <div class="sheet-head">
        <b>Ruang kerja</b>
        <span class="note">${DT.shorten(S.address, 10, 8)} · ${DT.NETWORK_LABEL[S.chainId] || "chainId " + S.chainId}</span>
      </div>
      <div class="sheet-body">
        <div class="row between" style="align-items:flex-start;gap:24px">
          <div>
            <h1 style="font-size:1.65rem">${copy[0]}</h1>
            <p class="small muted mt1 mb0" style="max-width:52ch">${copy[1]}</p>
          </div>
          <span class="seal ok" style="padding:6px 11px">${DT.roleLong(S.role)}</span>
        </div>
      </div>
      <dl class="tally" style="border-bottom:0">
        <div><dt>${DT.isManufacturer() ? "Batch saya" : "Batch dipegang"}</dt><dd id="mMine">—</dd></div>
        <div><dt>Total batch</dt><dd id="mAll">—</dd></div>
        <div><dt>Recall</dt><dd id="mRec" style="color:var(--stamp)">—</dd></div>
        <div><dt>Aktor terdaftar</dt><dd id="mActor">—</dd></div>
      </dl>
    </div>`;
    updateMetrics();
  }

  function updateMetrics() {
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    set("mMine", MY.length);
    set("mAll", ALL.length);
    set("mRec", ALL.filter((b) => b.recalled).length);
    set("mActor", ACTORS.length);
  }

  /* ------------------------------------------------------------------- tabs --- */
  const TABS = [
    { id: "batch", label: () => (DT.isManufacturer() ? "Batch saya" : "Batch dipegang"), roles: [1, 2, 3], render: tabBatch },
    { id: "catat", label: () => "Catat batch", roles: [1], render: tabCatat },
    { id: "pindah", label: () => "Pindahkan custody", roles: [1, 2, 3], render: tabPindah },
    { id: "tarik", label: () => "Tarik batch", roles: [1, 4], render: tabTarik },
    { id: "aktor", label: () => "Aktor", roles: [1, 2, 3, 4], render: tabAktor },
    { id: "ajuan", label: () => "Permintaan peran", roles: [4], render: tabAjuan },
    { id: "log", label: () => "Log blok", roles: [1, 2, 3, 4], render: tabLog },
  ];

  let current = null;

  async function renderTabs() {
    const mine = TABS.filter((t) => t.roles.includes(Number(S.role)));
    if (mine.length === 0) return;
    if (!current || !mine.some((t) => t.id === current)) current = mine[0].id;

    tabsEl.innerHTML = mine.map((t) =>
      `<button class="btn sm ${t.id === current ? "solid" : "ghost"}" data-tab="${t.id}" role="tab"
        aria-selected="${t.id === current}">${DT.escapeHtml(t.label())}</button>`).join("");
    tabsEl.querySelectorAll("[data-tab]").forEach((b) => {
      b.addEventListener("click", async () => { current = b.dataset.tab; await renderTabs(); });
    });

    const tab = mine.find((t) => t.id === current);
    bodyEl.innerHTML = "";
    await tab.render(bodyEl);
    updateMetrics();
  }

  function errSheet(msg, extra = "") {
    return `<div class="sheet"><div class="sheet-body">
      <div class="note bad"><b>Tidak dapat memuat data</b><p>${DT.escapeHtml(msg)}</p></div>
      ${extra ? `<p class="small muted mt2 mb0">${extra}</p>` : ""}
    </div></div>`;
  }

  /* ------------------------------------------------------ TAB 1: daftar batch --- */
  function rowAction(b) {
    const acts = [`<button class="btn sm ghost" data-detail="${b.batchId}">Kartu</button>`];
    if (!b.recalled) acts.push(`<button class="btn sm ghost" data-transfer="${b.batchId}">Pindah</button>`);
    if (DT.isManufacturer() && !b.recalled) acts.push(`<button class="btn sm ghost" data-recall="${b.batchId}">Tarik</button>`);
    // Baris recall tidak menyisakan ruang kosong: alasannya ditulis di tempat tombol yang hilang
    if (b.recalled) acts.push(`<span class="nolock">Tidak dapat dipindah atau ditarik</span>`);
    return `<div class="row" style="gap:6px;justify-content:flex-end;align-items:center">${acts.join("")}</div>`;
  }

  async function tabBatch(root) {
    root.innerHTML = `<div class="sheet">
      <div class="sheet-head">
        <b>${DT.isManufacturer() ? "Batch yang saya catat" : "Batch yang saya pegang"}</b>
        <span class="note">Diverifikasi ulang dengan batches()</span>
      </div>
      <div class="sheet-body" style="padding-bottom:12px">
        <div class="row between mb1" style="gap:16px;align-items:flex-end">
          <div class="field" style="max-width:100%;margin:0">
            <label for="q">Saring batch</label>
            <input id="q" placeholder="Cari kode batch atau NIE" autocomplete="off">
          </div>
          <button class="btn ghost sm" id="rescan">Pindai ulang</button>
        </div>
      </div>
      <div class="sheet-body tight tscroll">
        <table class="fixedk">
          <thead><tr>
            <th class="ckode">Kode batch</th><th class="cnie">NIE</th><th class="cstat">Status</th><th class="caddr">Pemegang kini</th>
            <th class="cdate">Kedaluwarsa</th><th class="r cnum">Perpindahan</th><th class="r cact">Tindakan</th>
          </tr></thead>
          <tbody id="rows"></tbody>
        </table>
      </div>
    </div>
    <div id="detail" class="mt2"></div>`;

    const rows = root.querySelector("#rows");

    function paint() {
      const q = (root.querySelector("#q").value || "").toLowerCase().trim();
      const list = !q ? MY : MY.filter((b) =>
        (b.nie + " " + b.batchCode + " " + b.serialNumber + " " + b.currentHolder).toLowerCase().includes(q));
      if (list.length === 0) {
        rows.innerHTML = `<tr><td colspan="7"><div class="empty">
          <b>Belum ada batch</b><span>${DT.isManufacturer()
            ? "Catat batch pada menu Catat batch."
            : "Belum ada batch yang diserahkan kepada wallet ini."}</span></div></td></tr>`;
        return;
      }
      rows.innerHTML = list.map((b) => `
        <tr${b.recalled ? ' class="flagged"' : ""}>
          <td><span class="strong">${DT.escapeHtml(b.batchCode)}</span><span class="sub">${DT.escapeHtml(b.serialNumber)}</span></td>
          <td class="mono">${DT.escapeHtml(b.nie)}</td>
          <td>${seal(b)}</td>
          <td>${A(b.currentHolder)}</td>
          <td class="mono">${DT.fmtShort(b.expiryDate)}</td>
          <td class="r mono">${b.txCount || 0}</td>
          <td>${rowAction(b)}</td>
        </tr>`).join("");

      rows.querySelectorAll("[data-detail]").forEach((x) =>
        x.addEventListener("click", () => showDetail(x.dataset.detail)));
      rows.querySelectorAll("[data-transfer]").forEach((x) =>
        x.addEventListener("click", () => { current = "pindah"; renderTabs().then(() => fillPindah(x.dataset.transfer)); }));
      rows.querySelectorAll("[data-recall]").forEach((x) =>
        x.addEventListener("click", () => { current = "tarik"; renderTabs().then(() => fillTarik(x.dataset.recall)); }));
    }

    root.querySelector("#q").addEventListener("input", paint);
    root.querySelector("#rescan").addEventListener("click", async (e) => {
      const b = e.currentTarget;
      b.disabled = true;
      b.innerHTML = '<span class="spin"></span> Memindai';
      await scan();
      paint();
      updateMetrics();
      b.disabled = false;
      b.textContent = "Pindai ulang";
      DT.toast("Data batch dimuat ulang dari kontrak.", "success");
    });
    paint();
  }

  async function showDetail(batchId) {
    const host = document.getElementById("detail");
    host.innerHTML = `<div class="sheet"><div class="sheet-body"><span class="skel" style="display:block;width:60%"></span></div></div>`;
    try {
      const { batch, transfers } = await DT.loadBatch(batchId, DT.activeChainId());
      const st = DT.batchStatus(batch);
      const used = Math.round(DT.lifeUsed(batch.manufactureDate, batch.expiryDate) * 100);
      const rows = [`<tr>
        <td class="mono nowrap">${DT.fmtShort(batch.manufactureDate)}</td>
        <td>Dicatat pabrik<span class="sub">${DT.shortten ? "" : ""}serial ${DT.escapeHtml(batch.serialNumber)}</span></td>
        <td class="r mono">1</td><td class="r">—</td>
        <td class="mono">${DT.shorten(batch.manufacturer, 8, 6)}</td><td class="r mono">—</td></tr>`];
      transfers.forEach((t, i) => rows.push(`<tr>
        <td class="mono nowrap">${DT.fmtShort(t.timestamp)}</td>
        <td>Perpindahan custody ${i + 1}<span class="sub">dari ${DT.shorten(t.from, 8, 6)}</span></td>
        <td class="r">—</td><td class="r mono">1</td>
        <td class="mono">${DT.shorten(t.to, 8, 6)}</td><td class="r mono">—</td></tr>`));

      host.innerHTML = `<div class="sheet">
        <div class="sheet-head">
          <b>Kartu batch ${DT.escapeHtml(batch.batchCode)}</b>
          <span class="note mono wrapany">${DT.escapeHtml(batchId)}</span>
        </div>
        <div class="sheet-body">
          <div class="row between" style="align-items:flex-end">
            <div>
              <h2 class="mono" style="font-size:1.6rem">${DT.escapeHtml(batch.batchCode)}</h2>
              <p class="small muted mt1 mb0">NIE ${DT.escapeHtml(batch.nie)} · serial ${DT.escapeHtml(batch.serialNumber)}</p>
            </div>
            <div style="text-align:right">
              <span class="stamp ${st.cls}">${st.stamp}</span>
              <p class="tiny muted mt1 mb0">${DT.fmtShort(batch.manufactureDate)} — ${DT.fmtShort(batch.expiryDate)}</p>
            </div>
          </div>
          <div class="gauge mt3">
            <div class="labels"><span>Masa edar terpakai ${used}%</span><span>${batch.recalled ? "dihentikan recall" : DT.daysLeft(batch.expiryDate) + " hari lagi"}</span></div>
            <div class="track"><div class="fill ${st.cls === "bad" ? "bad" : st.cls === "warn" ? "warn" : ""}" style="width:${used}%"></div>
              <div class="today" style="left:${used}%"></div></div>
            <div class="marks"><span>${DT.fmtShort(batch.manufactureDate)}</span><span>${DT.fmtShort(batch.expiryDate)}</span></div>
            <p class="marknote">Garis tegak pada bilah menandai posisi hari ini (${used}% masa edar terpakai).</p>
          </div>
          <div class="signs mt3">
            <div><b>Diisi</b><span>${DT.shorten(batch.manufacturer, 10, 8)}</span><span class="small">pabrik pendaftar</span></div>
            <div><b>Diperiksa</b><span>onlyRole</span><span class="small">modifier kontrak</span></div>
            <div><b>Disetujui</b><span>${transfers.length} perpindahan</span><span class="small">seluruhnya tercatat</span></div>
          </div>
        </div>
        <div class="sheet-head" style="border-top:1px solid var(--rule)"><b>Riwayat mutasi</b>
          <span class="note">${transfers.length} perpindahan</span></div>
        <div class="sheet-body tight tscroll">
          <table><thead><tr><th>Tanggal</th><th>Uraian</th><th class="r">Masuk</th><th class="r">Keluar</th>
            <th>Saldo pemegang</th><th class="r">Blok</th></tr></thead><tbody>${rows.join("")}</tbody></table>
        </div>
        <div class="sheet-body">
          <button class="btn ghost sm" id="closeDetail">Tutup kartu</button>
        </div>
      </div>`;
      host.querySelector("#closeDetail").addEventListener("click", () => { host.innerHTML = ""; });
    } catch (e) {
      host.innerHTML = errSheet(DT.txError(e));
    }
  }

  /* -------------------------------------------------------- TAB 2: catat batch --- */
  async function tabCatat(root) {
    const today = DT.toLocalInput(Math.floor(Date.now() / 1000));
    const next = DT.toLocalInput(Math.floor(Date.now() / 1000) + 720 * 86400);
    root.innerHTML = `<div class="cols">
      <div class="sheet">
        <div class="sheet-head"><b>Catat batch baru</b><span class="note">registerBatch()</span></div>
        <div class="sheet-body">
          <form id="fCatat" novalidate>
            <div class="field">
              <label for="rNie">NIE (nomor izin edar)</label>
              <input id="rNie" class="mono" value="DKI123456789" required>
              <span class="hint">Ikuti penulisan pada kemasan.</span>
              <span class="err">NIE wajib diisi.</span>
            </div>
            <div class="duo">
              <div class="field">
                <label for="rBatch">Kode batch</label>
                <input id="rBatch" class="mono" value="PARA-2026-003" required>
                <span class="err">Kode batch wajib diisi.</span>
              </div>
              <div class="field">
                <label for="rSerial">Nomor serial</label>
                <input id="rSerial" class="mono" value="SN-PR-0003" required>
                <span class="err">Nomor serial wajib diisi.</span>
              </div>
            </div>
            <div class="duo">
              <div class="field">
                <label for="rMfg">Tanggal produksi</label>
                <input type="date" id="rMfg" value="${today}" required>
                <span class="err">Tanggal produksi wajib diisi.</span>
              </div>
              <div class="field">
                <label for="rExp">Tanggal kedaluwarsa</label>
                <input type="date" id="rExp" value="${next}" required>
                <span class="hint">Kontrak menolak tanggal yang tidak setelah produksi.</span>
                <span class="err">Tanggal kedaluwarsa wajib diisi.</span>
              </div>
            </div>
            <div class="field">
              <label for="rPreview">Batch ID hasil hitungan kontrak</label>
              <input id="rPreview" class="mono" readonly placeholder="Dihitung dari ketiga data di atas">
            </div>
            <div class="row">
              <button class="btn solid" type="submit" id="btnCatat">Kirim transaksi pencatatan</button>
              <button class="btn ghost" type="button" id="btnCopy">Salin Batch ID</button>
            </div>
          </form>
        </div>
      </div>

      <aside class="side">
        <div class="head"><b>Yang diperiksa kontrak</b></div>
        <div class="body">
          <ol class="track-list">
            <li class="done"><span class="t">Peran pemanggil</span><span class="m">onlyRole(Manufacturer)</span></li>
            <li class="done"><span class="t">Urutan tanggal</span><span class="m">kedaluwarsa harus setelah produksi</span></li>
            <li class="done"><span class="t">Batch belum ada</span><span class="m">kombinasi NIE, batch, serial unik</span></li>
            <li><span class="t">Pabrik jadi pemegang pertama</span><span class="m">currentHolder diisi alamat pengirim</span></li>
          </ol>
          <div class="note">
            <b>Kombinasi yang sama ditolak</b>
            <p>Mencatat ulang NIE + kode batch + serial yang sudah ada akan ditolak kontrak,
               bukan ditimpa.</p>
          </div>
        </div>
      </aside>
    </div>`;

    const v = (id) => document.getElementById(id).value;
    const mark = (el, bad) => el.closest(".field").classList.toggle("invalid", !!bad);

    let t = null;
    async function preview() {
      clearTimeout(t);
      t = setTimeout(async () => {
        const nie = v("rNie").trim(), bc = v("rBatch").trim(), sn = v("rSerial").trim();
        if (!nie || !bc || !sn) { document.getElementById("rPreview").value = ""; return; }
        try {
          document.getElementById("rPreview").value = await DT.computeBatchId(nie, bc, sn, DT.activeChainId());
        } catch (e) { document.getElementById("rPreview").value = ""; }
      }, 320);
    }
    ["rNie", "rBatch", "rSerial"].forEach((id) => document.getElementById(id).addEventListener("input", preview));
    preview();

    document.getElementById("btnCopy").addEventListener("click", () => {
      const val = document.getElementById("rPreview").value;
      if (val) copyText(val); else DT.toast("Hitung Batch ID lebih dulu.", "warn");
    });

    document.getElementById("fCatat").addEventListener("submit", async (e) => {
      e.preventDefault();
      const nie = v("rNie").trim(), bc = v("rBatch").trim(), sn = v("rSerial").trim();
      const mfg = v("rMfg"), exp = v("rExp");
      mark(document.getElementById("rNie"), !nie);
      mark(document.getElementById("rBatch"), !bc);
      mark(document.getElementById("rSerial"), !sn);
      mark(document.getElementById("rMfg"), !mfg);
      mark(document.getElementById("rExp"), !exp);
      if (!nie || !bc || !sn || !mfg || !exp) return;

      const a = DT.dateToUnix(mfg), b = DT.dateToUnix(exp);
      if (b <= a) {
        mark(document.getElementById("rExp"), true);
        DT.toast("Tanggal kedaluwarsa harus setelah tanggal produksi. Kontrak juga akan menolaknya.", "error");
        return;
      }

      const btn = document.getElementById("btnCatat");
      btn.disabled = true;
      const label = btn.textContent;
      btn.innerHTML = '<span class="spin"></span> Menunggu wallet…';
      try {
        await DT.writeTx("registerBatch", [nie, bc, a, b, sn], { successTitle: "Batch tercatat" });
        const id = await DT.computeBatchId(nie, bc, sn, DT.activeChainId());
        const el = document.createElement("div");
        el.innerHTML = `Batch ID <span class="mono">${id}</span> · <a href="verifikasi.html?id=${id}" target="_blank" rel="noopener">lihat kartunya</a>`;
        DT.toast(el, "success", "Batch masuk ke ledger");
        await scan();
        updateMetrics();
      } catch (err) {
        DT.toast(DT.txError(err), "error", "Pencatatan batch gagal");
      } finally {
        btn.disabled = false;
        btn.textContent = label;
      }
    });
  }

  /* ------------------------------------------------------ TAB 3: pindahkan custody --- */
  async function tabPindah(root) {
    const opts = MY.filter((b) => !b.recalled)
      .map((b) => `<option value="${b.batchId}">${DT.escapeHtml(b.batchCode)} · ${DT.escapeHtml(b.serialNumber)} · ${DT.shorten(b.currentHolder, 6, 4)}</option>`)
      .join("");
    root.innerHTML = `<div class="cols">
      <div class="sheet">
        <div class="sheet-head"><b>Pindahkan custody</b><span class="note">transferCustody()</span></div>
        <div class="sheet-body">
          <form id="fPindah" novalidate>
            <div class="field">
              <label for="tPick">Pilih dari batch yang Anda pegang</label>
              <select id="tPick"><option value="">(pilih batch)</option>${opts}</select>
              <span class="hint">Atau tempel Batch ID langsung di kolom berikut.</span>
            </div>
            <div class="field">
              <label for="tId">Batch ID</label>
              <input id="tId" class="mono" placeholder="0x…" required>
              <span class="err">Batch ID harus 0x diikuti 64 karakter heksadesimal.</span>
            </div>
            <div class="field">
              <label for="tTo">Alamat wallet penerima</label>
              <input id="tTo" class="mono" placeholder="0x…" required>
              <span class="hint" id="toHint">Penerima harus sudah terdaftar sebagai aktor pada kontrak.</span>
              <span class="err">Alamat penerima tidak valid.</span>
            </div>
            <div class="row">
              <button class="btn solid" type="submit" id="btnPindah">Kirim transaksi perpindahan</button>
            </div>
          </form>
        </div>
      </div>
      <div id="tPrev">
        <div class="sheet"><div class="sheet-head"><b>Pratinjau batch</b></div>
          <div class="sheet-body"><div class="empty"><b>Belum ada batch dipilih</b>
            <span>Pilih batch atau tempel Batch ID untuk melihat pemegang saat ini.</span></div></div></div>
      </div>
    </div>`;

    const v = (id) => document.getElementById(id).value;
    const mark = (el, bad) => el.closest(".field").classList.toggle("invalid", !!bad);

    document.getElementById("tPick").addEventListener("change", (e) => {
      if (e.target.value) {
        document.getElementById("tId").value = e.target.value;
        preview();
      }
    });

    let t1 = null;
    async function preview() {
      clearTimeout(t1);
      t1 = setTimeout(async () => {
        const id = v("tId").trim();
        const host = document.getElementById("tPrev");
        if (!DT.isBatchId(id)) {
          host.innerHTML = `<div class="sheet"><div class="sheet-head"><b>Pratinjau batch</b></div>
            <div class="sheet-body"><div class="empty"><b>Belum ada batch dipilih</b>
            <span>Pilih batch atau tempel Batch ID.</span></div></div></div>`;
          return;
        }
        host.innerHTML = `<div class="sheet"><div class="sheet-head"><b>Pratinjau batch</b></div>
          <div class="sheet-body"><span class="skel" style="display:block;width:70%"></span></div></div>`;
        try {
          const { batch, transfers } = await DT.loadBatch(id, DT.activeChainId());
          if (!batch.exists) {
            host.innerHTML = `<div class="sheet"><div class="sheet-head"><b>Pratinjau batch</b></div>
              <div class="sheet-body"><div class="note bad"><b>Batch tidak ditemukan</b>
              <p>Periksa kembali Batch ID.</p></div></div></div>`;
            return;
          }
          const st = DT.batchStatus(batch);
          const holder = S.address && batch.currentHolder.toLowerCase() === S.address.toLowerCase();
          host.innerHTML = `<div class="sheet">
            <div class="sheet-head"><b>Pratinjau batch</b><span class="note">${st.label}</span></div>
            <div class="sheet-body">
              <h3 class="mono">${DT.escapeHtml(batch.batchCode)}</h3>
              <dl class="facts mt2">
                <dt>NIE</dt><dd>${DT.escapeHtml(batch.nie)}</dd>
                <dt>Pemegang kini</dt><dd>${DT.shorten(batch.currentHolder, 10, 8)} ${holder ? '<span class="seal ok"><i></i>Anda</span>' : ""}</dd>
                <dt>Perpindahan</dt><dd>${transfers.length}</dd>
                <dt>Kedaluwarsa</dt><dd>${DT.fmtShort(batch.expiryDate)}</dd>
              </dl>
              ${!holder ? `<div class="note warn mt2"><b>Bukan pemegang batch</b>
                <p>Wallet Anda tidak tercatat sebagai pemegang, sehingga kontrak akan menolak transaksi ini.</p></div>` : ""}
              ${batch.recalled ? `<div class="note bad mt2"><b>Batch recall</b>
                <p>Perpindahan tidak dimungkinkan untuk batch berstatus recall.</p></div>` : ""}
            </div></div>`;
        } catch (e) {
          host.innerHTML = errSheet(DT.txError(e));
        }
      }, 340);
    }
    document.getElementById("tId").addEventListener("input", preview);

    let t2 = null;
    document.getElementById("tTo").addEventListener("input", () => {
      clearTimeout(t2);
      t2 = setTimeout(async () => {
        const addr = DT.normAddr(v("tTo"));
        const hint = document.getElementById("toHint");
        if (!DT.isAddr(addr)) {
          hint.textContent = "Penerima harus sudah terdaftar sebagai aktor pada kontrak.";
          hint.style.color = "";
          return;
        }
        try {
          const r = Number(await DT.readContract().roles(addr));
          hint.textContent = r === 0
            ? "Alamat ini belum terdaftar sebagai aktor. Kontrak akan menolak transaksi."
            : "Penerima terdaftar sebagai " + DT.roleLong(r) + ".";
          hint.style.color = r === 0 ? "var(--stamp)" : "var(--moss)";
        } catch (e) { hint.textContent = "Tidak dapat memeriksa peran penerima."; }
      }, 380);
    });

    document.getElementById("fPindah").addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = v("tId").trim(), to = DT.normAddr(v("tTo"));
      mark(document.getElementById("tId"), !DT.isBatchId(id));
      mark(document.getElementById("tTo"), !DT.isAddr(to));
      if (!DT.isBatchId(id) || !DT.isAddr(to)) return;

      const btn = document.getElementById("btnPindah");
      btn.disabled = true;
      const label = btn.textContent;
      btn.innerHTML = '<span class="spin"></span> Menunggu wallet…';
      try {
        await DT.writeTx("transferCustody", [id, to], { successTitle: "Custody berpindah" });
        const after = await DT.loadBatch(id, DT.activeChainId());
        const el = document.createElement("div");
        el.innerHTML = `Pemegang baru <span class="mono">${DT.shorten(after.batch.currentHolder, 10, 8)}</span>`;
        DT.toast(el, "success", "Perpindahan tercatat");
        await scan();
        document.getElementById("tId").value = "";
        document.getElementById("tTo").value = "";
        preview();
        updateMetrics();
      } catch (err) {
        DT.toast(DT.txError(err), "error", "Perpindahan gagal");
      } finally {
        btn.disabled = false;
        btn.textContent = label;
      }
    });
  }

  function fillPindah(id) {
    const el = document.getElementById("tId");
    if (el) {
      el.value = id;
      el.dispatchEvent(new Event("input"));
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  /* -------------------------------------------------------- TAB 4: tarik batch --- */
  async function tabTarik(root) {
    root.innerHTML = `<div class="cols">
      <div class="sheet">
        <div class="sheet-head"><b>Tarik batch dari peredaran</b><span class="note">flagRecall()</span></div>
        <div class="sheet-body">
          <form id="fTarik" novalidate>
            <div class="field">
              <label for="kId">Batch ID</label>
              <input id="kId" class="mono" placeholder="0x…" required>
              <span class="err">Batch ID harus 0x diikuti 64 karakter heksadesimal.</span>
            </div>
            <div class="field">
              <label for="kWhy">Alasan penarikan</label>
              <textarea id="kWhy" placeholder="Contoh: hasil uji stabilitas tidak memenuhi syarat" required></textarea>
              <span class="hint">Alasan ikut tersimpan pada ledger dan dapat diaudit kemudian.</span>
              <span class="err">Alasan wajib diisi.</span>
            </div>
            <div class="note warn">
              <b>Tidak dapat dibatalkan</b>
              <p>Recall bersifat permanen pada kontrak. Batch tidak dapat dikembalikan ke status
                 normal dan tidak dapat dipindahtangankan lagi.</p>
            </div>
            <div class="row mt3">
              <button class="btn danger" type="submit" id="btnTarik">Kirim transaksi penarikan</button>
            </div>
          </form>
        </div>
      </div>
      <div id="kPrev">
        <div class="sheet"><div class="sheet-head"><b>Pratinjau batch</b></div>
          <div class="sheet-body"><div class="empty"><b>Belum ada batch</b>
            <span>Tempel Batch ID untuk melihat batch yang akan ditarik.</span></div></div></div>
      </div>
    </div>`;

    const v = (id) => document.getElementById(id).value;
    const mark = (el, bad) => el.closest(".field").classList.toggle("invalid", !!bad);
    let t = null;

    async function preview() {
      clearTimeout(t);
      t = setTimeout(async () => {
        const id = v("kId").trim();
        const host = document.getElementById("kPrev");
        if (!DT.isBatchId(id)) {
          host.innerHTML = `<div class="sheet"><div class="sheet-head"><b>Pratinjau batch</b></div>
            <div class="sheet-body"><div class="empty"><b>Belum ada batch</b>
            <span>Tempel Batch ID untuk melihat pratinjau.</span></div></div></div>`;
          return;
        }
        host.innerHTML = `<div class="sheet"><div class="sheet-head"><b>Pratinjau batch</b></div>
          <div class="sheet-body"><span class="skel" style="display:block;width:65%"></span></div></div>`;
        try {
          const { batch, transfers } = await DT.loadBatch(id, DT.activeChainId());
          if (!batch.exists) {
            host.innerHTML = `<div class="sheet"><div class="sheet-head"><b>Pratinjau batch</b></div>
              <div class="sheet-body"><div class="note bad"><b>Batch tidak ditemukan</b>
              <p>Penarikan tidak dapat dijalankan.</p></div></div></div>`;
            return;
          }
          const st = DT.batchStatus(batch);
          const mine = DT.isRegulator() || batch.manufacturer.toLowerCase() === (S.address || "").toLowerCase();
          const warnings = [];
          if (batch.recalled) warnings.push("Batch sudah berstatus recall sebelumnya.");
          if (!mine) warnings.push("Batch ini bukan dicatat oleh wallet Anda, sehingga kontrak akan menolak penarikan.");
          host.innerHTML = `<div class="sheet">
            <div class="sheet-head"><b>Pratinjau batch</b><span class="note">${st.label}</span></div>
            <div class="sheet-body">
              <h3 class="mono">${DT.escapeHtml(batch.batchCode)}</h3>
              <dl class="facts mt2">
                <dt>NIE</dt><dd>${DT.escapeHtml(batch.nie)}</dd>
                <dt>Dicatat oleh</dt><dd>${DT.shorten(batch.manufacturer, 10, 8)}</dd>
                <dt>Pemegang kini</dt><dd>${DT.shorten(batch.currentHolder, 10, 8)}</dd>
                <dt>Perpindahan</dt><dd>${transfers.length}</dd>
              </dl>
              ${warnings.length
                ? `<div class="note bad mt2"><b>Perhatian</b><p>${warnings.join(" ")}</p></div>`
                : `<div class="note ok mt2"><b>Dapat ditarik</b><p>Batch ini memenuhi syarat untuk diberi status recall oleh wallet Anda.</p></div>`}
            </div></div>`;
        } catch (e) { host.innerHTML = errSheet(DT.txError(e)); }
      }, 340);
    }
    document.getElementById("kId").addEventListener("input", preview);

    document.getElementById("fTarik").addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = v("kId").trim(), why = v("kWhy").trim();
      mark(document.getElementById("kId"), !DT.isBatchId(id));
      mark(document.getElementById("kWhy"), !why);
      if (!DT.isBatchId(id) || !why) return;

      const ok = await DT.modal({
        title: "Konfirmasi penarikan batch",
        bodyHtml: `<p class="small">Batch berikut akan ditandai recall secara permanen pada ledger:</p>
          <p class="mono wrapany small">${DT.escapeHtml(id)}</p>
          <p class="small muted mb0">Alasan: ${DT.escapeHtml(why)}</p>`,
        confirmText: "Ya, tarik batch",
        danger: true,
      });
      if (!ok) return;

      const btn = document.getElementById("btnTarik");
      btn.disabled = true;
      const label = btn.textContent;
      btn.innerHTML = '<span class="spin"></span> Menunggu wallet…';
      try {
        await DT.writeTx("flagRecall", [id, why], { successTitle: "Batch ditarik" });
        await scan();
        updateMetrics();
        preview();
      } catch (err) {
        DT.toast(DT.txError(err), "error", "Penarikan gagal");
      } finally {
        btn.disabled = false;
        btn.textContent = label;
      }
    });
  }

  function fillTarik(id) {
    const el = document.getElementById("kId");
    if (el) {
      el.value = id;
      el.dispatchEvent(new Event("input"));
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  /* ------------------------------------------------------------- TAB 5: aktor --- */
  async function tabAktor(root) {
    const isReg = DT.isRegulator();
    root.innerHTML = `
      ${isReg ? `<div class="sheet mb2">
        <div class="sheet-head"><b>Daftarkan aktor</b><span class="note">registerActor() · hanya regulator</span></div>
        <div class="sheet-body">
          <form id="fAktor" novalidate>
            <div class="duo">
              <div class="field">
                <label for="aAddr">Alamat wallet aktor</label>
                <input id="aAddr" class="mono" placeholder="0x…" required>
                <span class="err">Alamat wallet tidak valid.</span>
              </div>
              <div class="field">
                <label for="aRole">Peran yang diberikan</label>
                <select id="aRole">
                  <option value="1">Pabrik (Manufacturer)</option>
                  <option value="2">Distributor</option>
                  <option value="3">Apotek / Rumah Sakit (Pharmacy)</option>
                  <option value="4">BPOM (Regulator)</option>
                </select>
                <span class="hint">Peran regulator memberi kewenangan mendaftarkan aktor lain.</span>
              </div>
            </div>
            <div class="note" id="aNow"><b>Peran saat ini</b><p>Masukkan alamat wallet untuk memeriksa.</p></div>
            <div class="row mt3"><button class="btn solid" type="submit" id="btnAktor">Kirim transaksi pendaftaran</button></div>
          </form>
        </div></div>` : ""}

      <div class="sheet">
        <div class="sheet-head"><b>Aktor terdaftar</b><span class="note">Sumber: event ActorRegistered</span></div>
        <div class="sheet-body tight tscroll">
          <table>
            <thead><tr><th>Peran</th><th>Alamat wallet</th><th>Blok</th><th class="r">Tindakan</th></tr></thead>
            <tbody id="actorRows"></tbody>
          </table>
        </div>
      </div>`;

    const rows = document.getElementById("actorRows");
    function paint() {
      if (ACTORS.length === 0) {
        rows.innerHTML = `<tr><td colspan="4"><div class="empty"><b>Belum ada aktor</b>
          <span>Aktor muncul setelah registerActor() dijalankan.</span></div></td></tr>`;
        return;
      }
      rows.innerHTML = ACTORS.map((a) => {
        const mine = S.address && a.actor.toLowerCase() === S.address.toLowerCase();
        return `<tr>
          <td><span class="seal ${a.role === 4 ? "bad" : a.role === 0 ? "mute" : "ok"}"><i></i>${DT.roleLabel(a.role)}</span>
            ${mine ? '<span class="tiny faint" style="margin-left:6px">wallet ini</span>' : ""}</td>
          <td class="mono wrapany">${DT.escapeHtml(a.actor)}</td>
          <td class="mono">${a.block}</td>
          <td class="r"><div class="row" style="gap:6px;justify-content:flex-end">
            <button class="btn sm ghost" data-copy="${DT.escapeHtml(a.actor)}">Salin</button>
            ${isReg ? `<button class="btn sm ghost" data-pick="${DT.escapeHtml(a.actor)}">Ubah</button>` : ""}
          </div></td>
        </tr>`;
      }).join("");
      rows.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", () => copyText(b.dataset.copy)));
      rows.querySelectorAll("[data-pick]").forEach((b) => b.addEventListener("click", () => {
        const f = document.getElementById("aAddr");
        if (f) { f.value = b.dataset.pick; f.dispatchEvent(new Event("input")); f.scrollIntoView({ block: "center" }); }
      }));
    }
    paint();
    if (!isReg) return;

    const v = (id) => document.getElementById(id).value;
    const mark = (el, bad) => el.closest(".field").classList.toggle("invalid", !!bad);
    let t = null;
    document.getElementById("aAddr").addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(async () => {
        const addr = DT.normAddr(v("aAddr"));
        const box = document.getElementById("aNow");
        if (!DT.isAddr(addr)) {
          box.innerHTML = `<b>Peran saat ini</b><p>Masukkan alamat wallet untuk memeriksa.</p>`;
          return;
        }
        try {
          const r = Number(await DT.readContract().roles(addr));
          box.innerHTML = r === 0
            ? `<b>Peran saat ini</b><p>Alamat ini belum memiliki peran. Pendaftaran dapat dilakukan.</p>`
            : `<b>Peran saat ini</b><p>Sudah terdaftar sebagai ${DT.roleLong(r)}. Transaksi baru akan menimpa peran tersebut.</p>`;
        } catch (e) { box.innerHTML = `<b>Peran saat ini</b><p>Tidak dapat membaca kontrak.</p>`; }
      }, 380);
    });

    document.getElementById("fAktor").addEventListener("submit", async (e) => {
      e.preventDefault();
      const addr = DT.normAddr(v("aAddr"));
      const role = Number(document.getElementById("aRole").value);
      mark(document.getElementById("aAddr"), !DT.isAddr(addr));
      if (!DT.isAddr(addr)) return;

      const ok = await DT.modal({
        title: "Konfirmasi pendaftaran aktor",
        bodyHtml: `<p class="small">Memberikan peran <strong>${DT.roleLong(role)}</strong> kepada:</p>
          <p class="mono wrapany small">${DT.escapeHtml(addr)}</p>
          <p class="small muted mb0">Peran disimpan pada kontrak dan berlaku setelah transaksi masuk ke blok.</p>`,
        confirmText: "Kirim transaksi",
      });
      if (!ok) return;

      const btn = document.getElementById("btnAktor");
      btn.disabled = true;
      const label = btn.textContent;
      btn.innerHTML = '<span class="spin"></span> Menunggu wallet…';
      try {
        await DT.writeTx("registerActor", [addr, role], { successTitle: "Aktor terdaftar" });
        await scan();
        paint();
        updateMetrics();
      } catch (err) {
        DT.toast(DT.txError(err), "error", "Pendaftaran aktor gagal");
      } finally {
        btn.disabled = false;
        btn.textContent = label;
      }
    });
  }

  /* ----------------------------------------------------- TAB 6: permintaan peran --- */
  async function tabAjuan(root) {
    root.innerHTML = `<div class="sheet">
      <div class="sheet-head"><b>Permintaan peran</b><span class="note">Bukan data blockchain</span></div>
      <div class="sheet-body">
        <div class="note">
          <b>Catatan kerja pada peramban ini</b>
          <p>Permintaan disimpan pada <span class="mono">localStorage</span> peramban, bukan pada ledger.
             Hanya terlihat pada peramban tempat pengajuan dilakukan. Pendaftaran resmi tetap lewat
             transaksi <span class="mono">registerActor()</span>.</p>
        </div>
      </div>
      <div class="sheet-body tight tscroll">
        <table>
          <thead><tr><th>Instansi</th><th>Peran diminta</th><th>Alamat wallet</th><th>Diajukan</th><th>Status</th><th class="r">Tindakan</th></tr></thead>
          <tbody id="ajuanRows"></tbody>
        </table>
      </div>
    </div>`;

    function paint() {
      const list = DT.readRequests().slice().reverse();
      const rows = document.getElementById("ajuanRows");
      if (list.length === 0) {
        rows.innerHTML = `<tr><td colspan="6"><div class="empty"><b>Belum ada permintaan</b>
          <span>Calon aktor mengajukan melalui halaman Pengajuan Peran.</span></div></td></tr>`;
        return;
      }
      rows.innerHTML = list.map((r) => `
        <tr>
          <td><span class="strong">${DT.escapeHtml(r.institution || "—")}</span></td>
          <td><span class="seal mute"><i></i>${DT.roleLabel(r.role)}</span></td>
          <td class="mono wrapany">${DT.escapeHtml(r.address)}</td>
          <td class="mono">${new Date(r.createdAt).toLocaleDateString("id-ID")}</td>
          <td>${r.status === "terdaftar"
            ? '<span class="seal ok"><i></i>terdaftar</span>'
            : '<span class="seal warn"><i></i>menunggu</span>'}</td>
          <td class="r"><div class="row" style="gap:6px;justify-content:flex-end">
            <button class="btn sm ghost" data-copy="${DT.escapeHtml(r.address)}">Salin</button>
            <button class="btn sm solid" data-reg="${DT.escapeHtml(r.address)}" data-role="${r.role}">Daftarkan</button>
          </div></td>
        </tr>`).join("");

      rows.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", () => copyText(b.dataset.copy)));
      rows.querySelectorAll("[data-reg]").forEach((b) => b.addEventListener("click", async () => {
        const addr = DT.normAddr(b.dataset.reg), role = Number(b.dataset.role);
        const ok = await DT.modal({
          title: "Konfirmasi pendaftaran aktor",
          bodyHtml: `<p class="small">Memberikan peran <strong>${DT.roleLong(role)}</strong> kepada:</p>
            <p class="mono wrapany small">${DT.escapeHtml(addr)}</p>`,
          confirmText: "Kirim transaksi",
        });
        if (!ok) return;
        b.disabled = true;
        try {
          await DT.writeTx("registerActor", [addr, role], { successTitle: "Aktor terdaftar" });
          DT.updateRequest(addr, { status: "terdaftar", registeredAt: new Date().toISOString() });
          await scan();
          paint();
          updateMetrics();
        } catch (err) {
          DT.toast(DT.txError(err), "error", "Pendaftaran aktor gagal");
        } finally { b.disabled = false; }
      }));
    }
    paint();
  }

  /* --------------------------------------------------------------- TAB 7: log --- */
  async function tabLog(root) {
    root.innerHTML = `<div class="sheet">
      <div class="sheet-head"><b>Log blok</b><span class="note">Event terakhir pada kontrak ini</span></div>
      <div class="sheet-body tight tscroll">
        <table>
          <thead><tr><th class="r">Blok</th><th>Kejadian</th><th>Rincian</th><th>Transaksi</th></tr></thead>
          <tbody id="logRows"><tr><td colspan="4"><span class="skel" style="display:block;width:50%"></span></td></tr></tbody>
        </table>
      </div>
    </div>`;

    try {
      const c = DT.readContract();
      const from = fromBlock();
      const [regs, xfers, recalls, actors] = await Promise.all([
        c.queryFilter(c.filters.BatchRegistered(), from, "latest"),
        c.queryFilter(c.filters.CustodyTransferred(), from, "latest"),
        c.queryFilter(c.filters.BatchRecalled(), from, "latest"),
        c.queryFilter(c.filters.ActorRegistered(), from, "latest"),
      ]);
      const events = [
        ...regs.map((e) => ({ b: e.blockNumber, n: "BatchRegistered", d: `${e.args.nie} · ${e.args.batchCode}`, tx: e.transactionHash, k: "ok" })),
        ...xfers.map((e) => ({ b: e.blockNumber, n: "CustodyTransferred", d: `${DT.shorten(e.args[1], 8, 6)} → ${DT.shorten(e.args[2], 8, 6)}`, tx: e.transactionHash, k: "ok" })),
        ...recalls.map((e) => ({ b: e.blockNumber, n: "BatchRecalled", d: DT.escapeHtml(e.args.reason), tx: e.transactionHash, k: "bad" })),
        ...actors.map((e) => ({ b: e.blockNumber, n: "ActorRegistered", d: `${DT.roleLabel(Number(e.args.role))} · ${DT.shorten(e.args.actor, 8, 6)}`, tx: e.transactionHash, k: "mute" })),
      ].sort((a, b) => b.b - a.b).slice(0, 50);

      const rows = document.getElementById("logRows");
      if (events.length === 0) {
        rows.innerHTML = `<tr><td colspan="4"><div class="empty"><b>Belum ada event</b>
          <span>Belum satu pun transaksi tercatat pada kontrak ini.</span></div></td></tr>`;
        return;
      }
      rows.innerHTML = events.map((e) => {
        const link = DT.explorerTx(e.tx);
        return `<tr>
          <td class="r mono">${e.b}</td>
          <td><span class="seal ${e.k === "bad" ? "bad" : "mute"}"><i></i>${e.n}</span></td>
          <td class="small">${e.d}</td>
          <td class="mono">${link
            ? `<a href="${link}" target="_blank" rel="noopener">${DT.shorten(e.tx, 8, 6)}</a>`
            : DT.shorten(e.tx, 8, 6)}</td>
        </tr>`;
      }).join("");
    } catch (e) {
      document.getElementById("logRows").innerHTML =
        `<tr><td colspan="4"><div class="note bad"><b>Gagal memuat event</b><p>${DT.escapeHtml(DT.txError(e))}</p></div></td></tr>`;
    }
  }

  /* ------------------------------------------------------------------ init --- */
  DT.onChange(async () => {
    if (S.address && DT.contractConfigFor(S.chainId)) await scan();
    render();
  });

  (async function init() {
    DT.boot("dash");
    if (S.address && DT.contractConfigFor(S.chainId)) await scan();
    await render();
  })();
})();
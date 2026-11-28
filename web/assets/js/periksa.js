/* ==========================================================================
   DrugTraceability - halaman Periksa Batch
   Semua nilai pada hasil berasal dari pembacaan kontrak, bukan dari isian form.
   ========================================================================== */

(function () {
  const S = DT.state;

  const host = document.getElementById("resultHost");
  const formData = document.getElementById("formData");
  const formId = document.getElementById("formId");
  const tabData = document.getElementById("tabData");
  const tabId = document.getElementById("tabId");
  const inputNie = document.getElementById("vNie");
  const inputBatch = document.getElementById("vBatch");
  const inputSerial = document.getElementById("vSerial");
  const inputComputed = document.getElementById("vComputed");
  const inputId = document.getElementById("vId");
  const qrLink = document.getElementById("qrLink");
  const netNotice = document.getElementById("netNotice");
  const permalink = document.getElementById("vPermalink");
  const qrHost = document.getElementById("qrHost");
  const qrBox = document.getElementById("qrBox");

  let lastId = "";
  const cfgs = () => DT.contractConfigFor(DT.activeChainId());

  /* --------------------------------------------------------------- tab --- */
  function setTab(which) {
    const isData = which === "data";
    tabData.className = "btn sm " + (isData ? "solid" : "ghost");
    tabId.className = "btn sm " + (isData ? "ghost" : "solid");
    tabData.setAttribute("aria-selected", String(isData));
    tabId.setAttribute("aria-selected", String(!isData));
    formData.classList.toggle("hidden", !isData);
    formId.classList.toggle("hidden", isData);
  }
  tabData.addEventListener("click", () => setTab("data"));
  tabId.addEventListener("click", () => setTab("id"));

  /* ---------------------------------------------------- keterangan jaringan --- */
  function renderNetNotice() {
    const ids = DT.configuredChainIds();
    if (ids.length === 0) {
      netNotice.className = "note warn mt2";
      netNotice.innerHTML = `<b>Kontrak belum dikonfigurasi</b>
        <p>Jalankan <span class="mono">npm run deploy:local</span> supaya
        <span class="mono">web/contract-config.js</span> terisi alamat kontrak.</p>`;
      return;
    }
    const cid = DT.activeChainId();
    const c = cfgs();
    const fileHint = location.protocol === "file:"
      ? ` Halaman ini sedang dibuka sebagai berkas lokal; membaca data tetap berjalan.`
      : "";
    netNotice.className = "note mt2";
    netNotice.innerHTML = `<b>Membaca kontrak</b>
      <p class="mb0">Alamat kontrak pada ${DT.NETWORK_LABEL[cid] || "chainId " + cid}${c.network ? " (" + c.network + ")" : ""}:</p>
      <p class="addrline mb0">${c.contractAddress}</p>
      ${fileHint ? `<p class="mb0">Halaman ini sedang dibuka sebagai berkas lokal; membaca data tetap berjalan.</p>` : ""}`;
  }

  /* -------------------------------------------------- hitung Batch ID live --- */
  let timer = null;
  const scheduleCompute = () => { clearTimeout(timer); timer = setTimeout(compute, 350); };

  async function compute() {
    const nie = inputNie.value.trim(), bc = inputBatch.value.trim(), sn = inputSerial.value.trim();
    if (!nie || !bc || !sn) { inputComputed.value = ""; qrLink.hidden = true; setPermalink(""); return null; }
    try {
      const id = await DT.computeBatchId(nie, bc, sn, DT.activeChainId());
      inputComputed.value = id;
      qrLink.href = "verifikasi.html?id=" + id;
      qrLink.hidden = false;
      setPermalink(id);
      return id;
    } catch (e) {
      inputComputed.value = "";
      qrLink.hidden = true;
      setPermalink("");
      return null;
    }
  }
  [inputNie, inputBatch, inputSerial].forEach((i) => i.addEventListener("input", scheduleCompute));

  /* -------------------------------------------------------- tautan & QR --- */
  function setPermalink(id) {
    lastId = id || "";
    // Teks lengkap ditampilkan utuh; input asli tetap dipakai untuk menyalin
    const view = document.getElementById("vPermalinkText");
    if (!lastId) {
      permalink.value = "";
      if (view) view.textContent = "Terbentuk setelah Batch ID dihitung.";
      qrHost.classList.add("hidden");
      return;
    }
    permalink.value = location.origin + location.pathname + "?id=" + lastId;
    if (view) view.textContent = permalink.value;
  }

  function renderQr(url) {
    qrBox.innerHTML = "";
    if (typeof qrcode !== "function") {
      qrBox.innerHTML = '<p class="small muted mb0">Pustaka QR tidak termuat. Pakai tombol salin tautan.</p>';
      return;
    }
    try {
      const qr = qrcode(0, "M");
      qr.addData(url);
      qr.make();
      qrBox.innerHTML = qr.createImgTag(4, 10);
      const img = qrBox.querySelector("img");
      if (img) { img.alt = "Kode QR tautan pemeriksaan batch " + lastId; img.style.width = "188px"; }
    } catch (e) {
      qrBox.innerHTML = '<p class="small muted mb0">Tautan terlalu panjang untuk QR. Pakai tombol salin tautan.</p>';
    }
  }

  document.getElementById("btnCopyLink").addEventListener("click", async () => {
    if (!permalink.value) { DT.toast("Hitung Batch ID lebih dulu.", "warn"); return; }
    try {
      await navigator.clipboard.writeText(permalink.value);
      DT.toast("Tautan pemeriksaan disalin.", "success");
    } catch (e) {
      DT.toast("Gagal menyalin otomatis. Salin manual dari kolom tautan.", "warn");
    }
  });

  document.getElementById("btnQr").addEventListener("click", () => {
    if (!permalink.value) { DT.toast("Hitung Batch ID lebih dulu.", "warn"); return; }
    const terbuka = qrHost.classList.toggle("hidden");
    if (!terbuka) renderQr(permalink.value);
  });

  /* --------------------------------------------------------------- validasi --- */
  const mark = (el, bad) => el.closest(".field").classList.toggle("invalid", !!bad);
  formData.addEventListener("submit", (e) => { e.preventDefault(); verify(); });
  formId.addEventListener("submit", (e) => { e.preventDefault(); verify(); });
  document.getElementById("btnReset").addEventListener("click", () => {
    inputNie.value = inputBatch.value = inputSerial.value = inputComputed.value = "";
    [inputNie, inputBatch, inputSerial].forEach((i) => mark(i, false));
    qrLink.hidden = true;
    setPermalink("");
    renderIdle();
    history.replaceState(null, "", location.pathname);
  });

  /* ------------------------------------------------------ pra-isi dari URL --- */
  // Diletakkan setelah `mark` dan `verify` siap, karena langsung memanggil verify().
  const params = new URLSearchParams(location.search);
  if (params.get("id")) {
    setTab("id");
    inputId.value = params.get("id");
    verify();
  } else if (params.get("nie") || params.get("batch") || params.get("serial")) {
    inputNie.value = params.get("nie") || "";
    inputBatch.value = params.get("batch") || "";
    inputSerial.value = params.get("serial") || "";
    compute().then((id) => { if (id) verify(); });
  }

  /* ------------------------------------------------------------- tampilan --- */
  const renderIdle = () => {
    host.innerHTML = `<div class="sheet">
      <div class="sheet-head"><b>Hasil pemeriksaan</b></div>
      <div class="sheet-body">
        <div class="empty"><b>Belum ada batch diperiksa</b>
          <span>Isi data kemasan atau Batch ID di sebelah kiri.</span></div>
      </div></div>`;
  };

  function renderSkeleton() {
    host.innerHTML = `<div class="sheet">
      <div class="sheet-head"><b>Hasil pemeriksaan</b><span class="note">Membaca kontrak…</span></div>
      <div class="sheet-body">
        <span class="skel" style="display:block;width:40%;height:22px"></span>
        <span class="skel mt2" style="display:block;width:78%"></span>
        <span class="skel mt1" style="display:block;width:64%"></span>
        <span class="skel mt1" style="display:block;width:70%"></span>
      </div></div>`;
  }

  // Alamat di sel tabel ditampilkan ringkas, tetapi alamat penuh disimpan pada title
  function addrSpan(a, head = 8, tail = 6) {
    if (!a) return "—";
    return `<span class="mono" title="${DT.escapeHtml(a)}">${DT.shorten(a, head, tail)}</span>`;
  }

  function holderLine(addr, role) {
    if (!addr || /^0x0+$/.test(addr)) return "—";
    // Alamat penuh disimpan di title agar verifikasi manual tetap mungkin dilakukan
    return `<span class="mono" title="${DT.escapeHtml(addr)}">${DT.shorten(addr, 10, 8)}</span>` +
      (role ? ` <span class="seal mute"><i></i>${DT.escapeHtml(role)}</span>` : "");
  }

  function renderNotFound(id) {
    host.innerHTML = `<div class="sheet">
      <div class="sheet-head"><b>Hasil pemeriksaan</b><span class="note">Tidak ditemukan</span></div>
      <div class="sheet-body">
        <div class="note bad">
          <b>Tidak ada pada ledger</b>
          <p>Kombinasi NIE, kode batch, dan nomor serial ini tidak menghasilkan catatan pada kontrak.
             Periksa kembali penulisannya, atau mintalah pabrik memastikan batch sudah dicatat.</p>
        </div>
        <dl class="facts mt2">
          <dt>Batch ID</dt><dd>${DT.escapeHtml(id)}</dd>
        </dl>
      </div></div>`;
  }

  function renderError(e) {
    host.innerHTML = `<div class="sheet">
      <div class="sheet-head"><b>Hasil pemeriksaan</b><span class="note">Gagal membaca</span></div>
      <div class="sheet-body">
        <div class="note bad"><b>Tidak dapat membaca kontrak</b>
          <p>${DT.escapeHtml(DT.txError(e))}</p></div>
        <p class="small muted mt2 mb0">Bila kontrak dijalankan pada node lokal, pastikan
          <span class="mono">npm run node</span> masih berjalan dan alamat pada
          <span class="mono">web/contract-config.js</span> sesuai.</p>
      </div></div>`;
  }

  async function renderBatch(id, batch, transfers, extra = {}) {
    const st = DT.batchStatus(batch);
    const expired = DT.isExpired(batch.expiryDate);
    const left = DT.daysLeft(batch.expiryDate);
    const used = DT.lifeUsed(batch.manufactureDate, batch.expiryDate);
    const usedPct = Math.round(used * 100);
    const regBlock = extra.registerBlock || null;
    const recBlock = extra.recallBlock || null;

    // Kepala kartu: identitas batch + segel masa berlaku (diputar sedikit)
    const headCopy = batch.recalled
      ? "Batch ini berstatus recall dan tidak dapat dipindahkan lagi."
      : expired
        ? "Masa edar sudah lewat, meski catatannya tetap ada pada ledger."
        : `Berlaku ${left} hari lagi.`;

    // Baris mutasi: pencatatan pabrik, setiap perpindahan, lalu recall bila ada
    const rows = [];
    rows.push(`
      <tr>
        <td class="mono nowrap">${DT.fmtShort(batch.manufactureDate)}</td>
        <td>Dicatat pabrik
          <span class="sub">NIE ${DT.escapeHtml(batch.nie)} · serial ${DT.escapeHtml(batch.serialNumber)} · oleh ${DT.shorten(batch.manufacturer, 8, 6)}</span></td>
        <td class="r"><span class="in">1</span></td>
        <td class="r">—</td>
        <td class="mono">${addrSpan(batch.manufacturer)}</td>
        <td class="r mono">${regBlock ? regBlock.block : "—"}</td>
      </tr>`);

    transfers.forEach((t, i) => {
      rows.push(`
        <tr>
          <td class="mono nowrap">${DT.fmtShort(t.timestamp)}</td>
          <td>Perpindahan custody ${i + 1}
            <span class="sub">Diserahkan dari ${DT.shorten(t.from, 8, 6)}</span></td>
          <td class="r">—</td>
          <td class="r"><span class="in">1</span></td>
          <td class="mono">${addrSpan(t.to)}</td>
          <td class="r mono">${t.block ? t.block : "—"}</td>
        </tr>`);
    });

    if (batch.recalled) {
      rows.push(`
        <tr class="flagged">
          <td class="mono nowrap">${recBlock ? "blok " + recBlock.block : "—"}</td>
          <td>Ditarik dari peredaran
            <span class="sub">${DT.escapeHtml(batch.recallReason || "tanpa alasan tertulis")}</span></td>
          <td class="r">—</td><td class="r">—</td>
          <td class="mono">tetap di ${addrSpan(batch.currentHolder)}</td>
          <td class="r mono">${recBlock ? recBlock.block : "—"}</td>
        </tr>`);
    } else {
      rows.push(`
        <tr>
          <td class="mono nowrap" style="color:var(--ink-3)">—</td>
          <td class="void small">Tidak ada perpindahan berikutnya tercatat</td>
          <td class="r">—</td><td class="r">—</td>
          <td class="mono">${addrSpan(batch.currentHolder)}</td>
          <td class="r mono">—</td>
        </tr>`);
    }

    host.innerHTML = `
      <div class="sheet">
        <div class="sheet-head">
          <b>Hasil pemeriksaan</b>
          <span class="note">${DT.NETWORK_LABEL[DT.activeChainId()] || "chainId " + DT.activeChainId()}</span>
        </div>

        <div class="sheet-body">
          <!-- kepala kartu stok -->
          <div class="row between" style="align-items:flex-end;gap:20px">
            <div>
              <p class="sub">Kode batch</p>
              <h2 style="font-size:1.9rem;letter-spacing:-0.02em" class="mono">${DT.escapeHtml(batch.batchCode)}</h2>
              <p class="small muted mt1 mb0">NIE ${DT.escapeHtml(batch.nie)} · serial ${DT.escapeHtml(batch.serialNumber)}</p>
            </div>
            <div style="text-align:right">
              <span class="stamp ${st.cls}">${st.stamp}</span>
              <p class="tiny muted mt1 mb0">${headCopy}</p>
            </div>
          </div>

          <!-- bilah masa berlaku -->
          <div class="gauge mt3">
            <div class="labels"><span>Masa edar terpakai ${usedPct}%</span><span>sisa ${left > 0 ? left + " hari" : "0 hari"}</span></div>
            <div class="track">
              <div class="fill ${st.cls === "bad" ? "bad" : st.cls === "warn" ? "warn" : ""}" style="width:${usedPct}%"></div>
              <div class="today" style="left:${usedPct}%"></div>
            </div>
            <div class="marks">
              <span>Produksi ${DT.fmtShort(batch.manufactureDate)}</span>
              <span>Kedaluwarsa ${DT.fmtShort(batch.expiryDate)}</span>
            </div>
            <p class="marknote">Garis tegak pada bilah menandai posisi hari ini (${usedPct}% masa edar terpakai).</p>
          </div>

          <!-- kolom fakta bernomor -->
          <dl class="facts mt3">
            <dt>Didaftarkan</dt><dd>${DT.fmtUnix(batch.manufactureDate)}</dd>
            <dt>Pemegang kini</dt><dd>${holderLine(batch.currentHolder)}</dd>
            <dt>Jumlah perpindahan</dt><dd>${transfers.length}</dd>
            <dt>Nomor blok catat</dt><dd>${regBlock ? regBlock.block : "—"}</dd>
          </dl>

          <!-- blok tanda tangan: alamat pendaftar, aturan kontrak, jejak blok -->
          <div class="signs mt3">
            <div>
              <b>Diisi</b>
              <span>${DT.shorten(batch.manufacturer, 10, 8)}</span>
              <span class="small">pabrik pendaftar</span>
            </div>
            <div>
              <b>Diperiksa kontrak</b>
              <span>onlyRole(Manufacturer)</span>
              <span class="small">aturan pendaftaran</span>
            </div>
            <div>
              <b>Tercatat pada blok</b>
              <span>${regBlock ? regBlock.block : "—"}</span>
              <span class="small">${transfers.length} perpindahan sesudahnya</span>
            </div>
          </div>

          <!-- Batch ID diberi satu baris penuh: hash 66 karakter tidak muat di kolom sempit -->
          <div class="hashblock mt2">
            <span class="lbl">Batch ID</span>
            <code>${DT.escapeHtml(id)}</code>
            <button class="cp" data-copy="${DT.escapeHtml(id)}">Salin</button>
          </div>
        </div>

        <!-- tabel mutasi -->
        <div class="sheet-head" style="border-top:1px solid var(--rule)">
          <b>Riwayat mutasi</b>
          <span class="note">getTransferHistory() · ${transfers.length} perpindahan</span>
        </div>
        <div class="sheet-body tight tscroll">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Uraian</th>
                <th class="r">Masuk</th>
                <th class="r">Keluar</th>
                <th>Saldo pemegang</th>
                <th class="r">Blok</th>
              </tr>
            </thead>
            <tbody>${rows.join("")}</tbody>
          </table>
        </div>
      </div>

      ${batch.recalled ? `
      <div class="note bad mt2">
        <b>Perhatian</b>
        <p>Alasan recall: ${DT.escapeHtml(batch.recallReason || "tidak tertulis")}. Kontrak menolak
           setiap perpindahan custody untuk batch berstatus recall.</p>
      </div>` : ""}

      <div class="sheet mt2">
        <div class="sheet-body">
          <p class="small muted mb0">
            <b>Catatan batas kemampuan.</b> Pemeriksaan ini membuktikan batch terdaftar pada ledger
            dan menunjukkan statusnya menurut data yang tersimpan. Ini bukan pengujian fisik
            keaslian produk.
          </p>
        </div>
      </div>`;

    // Tombol salin Batch ID (satu penangan untuk seluruh hasil)
    host.querySelectorAll("[data-copy]").forEach((b) =>
      b.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(b.dataset.copy);
          DT.toast("Batch ID disalin.", "success");
        } catch (e) {
          DT.toast("Gagal menyalin otomatis.", "warn");
        }
      }));
  }

  /* -------------------------------------------------------------- aksi --- */
  async function loadBatchById(id) {
    if (!DT.isBatchId(id)) { renderNotFound(id); return; }
    setPermalink(id);
    try {
      const data = await DT.loadBatch(id, DT.activeChainId());
      if (!data.batch.exists) renderNotFound(id);
      else renderBatch(id, data.batch, data.transfers, data);
    } catch (e) {
      renderError(e);
    }
  }

  async function verify() {
    let id;
    if (!formId.classList.contains("hidden")) {
      id = inputId.value.trim();
      const ok = DT.isBatchId(id);
      mark(inputId, !ok);
      if (!ok) return;
    } else {
      const nie = inputNie.value.trim(), bc = inputBatch.value.trim(), sn = inputSerial.value.trim();
      mark(inputNie, !nie); mark(inputBatch, !bc); mark(inputSerial, !sn);
      if (!nie || !bc || !sn) return;
      renderSkeleton();
      try {
        id = await DT.computeBatchId(nie, bc, sn, DT.activeChainId());
        inputComputed.value = id;
      } catch (e) { renderError(e); return; }
      setPermalink(id);
    }
    renderSkeleton();
    await loadBatchById(id);
  }

  renderNetNotice();
  DT.onChange(renderNetNotice);
  // Kalau wallet sudah tersambung sebelumnya, boot sudah memicu onChange;
  // pemanggilan ini memastikan halaman tetap bekerja saat belum ada wallet.
  if (!S.ethers) S.ethers = window.ethers;
})();

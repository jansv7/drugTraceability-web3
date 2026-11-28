/* ==========================================================================
   DrugTraceability - halaman Pengajuan Peran
   Pengajuan disimpan pada localStorage sebagai catatan kerja untuk regulator.
   Tidak ada yang ditulis ke blockchain dari halaman ini.
   ========================================================================== */

(function () {
  const S = DT.state;

  const f = document.getElementById("fReq");
  const qInst = document.getElementById("qInst");
  const qRole = document.getElementById("qRole");
  const qAddr = document.getElementById("qAddr");
  const qNote = document.getElementById("qNote");

  function paintState() {
    const dl = document.getElementById("myState");
    const role = !S.address
      ? '<span class="seal mute"><i></i>belum terbaca</span>'
      : Number(S.role) > 0
        ? `<span class="seal ok"><i></i>${DT.roleLabel(S.role)}</span>`
        : '<span class="seal warn"><i></i>belum terdaftar</span>';
    const cfgId = DT.configuredChainIds()[0];
    dl.innerHTML =
      `<dt>Wallet</dt><dd>${S.address ? DT.shorten(S.address, 10, 8) : "Belum terhubung"}</dd>` +
      `<dt>Jaringan</dt><dd>${S.chainId ? (DT.NETWORK_LABEL[S.chainId] || "chainId " + S.chainId) : "—"}</dd>` +
      `<dt>Peran</dt><dd>${role}</dd>` +
      `<dt>Kontrak</dt><dd>${cfgId ? DT.shorten(DT.contractConfigFor(cfgId).contractAddress, 8, 6) : "belum ada"}</dd>`;
  }

  function paintRequests() {
    const list = DT.readRequests().slice().reverse();
    const ul = document.getElementById("myReqList");
    if (list.length === 0) {
      ul.innerHTML = '<li><span class="t muted">Belum ada pengajuan tersimpan</span>' +
        '<span class="m">Pengajuan yang Anda simpan muncul di sini</span></li>';
      return;
    }
    ul.innerHTML = list.map((r) => `
      <li class="${r.status === "terdaftar" ? "done" : ""}">
        <span class="t">${DT.escapeHtml(r.institution)}
          <span class="seal ${r.status === "terdaftar" ? "ok" : "warn"}" style="margin-left:6px">
            <i></i>${r.status === "terdaftar" ? "terdaftar" : "menunggu"}</span></span>
        <span class="m">${DT.roleLabel(r.role)} · ${DT.shorten(r.address, 10, 8)}</span>
        <span class="m">${new Date(r.createdAt).toLocaleString("id-ID")}</span>
      </li>`).join("");
  }

  document.getElementById("btnConnectReq").addEventListener("click", async () => {
    try {
      await DT.connectWallet();
      DT.toast("Wallet terhubung. Peran dibaca dari kontrak.", "success");
    } catch (e) {
      DT.toast(DT.txError(e), "error");
    }
  });

  document.getElementById("btnUseConnected").addEventListener("click", () => {
    if (!S.address) { DT.toast("Hubungkan wallet lebih dulu.", "warn"); return; }
    qAddr.value = DT.normAddr(S.address);
  });

  const mark = (el, bad) => el.closest(".field").classList.toggle("invalid", !!bad);

  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const inst = qInst.value.trim();
    const addr = DT.normAddr(qAddr.value);
    mark(qInst, !inst);
    mark(qAddr, !DT.isAddr(addr));
    if (!inst || !DT.isAddr(addr)) return;

    const res = DT.addRequest({
      institution: inst,
      role: Number(qRole.value),
      address: addr,
      note: qNote.value.trim(),
      createdAt: new Date().toISOString(),
      status: "menunggu",
    });
    if (res.duplicate) {
      DT.toast("Sudah ada pengajuan menunggu untuk alamat wallet ini.", "warn");
      return;
    }
    const box = document.createElement("div");
    box.innerHTML =
      `Pengajuan tersimpan. Kirim alamat <span class="mono">${DT.shorten(addr, 10, 8)}</span> ` +
      `kepada petugas BPOM; baris pengajuan terbuka pada ruang kerja BPOM di peramban yang sama.`;
    DT.toast(box, "success", "Pengajuan dicatat");
    f.reset();
    paintRequests();
  });

  DT.onChange(paintState);
  paintState();
  paintRequests();
})();
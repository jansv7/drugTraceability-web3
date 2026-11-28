/* ==========================================================================
   DrugTraceability - Beranda dan Panduan
   Beranda bukan halaman promosi: isinya keadaan jaringan yang sedang dibaca,
   aturan yang ditegakkan kontrak, dan hak akses tiap peran.
   ========================================================================== */

(function () {
  const S = DT.state;

  function chip(kind, text) {
    return `<span class="seal ${kind}"><i></i>${DT.escapeHtml(text)}</span>`;
  }

  /* ------------------------------------------------------------- BERANDA --- */
  async function beranda() {
    const tallyHost = document.getElementById("tally");
    const rulesHost = document.getElementById("rulesBody");
    const rolesHost = document.getElementById("rolesBody");
    const lastHost = document.getElementById("lastBody");

    // ---- Angka nyata dari kontrak (bukan angka karangan) ----
    const pc = document.getElementById("pageMeta");
    try {
      const cid = DT.activeChainId();
      const c = DT.contractConfigFor(cid);
      if (pc) {
        pc.innerHTML =
          `<details class="netinfo"><summary>Info jaringan</summary>
             <dl>
               <dt>Jaringan</dt><dd>${DT.NETWORK_LABEL[cid] || "chainId " + cid}</dd>
               <dt>Kontrak</dt><dd>${DT.shorten(c.contractAddress, 8, 6)}</dd>
               <dt>chainId</dt><dd>${cid}</dd>
             </dl>
             <p>Kode kontrak lengkap ada pada <span class="mono">web/contract-config.js</span>.</p>
           </details>`;
      }
      const read = DT.readContract();
      const [regs, recalls, actors] = await Promise.all([
        read.queryFilter(read.filters.BatchRegistered(), c.deployBlock || 0, "latest"),
        read.queryFilter(read.filters.BatchRecalled(), c.deployBlock || 0, "latest"),
        read.queryFilter(read.filters.ActorRegistered(), c.deployBlock || 0, "latest"),
      ]);
      const ids = new Set(regs.map((e) => e.args.batchId));
      const batches = await Promise.all([...ids].map((id) => DT.loadBatch(id, cid, { blocks: false }).then((d) => d.batch).catch(() => null)));
      const live = batches.filter(Boolean);
      const recalled = live.filter((b) => b.recalled).length;
      const expired = live.filter((b) => !b.recalled && DT.isExpired(b.expiryDate)).length;
      const height = await DT.getReadProvider(cid).getBlockNumber();

      tallyHost.innerHTML = `
        <div><dt>Batch tercatat</dt><dd>${live.length}</dd></div>
        <div><dt>Berlaku</dt><dd>${live.length - recalled - expired}</dd></div>
        <div><dt>Recall</dt><dd style="color:var(--stamp)">${recalled}</dd></div>
        <div><dt>Aktor terdaftar</dt><dd>${new Set(actors.map((e) => e.args.actor.toLowerCase())).size}</dd></div>
        <div><dt>Blok terakhir</dt><dd>${height}</dd></div>`;

      // ---- Batch bermasalah lebih dulu, supaya angka recall terjelaskan ----
      const recalledList = live.filter((b) => b.recalled);
      const others = live.filter((b) => !b.recalled)
        .sort((a, b) => Number(b.manufactureDate - a.manufactureDate));
      const sorted = [...recalledList, ...others].slice(0, 5);
      if (sorted.length === 0) {
        lastHost.innerHTML = `<tr><td colspan="5"><div class="empty"><b>Belum ada batch pada kontrak ini</b>
          <span>Jalankan <span class="mono">npm run seed:local</span> untuk mengisi data contoh, lalu muat ulang halaman.</span></div></td></tr>`;
      } else {
        lastHost.innerHTML = sorted.map((b) => {
          const st = DT.batchStatus(b);
          // Alasan recall dipotong pada batas kata, bukan di tengah kata
          const reason = b.recallReason || "tanpa alasan tertulis";
          const short = reason.length > 58 ? reason.slice(0, 58).replace(/\s+\S*$/, "") + "…" : reason;
          const note = b.recalled
            ? `Ditarik: ${DT.escapeHtml(short)}`
            : DT.escapeHtml(b.serialNumber);
          return `<tr${b.recalled ? ' class="flagged"' : ""}>
            <td><span class="strong">${DT.escapeHtml(b.batchCode)}</span><span class="sub">${note}</span></td>
            <td class="mono">${DT.escapeHtml(b.nie)}</td>
            <td><span class="seal ${st.cls}"><i></i>${st.label}</span></td>
            <td class="mono">${DT.fmtShort(b.expiryDate)}</td>
            <td class="r"><a class="btn link" href="verifikasi.html?id=${b.batchId}">Buka kartu</a></td>
          </tr>`;
        }).join("");
      }
    } catch (e) {
      tallyHost.innerHTML = `
        <div><dt>Status</dt><dd style="font-size:0.9rem;line-height:1.3">Tidak<br>terhubung</dd></div>
        <div><dt>Perlu</dt><dd style="font-size:0.9rem;line-height:1.3">npm run<br>node</dd></div>
        <div><dt>Lalu</dt><dd style="font-size:0.9rem;line-height:1.3">npm run<br>deploy:local</dd></div>`;
      lastHost.innerHTML = `<tr><td colspan="5"><div class="empty"><b>Tidak dapat membaca kontrak</b>
        <span>${DT.escapeHtml(DT.txError(e))}</span></div></td></tr>`;
      if (pc) pc.innerHTML = `Kontrak belum terbaca<br>Jalankan node lalu deployment`;
      console.warn(e);
    }

    // ---- Aturan yang ditegakkan kontrak ----
    const rules = [
      ["Peran pemanggil diperiksa", "Fungsi bertanda onlyRole atau onlyRegulator menolak alamat yang tidak berwenang.", "bad"],
      ["Urutan tanggal produksi dan kedaluwarsa", "Kedaluwarsa harus setelah produksi; tanggal yang salah ditolak sebelum tersimpan.", "bad"],
      ["Penerima transfer harus aktor terdaftar", "Mengirim batch ke alamat tanpa role ditolak kontrak.", "bad"],
      ["Hanya pemegang batch yang boleh memindahkan", "Bukan pemegang, bukan pemindah, sekalipun pernah menerima batch itu.", "bad"],
      ["Batch recall tidak dapat dipindahtangankan", "Sekali ditandai recall, batch berhenti beredar di ledger.", "bad"],
      ["Recall tidak dapat diulang", "Menandai recall dua kali ditolak karena statusnya sudah tetap.", "bad"],
      ["Semua syarat terpenuhi", "Transaksi dicatat ke blok dan menjadi bagian riwayat permanen.", "ok"],
    ];
    rulesHost.innerHTML = rules.map(([t, d, k]) => `
      <tr${k === "ok" ? ' style="background:var(--moss-soft)"' : ""}>
        <td style="width:56%"><span class="strong">${t}</span></td>
        <td class="small muted">${d}</td>
        <td class="r">${chip(k, k === "ok" ? "Diterima" : "Ditolak")}</td>
      </tr>`).join("");

    // ---- Hak akses tiap peran ----
    const roles = [
      { n: "BPOM", t: "Regulator", d: "Satu-satunya pihak yang dapat memanggil registerActor(), dan berwenang menarik batch bermasalah.", can: ["Mendaftarkan pabrik, distributor, apotek", "Menandai batch recall", "Meninjau ringkasan jaringan"], badge: "accent", role: 4 },
      { n: "Pabrik", t: "Manufacturer", d: "Pendaftar batch. Menjadi pemegang pertama setiap batch yang dicatatnya.", can: ["Mendaftarkan batch obat", "Menyerahkan custody pertama", "Mengajukan recall atas batch yang dicatatnya"], badge: "ok", role: 1 },
      { n: "Distributor", t: "PBF", d: "Mata rantai antara pabrik dan fasilitas pelayanan kefarmasian.", can: ["Menerima custody", "Meneruskan ke apotek", "Membuka riwayat perpindahan"], badge: "ok", role: 2 },
      { n: "Apotek / RS", n2: true, t: "Pharmacy", d: "Titik akhir distribusi sebelum obat disalurkan ke pasien.", can: ["Memeriksa batch yang diterima", "Melihat asal dan waktu perpindahan", "Menyerahkan laporan ke regulator"], badge: "ok", role: 3 },
    ];
    rolesHost.innerHTML = roles.map((r) => `
      <tr>
        <td><span class="strong">${r.n}</span><span class="sub">${r.t}</span></td>
        <td>
          <span class="seal ${r.badge === "accent" ? "bad" : "ok"}"><i></i>${r.t}</span>
          <p class="small muted mt1 mb0">${r.d}</p>
        </td>
        <td>
          <ul style="margin:0;padding-left:16px" class="small muted">
            ${r.can.map((x) => `<li>${x}</li>`).join("")}
          </ul>
        </td>
      </tr>`).join("");
  }

  /* -------------------------------------------------------------- PANDUAN --- */
  function panduan() {
    // Tabel fungsi kontrak ditulis langsung di HTML; di sini hanya
    // menandai baris yang sesuai dengan role yang sedang terhubung.
    const rows = document.querySelectorAll("#fnTable tbody tr[data-roles]");
    if (!rows.length) return;
    const paint = () => {
      const role = Number(S.role);
      rows.forEach((tr) => {
        const allowed = tr.dataset.roles.split(",").map(Number);
        const on = S.address && allowed.includes(role);
        tr.classList.toggle("fresh", !!on);
        const tag = tr.querySelector("[data-mine]");
        if (tag) tag.classList.toggle("hidden", !on);
      });
    };
    DT.onChange(paint);
    paint();
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("tally")) beranda();
    if (document.getElementById("fnTable")) panduan();
  });
})();

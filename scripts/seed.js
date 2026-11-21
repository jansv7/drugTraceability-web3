// Mengisi node lokal dengan data contoh yang realistis:
//  - mendaftarkan pabrik, distributor, dan apotek
//  - mendaftarkan beberapa batch obat
//  - memindahkan custody dari pabrik ke distributor
//  - menandai satu batch sebagai recall agar alur penolakan bisa diuji
// Jalankan setelah `npx hardhat node` dan `npm run deploy:local`.
const hre = require("hardhat");

const ROLE = { None: 0, Manufacturer: 1, Distributor: 2, Pharmacy: 3, Regulator: 4 };

async function main() {
  const { ethers, network } = hre;
  const signers = await ethers.getSigners();
  if (signers.length < 5) {
    throw new Error("Seed membutuhkan minimal 5 akun. Jalankan pada jaringan lokal Hardhat.");
  }
  const [regulator, pabrik, distributor, apotek, luar] = signers;

  const cfgPath = `${__dirname}/../web/contract-config.js`;
  const fs = require("fs");
  let address = process.env.CONTRACT_ADDRESS;
  if (!address && fs.existsSync(cfgPath)) {
    const raw = fs.readFileSync(cfgPath, "utf8");
    const m = raw.match(/window\.DRUGTRACE_CONFIG\s*=\s*([\s\S]*?);\s*$/);
    if (m) {
      const cfg = JSON.parse(m[1]);
      const net = await ethers.provider.getNetwork();
      if (cfg[Number(net.chainId)]) address = cfg[Number(net.chainId)].contractAddress;
    }
  }
  if (!address) throw new Error("Alamat kontrak tidak ditemukan. Jalankan npm run deploy:local lebih dahulu.");

  const c = await ethers.getContractAt("DrugTraceability", address);

  const DAY = 86400;
  const now = Math.floor(Date.now() / 1000);
  const year = (n) => now + n * 365 * DAY;

  console.log("Mengisi data contoh pada kontrak", address);
  console.log("  Regulator (BPOM) :", regulator.address);

  // 1. Aktor
  if (Number(await c.roles(pabrik.address)) === ROLE.None) {
    await (await c.connect(regulator).registerActor(pabrik.address, ROLE.Manufacturer)).wait();
    console.log("  + Pabrik          :", pabrik.address);
  }
  if (Number(await c.roles(distributor.address)) === ROLE.None) {
    await (await c.connect(regulator).registerActor(distributor.address, ROLE.Distributor)).wait();
    console.log("  + Distributor     :", distributor.address);
  }
  if (Number(await c.roles(apotek.address)) === ROLE.None) {
    await (await c.connect(regulator).registerActor(apotek.address, ROLE.Pharmacy)).wait();
    console.log("  + Apotek          :", apotek.address);
  }

  // 2. Batch obat. Data produk bersifat contoh untuk pengujian, bukan data pasien.
  const batches = [
    { nie: "DKI123456789", batchCode: "PARA-2026-001", mfg: now - 30 * DAY, exp: year(2), serial: "SN-PR-0001", to: distributor, recall: false },
    { nie: "DKI123456789", batchCode: "PARA-2026-002", mfg: now - 10 * DAY, exp: year(2), serial: "SN-PR-0002", to: distributor, recall: false },
    { nie: "DKI998877665", batchCode: "AMOX-2026-014", mfg: now - 90 * DAY, exp: year(1), serial: "SN-AM-0014", to: distributor, recall: true },
    { nie: "DKI554433221", batchCode: "VITA-2026-003", mfg: now - 5 * DAY, exp: year(3), serial: "SN-VT-0003", to: null, recall: false },
  ];

  const registered = [];
  for (const b of batches) {
    const id = await c.computeBatchId(b.nie, b.batchCode, b.serial);
    const existing = await c.batches(id);
    if (existing.exists) {
      console.log("  = batch sudah ada :", b.batchCode);
      registered.push({ ...b, id, skipped: true });
      continue;
    }
    await (await c.connect(pabrik).registerBatch(b.nie, b.batchCode, b.mfg, b.exp, b.serial)).wait();
    console.log("  + batch           :", b.batchCode, "->", id);
    if (b.to) {
      await (await c.connect(pabrik).transferCustody(id, b.to.address)).wait();
      console.log("    -> custody ke", b.to === distributor ? "distributor" : "apotek");
    }
    if (b.recall) {
      await (await c.connect(regulator).flagRecall(id, "Hasil uji stabilitas tidak memenuhi syarat, batch ditarik dari peredaran")).wait();
      console.log("    -> ditandai recall");
    }
    registered.push({ ...b, id, skipped: false });
  }

  // 3. Satu perpindahan lanjutan agar riwayat lebih dari satu titik
  const lanjut = registered.find((b) => b.to && !b.recall);
  if (lanjut) {
    const cur = await c.batches(lanjut.id);
    if (cur.currentHolder.toLowerCase() === distributor.address.toLowerCase()) {
      await (await c.connect(distributor).transferCustody(lanjut.id, apotek.address)).wait();
      console.log("  + custody lanjutan:", lanjut.batchCode, "distributor -> apotek");
    }
  }

  console.log("=================================================");
  console.log("Data contoh selesai. Batch ID yang dapat diuji:");
  registered.forEach((b) => console.log("  " + b.batchCode + " : " + b.id));
  console.log("Akun pengujian:");
  console.log("  Regulator   :", regulator.address);
  console.log("  Pabrik      :", pabrik.address);
  console.log("  Distributor :", distributor.address);
  console.log("  Apotek      :", apotek.address);
  console.log("  Belum terdaftar (uji penolakan):", luar.address);
  console.log("=================================================");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

// Uji otomatis smart contract DrugTraceability.
// 15 pengujian: nomor 1-12 adalah skenario pengujian pada BAB III laporan UTS,
// nomor 13-15 adalah pengujian tambahan atas aturan keamanan kontrak.
const { expect } = require("chai");
const { ethers } = require("hardhat");

const Role = { None: 0, Manufacturer: 1, Distributor: 2, Pharmacy: 3, Regulator: 4 };

async function deploy() {
  const [regulator, pabrik, distributor, apotek, orangLain] = await ethers.getSigners();
  const Factory = await ethers.getContractFactory("DrugTraceability");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  return { contract, regulator, pabrik, distributor, apotek, orangLain };
}

const DAY = 24 * 60 * 60;
const now = () => Math.floor(Date.now() / 1000);

describe("DrugTraceability", function () {
  let c, regulator, pabrik, distributor, apotek, orangLain;

  beforeEach(async function () {
    ({ contract: c, regulator, pabrik, distributor, apotek, orangLain } = await deploy());
  });

  /* ---------- Skenario 1-12: BAB III laporan UTS ---------- */

  it("1. Regulator mendaftarkan Manufacturer, Distributor, dan Pharmacy", async function () {
    await c.registerActor(pabrik.address, Role.Manufacturer);
    await c.registerActor(distributor.address, Role.Distributor);
    await c.registerActor(apotek.address, Role.Pharmacy);
    expect(await c.roles(pabrik.address)).to.equal(Role.Manufacturer);
    expect(await c.roles(distributor.address)).to.equal(Role.Distributor);
    expect(await c.roles(apotek.address)).to.equal(Role.Pharmacy);
    expect(await c.regulator()).to.equal(regulator.address);
  });

  it("2. Manufacturer mendaftarkan batch yang valid", async function () {
    await c.registerActor(pabrik.address, Role.Manufacturer);
    const t = now();
    await c.connect(pabrik).registerBatch("DKI123456789", "BATCH-001", t, t + 365 * DAY, "SN-001");
    const batchId = await c.computeBatchId("DKI123456789", "BATCH-001", "SN-001");
    const b = await c.batches(batchId);
    expect(b.exists).to.equal(true);
    expect(b.nie).to.equal("DKI123456789");
    expect(b.batchCode).to.equal("BATCH-001");
    expect(b.manufacturer).to.equal(pabrik.address);
    expect(b.currentHolder).to.equal(pabrik.address);
    expect(b.recalled).to.equal(false);
  });

  it("3. registerBatch() ditolak bila pemanggil bukan Manufacturer", async function () {
    const t = now();
    await expect(
      c.connect(orangLain).registerBatch("X", "Y", t, t + DAY, "Z")
    ).to.be.revertedWith("Peran pemanggil tidak sesuai");
  });

  it("4. registerBatch() menolak kedaluwarsa yang tidak setelah tanggal produksi", async function () {
    await c.registerActor(pabrik.address, Role.Manufacturer);
    const t = now();
    await expect(
      c.connect(pabrik).registerBatch("NIE", "B", t, t, "S")
    ).to.be.revertedWith("Tanggal kedaluwarsa harus setelah tanggal produksi");
  });

  it("5. transferCustody() ke Distributor terdaftar berhasil dan memindahkan pemegang", async function () {
    await c.registerActor(pabrik.address, Role.Manufacturer);
    await c.registerActor(distributor.address, Role.Distributor);
    const t = now();
    await c.connect(pabrik).registerBatch("NIE1", "B1", t, t + 365 * DAY, "S1");
    const batchId = await c.computeBatchId("NIE1", "B1", "S1");

    await c.connect(pabrik).transferCustody(batchId, distributor.address);
    expect((await c.batches(batchId)).currentHolder).to.equal(distributor.address);
  });

  it("6. transferCustody() ditolak bila pemanggil bukan pemegang batch saat ini", async function () {
    await c.registerActor(pabrik.address, Role.Manufacturer);
    await c.registerActor(distributor.address, Role.Distributor);
    await c.registerActor(apotek.address, Role.Pharmacy);
    const t = now();
    await c.connect(pabrik).registerBatch("NIE1", "B1", t, t + 365 * DAY, "S1");
    const batchId = await c.computeBatchId("NIE1", "B1", "S1");
    await c.connect(pabrik).transferCustody(batchId, distributor.address);

    await expect(c.connect(pabrik).transferCustody(batchId, apotek.address))
      .to.be.revertedWith("Anda bukan pemegang batch saat ini");
  });

  it("7. transferCustody() ditolak bila penerima belum terdaftar sebagai aktor", async function () {
    await c.registerActor(pabrik.address, Role.Manufacturer);
    await c.registerActor(distributor.address, Role.Distributor);
    const t = now();
    await c.connect(pabrik).registerBatch("NIE1", "B1", t, t + 365 * DAY, "S1");
    const batchId = await c.computeBatchId("NIE1", "B1", "S1");
    await c.connect(pabrik).transferCustody(batchId, distributor.address);

    await expect(c.connect(distributor).transferCustody(batchId, orangLain.address))
      .to.be.revertedWith("Penerima belum terdaftar sebagai aktor rantai pasok");
  });

  it("8. verifyAuthenticity() mengembalikan data batch yang benar", async function () {
    await c.registerActor(pabrik.address, Role.Manufacturer);
    await c.registerActor(distributor.address, Role.Distributor);
    const t = now();
    await c.connect(pabrik).registerBatch("NIE2", "B2", t, t + 200 * DAY, "S2");
    const batchId = await c.computeBatchId("NIE2", "B2", "S2");
    await c.connect(pabrik).transferCustody(batchId, distributor.address);

    const v = await c.verifyAuthenticity(batchId);
    expect(v.isAuthentic).to.equal(true);
    expect(v.nie).to.equal("NIE2");
    expect(v.batchCode).to.equal("B2");
    expect(v.currentHolder).to.equal(distributor.address);
    expect(v.recalled).to.equal(false);
    expect(v.totalPerpindahan).to.equal(1n);
  });

  it("9. verifyAuthenticity() menandai batch tak terdaftar dan getTransferHistory() mencatat riwayat", async function () {
    await c.registerActor(pabrik.address, Role.Manufacturer);
    await c.registerActor(distributor.address, Role.Distributor);
    const t = now();
    await c.connect(pabrik).registerBatch("NIE2", "B2", t, t + 200 * DAY, "S2");
    const batchId = await c.computeBatchId("NIE2", "B2", "S2");
    await c.connect(pabrik).transferCustody(batchId, distributor.address);

    const hist = await c.getTransferHistory(batchId);
    expect(hist.length).to.equal(1);
    expect(hist[0].from).to.equal(pabrik.address);
    expect(hist[0].to).to.equal(distributor.address);
    expect(hist[0].timestamp).to.be.greaterThan(0n);

    const kosong = await c.verifyAuthenticity(ethers.id("tidak-ada"));
    expect(kosong.isAuthentic).to.equal(false);
    expect(kosong.totalPerpindahan).to.equal(0n);
  });

  it("10. flagRecall() oleh Regulator menandai batch dan menyimpan alasan", async function () {
    await c.registerActor(pabrik.address, Role.Manufacturer);
    const t = now();
    await c.connect(pabrik).registerBatch("NIE3", "B3", t, t + 100 * DAY, "S3");
    const batchId = await c.computeBatchId("NIE3", "B3", "S3");

    await c.flagRecall(batchId, "Kontaminasi pada lini produksi");
    const b = await c.batches(batchId);
    expect(b.recalled).to.equal(true);
    expect(b.recallReason).to.equal("Kontaminasi pada lini produksi");
  });

  it("11. batch berstatus recall tidak dapat dipindahtangankan", async function () {
    await c.registerActor(pabrik.address, Role.Manufacturer);
    await c.registerActor(distributor.address, Role.Distributor);
    const t = now();
    await c.connect(pabrik).registerBatch("NIE3", "B3", t, t + 100 * DAY, "S3");
    const batchId = await c.computeBatchId("NIE3", "B3", "S3");
    await c.flagRecall(batchId, "Kontaminasi");

    await expect(c.connect(pabrik).transferCustody(batchId, distributor.address))
      .to.be.revertedWith("Batch berstatus recall, tidak dapat dipindahtangankan");
  });

  it("12. flagRecall() ditolak bagi pihak tak berwenang dan untuk batch yang sudah recall", async function () {
    await c.registerActor(pabrik.address, Role.Manufacturer);
    await c.registerActor(distributor.address, Role.Distributor);
    const t = now();
    await c.connect(pabrik).registerBatch("NIE3", "B3", t, t + 100 * DAY, "S3");
    const batchId = await c.computeBatchId("NIE3", "B3", "S3");

    await expect(c.connect(distributor).flagRecall(batchId, "tidak berwenang"))
      .to.be.revertedWith("Hanya BPOM atau pabrik yang dapat memicu recall");

    await c.flagRecall(batchId, "Kontaminasi");
    await expect(c.flagRecall(batchId, "recall ulang"))
      .to.be.revertedWith("Batch sudah berstatus recall sebelumnya");
  });

  /* ---------- Pengujian tambahan 13-15 ---------- */

  it("13. registerActor() hanya boleh oleh Regulator dan menolak peran None", async function () {
    await expect(
      c.connect(pabrik).registerActor(pabrik.address, Role.Manufacturer)
    ).to.be.revertedWith("Hanya BPOM (regulator) yang berwenang");
    await expect(c.registerActor(pabrik.address, Role.None))
      .to.be.revertedWith("Peran tidak valid");
  });

  it("14. batch dengan kombinasi NIE/kode batch/serial sama tidak dapat didaftarkan dua kali", async function () {
    await c.registerActor(pabrik.address, Role.Manufacturer);
    const t = now();
    await c.connect(pabrik).registerBatch("NIE4", "B4", t, t + 50 * DAY, "S4");
    await expect(c.connect(pabrik).registerBatch("NIE4", "B4", t, t + 50 * DAY, "S4"))
      .to.be.revertedWith("Batch dengan kombinasi NIE/kode batch/serial ini sudah terdaftar");
  });

  it("15. transferCustody() menolak batch yang tidak pernah didaftarkan", async function () {
    await c.registerActor(distributor.address, Role.Distributor);
    await expect(c.connect(orangLain).transferCustody(ethers.id("ngawur"), distributor.address))
      .to.be.revertedWith("Batch tidak ditemukan");
  });
});

// Uji otomatis smart contract DrugTraceability.
// Mengikuti 12 skenario pengujian pada BAB III laporan UTS + pengujian tambahan.
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

describe("DrugTraceability", function () {
  let c, regulator, pabrik, distributor, apotek, orangLain;
  let batchId;

  beforeEach(async function () {
    ({ contract: c, regulator, pabrik, distributor, apotek, orangLain } = await deploy());
  });

  it("1. Regulator mendaftarkan aktor (Manufacturer/Distributor/Pharmacy)", async function () {
    await c.registerActor(pabrik.address, Role.Manufacturer);
    await c.registerActor(distributor.address, Role.Distributor);
    await c.registerActor(apotek.address, Role.Pharmacy);
    expect(await c.roles(pabrik.address)).to.equal(Role.Manufacturer);
    expect(await c.roles(distributor.address)).to.equal(Role.Distributor);
    expect(await c.roles(apotek.address)).to.equal(Role.Pharmacy);
    expect(await c.regulator()).to.equal(regulator.address);
  });

  it("2. Manufacturer mendaftarkan batch valid; 3. non-Manufacturer ditolak", async function () {
    await c.registerActor(pabrik.address, Role.Manufacturer);
    const now = Math.floor(Date.now() / 1000);
    const tx = await c.connect(pabrik).registerBatch("DKI123456789", "BATCH-001", now, now + 365 * DAY, "SN-001");
    await tx.wait();
    batchId = await c.computeBatchId("DKI123456789", "BATCH-001", "SN-001");
    const b = await c.batches(batchId);
    expect(b.exists).to.equal(true);
    expect(b.currentHolder).to.equal(pabrik.address);

    await expect(
      c.connect(orangLain).registerBatch("X", "Y", now, now + DAY, "Z")
    ).to.be.revertedWith("Peran pemanggil tidak sesuai");
  });

  it("4. Tanggal kedaluwarsa <= tanggal produksi ditolak", async function () {
    await c.registerActor(pabrik.address, Role.Manufacturer);
    const now = Math.floor(Date.now() / 1000);
    await expect(
      c.connect(pabrik).registerBatch("NIE", "B", now, now, "S")
    ).to.be.revertedWith("Tanggal kedaluwarsa harus setelah tanggal produksi");
  });

  it("5. Transfer ke Distributor terdaftar berhasil; 6-7 ditolak sesuai aturan", async function () {
    await c.registerActor(pabrik.address, Role.Manufacturer);
    await c.registerActor(distributor.address, Role.Distributor);
    const now = Math.floor(Date.now() / 1000);
    await c.connect(pabrik).registerBatch("NIE1", "B1", now, now + 365 * DAY, "S1");
    batchId = await c.computeBatchId("NIE1", "B1", "S1");

    await c.connect(pabrik).transferCustody(batchId, distributor.address);
    expect((await c.batches(batchId)).currentHolder).to.equal(distributor.address);

    // 6. bukan pemegang batch
    await expect(c.connect(pabrik).transferCustody(batchId, apotek.address))
      .to.be.revertedWith("Anda bukan pemegang batch saat ini");

    // 7. penerima belum terdaftar
    await expect(c.connect(distributor).transferCustody(batchId, orangLain.address))
      .to.be.revertedWith("Penerima belum terdaftar sebagai aktor rantai pasok");
  });

  it("8-9. verifyAuthenticity() dan getTransferHistory() mengembalikan data", async function () {
    await c.registerActor(pabrik.address, Role.Manufacturer);
    await c.registerActor(distributor.address, Role.Distributor);
    const now = Math.floor(Date.now() / 1000);
    await c.connect(pabrik).registerBatch("NIE2", "B2", now, now + 200 * DAY, "S2");
    batchId = await c.computeBatchId("NIE2", "B2", "S2");
    await c.connect(pabrik).transferCustody(batchId, distributor.address);

    const v = await c.verifyAuthenticity(batchId);
    expect(v.isAuthentic).to.equal(true);
    expect(v.nie).to.equal("NIE2");
    expect(v.batchCode).to.equal("B2");
    expect(v.currentHolder).to.equal(distributor.address);
    expect(v.recalled).to.equal(false);
    expect(v.totalPerpindahan).to.equal(1n);

    const hist = await c.getTransferHistory(batchId);
    expect(hist.length).to.equal(1);
    expect(hist[0].from).to.equal(pabrik.address);
    expect(hist[0].to).to.equal(distributor.address);

    const kosong = await c.verifyAuthenticity(ethers.id("tidak-ada"));
    expect(kosong.isAuthentic).to.equal(false);
  });

  it("10-12. flagRecall() oleh Regulator/Pabrik; batch recall tidak bisa ditransfer & tidak bisa di-recall ulang", async function () {
    await c.registerActor(pabrik.address, Role.Manufacturer);
    await c.registerActor(distributor.address, Role.Distributor);
    const now = Math.floor(Date.now() / 1000);
    await c.connect(pabrik).registerBatch("NIE3", "B3", now, now + 100 * DAY, "S3");
    batchId = await c.computeBatchId("NIE3", "B3", "S3");

    // distributor tidak berwenang: hanya regulator atau pabrik
    await expect(c.connect(distributor).flagRecall(batchId, "tidak berwenang"))
      .to.be.revertedWith("Hanya BPOM atau pabrik yang dapat memicu recall");

    await c.flagRecall(batchId, "Kontaminasi pada lini produksi");
    const b = await c.batches(batchId);
    expect(b.recalled).to.equal(true);
    expect(b.recallReason).to.equal("Kontaminasi pada lini produksi");

    await expect(c.connect(pabrik).transferCustody(batchId, distributor.address))
      .to.be.revertedWith("Batch berstatus recall, tidak dapat dipindahtangankan");

    await expect(c.flagRecall(batchId, "recall ulang"))
      .to.be.revertedWith("Batch sudah berstatus recall sebelumnya");
  });

  it("13. registerActor() hanya boleh oleh Regulator dan tidak boleh role None", async function () {
    await expect(
      c.connect(pabrik).registerActor(pabrik.address, Role.Manufacturer)
    ).to.be.revertedWith("Hanya BPOM (regulator) yang berwenang");
    await expect(c.registerActor(pabrik.address, Role.None))
      .to.be.revertedWith("Peran tidak valid");
  });

  it("14. Batch dengan kombinasi NIE/kode batch/serial sama tidak dapat didaftarkan dua kali", async function () {
    await c.registerActor(pabrik.address, Role.Manufacturer);
    const now = Math.floor(Date.now() / 1000);
    await c.connect(pabrik).registerBatch("NIE4", "B4", now, now + 50 * DAY, "S4");
    await expect(c.connect(pabrik).registerBatch("NIE4", "B4", now, now + 50 * DAY, "S4"))
      .to.be.revertedWith("Batch dengan kombinasi NIE/kode batch/serial ini sudah terdaftar");
  });

  it("15. transferCustody() menolak batch yang tidak pernah didaftarkan", async function () {
    await c.registerActor(distributor.address, Role.Distributor);
    await expect(c.connect(orangLain).transferCustody(ethers.id("ngawur"), distributor.address))
      .to.be.revertedWith("Batch tidak ditemukan");
  });
});

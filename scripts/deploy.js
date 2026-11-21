// Menyebarkan kontrak DrugTraceability lalu menulis:
//  - web/contract-config.js  (alamat + chainId, dipakai frontend)
//  - web/abi/DrugTraceability.json (ABI hasil kompilasi)
//  - deployments/<network>.json (catatan deployment)
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const { ethers, network, artifacts } = hre;

  const [deployer] = await ethers.getSigners();
  const Factory = await ethers.getContractFactory("DrugTraceability");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const receipt = await contract.deploymentTransaction().wait();

  const net = await ethers.provider.getNetwork();
  const chainId = Number(net.chainId);

  const art = await artifacts.readArtifact("DrugTraceability");

  // 1. ABI untuk frontend. Ditulis sebagai .json (dokumentasi) dan .js
  //    (agar halaman bisa dibuka langsung lewat file:// tanpa perlu server).
  const abiDir = path.join(__dirname, "..", "web", "abi");
  fs.mkdirSync(abiDir, { recursive: true });
  fs.writeFileSync(
    path.join(abiDir, "DrugTraceability.json"),
    JSON.stringify({ contractName: "DrugTraceability", abi: art.abi }, null, 2)
  );
  fs.writeFileSync(
    path.join(abiDir, "DrugTraceability.js"),
    "// Dibuat otomatis oleh scripts/deploy.js. Jangan diedit manual.\n" +
      "window.DRUGTRACE_ABI = " +
      JSON.stringify({ contractName: "DrugTraceability", abi: art.abi }, null, 2) +
      ";\n"
  );

  // 2. Konfigurasi kontrak per chainId
  const cfgPath = path.join(__dirname, "..", "web", "contract-config.js");
  let cfg = {};
  if (fs.existsSync(cfgPath)) {
    const raw = fs.readFileSync(cfgPath, "utf8");
    const m = raw.match(/window\.DRUGTRACE_CONFIG\s*=\s*([\s\S]*?);\s*$/);
    if (m) { try { cfg = JSON.parse(m[1]); } catch (e) { cfg = {}; } }
  }
  cfg[chainId] = {
    contractAddress: address,
    network: network.name,
    rpcUrl: chainId === 31337 ? "http://127.0.0.1:8545" : (process.env.SEPOLIA_RPC_URL || ""),
    deployBlock: receipt.blockNumber,
    deployedAt: new Date().toISOString(),
  };
  const fileBody =
    "// Dibuat otomatis oleh scripts/deploy.js. Jangan diedit manual.\n" +
    "// Alamat kontrak per chainId. Frontend memilih entri sesuai jaringan wallet.\n" +
    "window.DRUGTRACE_CONFIG = " +
    JSON.stringify(cfg, null, 2) +
    ";\n";
  fs.writeFileSync(cfgPath, fileBody);

  // 3. Catatan deployment
  const depDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(depDir, { recursive: true });
  const record = {
    network: network.name,
    chainId,
    contractAddress: address,
    deployer: deployer.address,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(depDir, `${network.name}-${chainId}.json`), JSON.stringify(record, null, 2));

  console.log("=================================================");
  console.log("DrugTraceability berhasil di-deploy");
  console.log("  jaringan   :", network.name, "(chainId " + chainId + ")");
  console.log("  kontrak    :", address);
  console.log("  deployer   :", deployer.address, "(otomatis jadi Regulator/BPOM)");
  console.log("  tx hash    :", receipt.hash);
  console.log("  blok       :", receipt.blockNumber);
  console.log("File yang diperbarui:");
  console.log("  web/abi/DrugTraceability.json");
  console.log("  web/abi/DrugTraceability.js");
  console.log("  web/contract-config.js");
  console.log("  deployments/" + network.name + "-" + chainId + ".json");
  console.log("=================================================");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

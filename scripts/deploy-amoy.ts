/**
 * Akıllı sözleşmeyi Polygon Amoy TEST AĞINA yükler — `npm run contract:deploy`
 *   Önce: npm run contract:compile  (src/server/abi/AgriShieldPolicy.json)
 *   .env.local: AMOY_PRIVATE_KEY (yalnız testnet cüzdanı, gerçek değer tutmaz), isteğe bağlı AMOY_RPC_URL
 *   Test POL: https://faucet.polygon.technology (Amoy)
 *
 * Güvenlik: yalnız chainId 80002'ye yükler; anahtar ekrana/dosyaya yazılmaz. Sözleşme adresi herkese açık bir
 * bilgidir ve contracts/deployments/amoy.json'a kaydedilir; CONTRACT_ADDRESS satırını .env.local'a siz ekleyin
 * (ya da --yaz ile betik ekler).
 */
import fs from "node:fs";
import path from "node:path";
import { ethers } from "ethers";

for (const f of [".env.local", ".env"]) {
  try {
    if (fs.existsSync(f)) process.loadEnvFile(f);
  } catch {
    /* yoksay */
  }
}

const AMOY_CHAIN_ID = 80002n;
const rpc = process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology";
const pk = process.env.AMOY_PRIVATE_KEY;
const write = process.argv.includes("--yaz");

async function main() {
  if (!pk) {
    console.error("AMOY_PRIVATE_KEY yok. .env.local'a YALNIZ test ağı cüzdanının anahtarını yazın (repoya asla).");
    process.exit(1);
  }
  const artifactPath = path.join(process.cwd(), "src", "server", "abi", "AgriShieldPolicy.json");
  if (!fs.existsSync(artifactPath)) {
    console.error("Derleme çıktısı yok: önce `npm run contract:compile`.");
    process.exit(1);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8")) as { abi: ethers.InterfaceAbi; bytecode: string; compiler: string };

  const provider = new ethers.JsonRpcProvider(rpc);
  const net = await provider.getNetwork();
  if (net.chainId !== AMOY_CHAIN_ID) {
    console.error(`Beklenen ağ Polygon Amoy (80002), bağlanılan: ${net.chainId}. Güvenlik için durduruldu.`);
    process.exit(1);
  }
  const wallet = new ethers.Wallet(pk, provider);
  const bal = await provider.getBalance(wallet.address);
  console.log(`Ağ: Polygon Amoy · cüzdan ${wallet.address} · bakiye ${ethers.formatEther(bal)} POL (test)`);
  if (bal === 0n) {
    console.error("Bakiye 0. Amoy musluğundan test POL alın: https://faucet.polygon.technology");
    process.exit(1);
  }

  // Prototipte kâhin (oracle) ve ödeme referansçısı (payer) aynı sunucu cüzdanıdır; üretimde ayrı anahtarlar + çoklu imza.
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  console.log("Yükleniyor…");
  const contract = await factory.deploy(wallet.address, wallet.address);
  const tx = contract.deploymentTransaction();
  const rc = await tx?.wait();
  const address = await contract.getAddress();
  const explorer = `https://amoy.polygonscan.com/address/${address}`;
  console.log(`✓ Sözleşme: ${address}\n  işlem: https://amoy.polygonscan.com/tx/${tx?.hash}\n  blok: ${rc?.blockNumber}\n  ${explorer}`);

  const dir = path.join(process.cwd(), "contracts", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "amoy.json"),
    JSON.stringify({ network: "polygon-amoy", chainId: 80002, address, txHash: tx?.hash, blockNumber: rc?.blockNumber, deployer: wallet.address, compiler: artifact.compiler, deployedAt: new Date().toISOString(), explorer }, null, 2),
  );

  const line = `CONTRACT_ADDRESS=${address}`;
  if (write) {
    const envLocal = path.join(process.cwd(), ".env.local");
    const prev = fs.existsSync(envLocal) ? fs.readFileSync(envLocal, "utf8") : "";
    const next = /^CONTRACT_ADDRESS=.*$/m.test(prev) ? prev.replace(/^CONTRACT_ADDRESS=.*$/m, line) : `${prev.replace(/\s*$/, "")}\n${line}\n`;
    fs.writeFileSync(envLocal, next);
    console.log(`\n.env.local güncellendi: ${line}`);
  } else {
    console.log(`\n.env.local'a ekleyin:\n  ${line}\n  CHAIN_MODE=amoy\n  OFFLINE=0`);
  }
}

void main().catch((e) => {
  console.error("Yükleme başarısız:", e instanceof Error ? e.message : e);
  process.exit(1);
});

/**
 * Sözleşmeyi solc-js ile derler → src/server/abi/AgriShieldPolicy.json (ABI + bytecode).
 *   npm run contract:compile
 */
import fs from "node:fs";
import path from "node:path";
// @ts-expect-error solc tipleri yok
import solc from "solc";

const file = path.join(process.cwd(), "contracts", "AgriShieldPolicy.sol");
const source = fs.readFileSync(file, "utf8");

const input = {
  language: "Solidity",
  sources: { "AgriShieldPolicy.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: "paris",
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "evm.gasEstimates"] } },
  },
};

const out = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (out.errors ?? []).filter((e: { severity: string }) => e.severity === "error");
for (const e of out.errors ?? []) console.log(`[${e.severity}] ${e.formattedMessage}`);
if (errors.length) process.exit(1);

const c = out.contracts["AgriShieldPolicy.sol"].AgriShieldPolicy;
const dir = path.join(process.cwd(), "src", "server", "abi");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(
  path.join(dir, "AgriShieldPolicy.json"),
  JSON.stringify({ contractName: "AgriShieldPolicy", compiler: solc.version(), abi: c.abi, bytecode: `0x${c.evm.bytecode.object}` }, null, 2),
);
console.log(`Derlendi (solc ${solc.version()}): ${c.abi.length} ABI öğesi, bytecode ${c.evm.bytecode.object.length / 2} bayt.`);

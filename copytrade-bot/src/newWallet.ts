/** Crea una wallet nueva SOLO para el bot.  npm run wallet:new */
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const kp = Keypair.generate();
console.log("Dirección (envía aquí el SOL que quieras arriesgar):");
console.log("  " + kp.publicKey.toBase58());
console.log("\nClave privada (ponla en PRIVATE_KEY del .env y NO la compartas con nadie):");
console.log("  " + bs58.encode(kp.secretKey));

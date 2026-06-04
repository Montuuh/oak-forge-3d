/**
 * Sincroniza todo el catálogo N3D: actualiza existentes y crea los que falten.
 * Uso: npm run sync:n3d:overwrite-all
 */
import dotenv from "dotenv";
import { runN3dMassOverwrite } from "../lib/n3d-catalog-sync";
import { createConsoleN3dSyncLogger } from "../lib/n3d-sync-log";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
    const result = await runN3dMassOverwrite({ onLog: createConsoleN3dSyncLogger() });
    console.log(JSON.stringify(result, null, 2));
    if (result.errors.length > 0) process.exit(1);
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});

import { exportCatalogPublicJson } from "../lib/catalog-export";

async function main() {
    const result = await exportCatalogPublicJson();
    console.log(
        `Exported ${result.productCount} product(s) to catalog-public.json (${result.placeholderCount} sin imagen principal, PND).`,
    );
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

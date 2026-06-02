import { chromium } from "playwright";

const PAGES = [
    { path: "/", expectText: "Catálogo en preparación" },
    { path: "/admin/login", expectText: "Admin Login" },
];

async function main() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const results: { path: string; status: number; ok: boolean; detail: string }[] = [];

    try {
        for (const { path, expectText } of PAGES) {
            const response = await page.goto(`http://localhost:3000${path}`, {
                waitUntil: "domcontentloaded",
                timeout: 30000,
            });
            const status = response?.status() ?? 0;
            const body = await page.content();
            const hasText = body.includes(expectText);
            results.push({
                path,
                status,
                ok: status === 200 && hasText,
                detail: hasText ? "found expected text" : `missing "${expectText}"`,
            });
        }

        console.log(JSON.stringify({ success: results.every((r) => r.ok), results }, null, 2));
        if (!results.every((r) => r.ok)) process.exit(1);
    } finally {
        await browser.close();
    }
}

main().catch((error) => {
    console.error(JSON.stringify({ success: false, message: String(error) }, null, 2));
    process.exit(1);
});

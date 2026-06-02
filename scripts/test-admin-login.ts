import dotenv from "dotenv";
import { chromium } from "playwright";

dotenv.config({ path: ".env.local" });

async function main() {
    const password = process.env.ADMIN_PASSWORD;
    if (!password) {
        throw new Error("ADMIN_PASSWORD is missing in .env.local");
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto("http://localhost:3000/admin/login", { waitUntil: "domcontentloaded" });
        await page.fill('input[name="password"]', password);

        await Promise.all([
            page.waitForURL((url) => !url.pathname.includes("/admin/login"), { timeout: 15000 }),
            page.locator('form[action="/api/admin/login"] button[type="submit"]').click(),
        ]);

        const finalUrl = page.url();
        const title = await page.title();
        const hasProductsLink = (await page.locator('a[href="/admin/products"]').count()) > 0;

        await page.goto("http://localhost:3000/admin/products", { waitUntil: "domcontentloaded" });
        const productsUrl = page.url();
        const productsOnLogin = productsUrl.includes("/admin/login");

        console.log(JSON.stringify({
            success: true,
            finalUrl,
            title,
            hasProductsLink,
            productsUrl,
            productsProtected: !productsOnLogin,
        }, null, 2));
    } finally {
        await browser.close();
    }
}

main().catch((error) => {
    console.error(JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : String(error),
    }, null, 2));
    process.exit(1);
});

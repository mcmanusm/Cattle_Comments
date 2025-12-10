const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
    const url = "https://mcmanusm.github.io/Cattle_Comments/";

    const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    // Wait for iframe
    await page.waitForSelector("#pbiFrame");

    const frameHandle = await page.$("#pbiFrame");
    const frame = await frameHandle.contentFrame();

    // ---- NEW: Dump accessibility tree ----
    const accTree = await frame.accessibility.snapshot();
    console.log("=== A11Y START ===");
    console.log(JSON.stringify(accTree, null, 2));
    console.log("=== A11Y END ===");

    // ---- Wait for Power BI visuals to render ----
    await new Promise(r => setTimeout(r, 6000));

    // ---- Dump all visible text (debugging) ----
    const allText = await frame.evaluate(() => document.body.innerText);
    console.log("=== DEBUG START ===");
    console.log(allText);
    console.log("=== DEBUG END ===");

    // ---- Regex extract function (placeholder for now) ----
    function extract(pattern) {
        const match = allText.match(pattern);
        return match ? match[1].trim() : null;
    }

    // ---- Metrics object (will update once we know A11Y structure) ----
    const metrics = {
        total_head: extract(/Commercial Cattle Offerings\s*([\d,]+)/i),
        amount_over_reserve: extract(/Amount Over Reserve \(VOR\)\s*\$?([\d,]+)/i),
        clearance_rate: extract(/Clearance Rate \(\%\)\s*([\d,]+)\s*%/i),
        ayci_dw: extract(/AYCI c\/kg DW\s*([\d,]+)/i)
    };

    console.log("Scraped metrics:", metrics);

    // ---- Save JSON ----
    fs.writeFileSync("metrics.json", JSON.stringify(metrics, null, 2));

    await browser.close();
})();

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

    // ---- A11Y DUMP ----
    const accTree = await frame.accessibility.snapshot();
    console.log("=== A11Y START ===");
    console.log(JSON.stringify(accTree, null, 2));
    console.log("=== A11Y END ===");

    // ---- Wait for PB visuals ----
    await new Promise(r => setTimeout(r, 6000));

    // ---- Extract all text ----
    const allText = await frame.evaluate(() => document.body.innerText);
    console.log("=== DEBUG START ===");
    console.log(allText);
    console.log("=== DEBUG END ===");

    // ---- Extract helper ----
    function extract(pattern) {
        const match = allText.match(pattern);
        return match ? match[1].trim() : null;
    }

    // ---- UPDATED REGEX FOR NEW LABELS ----
    const metrics = {
        total_head: extract(/Total Head Incl Reoffers\s*([\d,]+)/i),

        amount_over_reserve: extract(/Amount Over Reserve\s*\$?([\d,]+)/i),

        clearance_rate: extract(/Clearance Rate\s*\(%?\)\s*([\d,]+)/i),

        ayci_dw: extract(/AYCI c\/kg DW\s*([\d,]+)/i)
    };

    console.log("Scraped metrics:", metrics);

    fs.writeFileSync("metrics.json", JSON.stringify(metrics, null, 2));

    await browser.close();
})();

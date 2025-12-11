const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
    const url = "https://mcmanusm.github.io/Cattle_Comments/table.html";

    const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    await page.waitForSelector("iframe");

    const frameHandle = await page.$("iframe");
    const frame = await frameHandle.contentFrame();

    // Give Power BI more time
    await new Promise(r => setTimeout(r, 8000));

    const allText = await frame.evaluate(() => document.body.innerText);

    console.log("=== DEBUG TEXT START ===");
    console.log(allText);
    console.log("=== DEBUG TEXT END ===");

    // Clean helper
    const clean = v =>
        v ? v.replace(/[^\d\-.,]/g, "").trim() : null;

    // Extract table rows using regex
    const rowRegex = /(\d[\d,]*)\s*\n(\d+%)\s*\n\$(\d+)\s*\n([\d,]+)\s*\n/g;

    const rows = [];
    let match;

    while ((match = rowRegex.exec(allText)) !== null) {
        rows.push({
            total_head: clean(match[1]),
            clearance_rate: clean(match[2]),
            amount_over_reserve: clean(match[3]),
            ayci_dw: clean(match[4])
        });
    }

    if (rows.length < 4) {
        throw new Error("❌ Could not extract all 4 table rows from text.");
    }

    const metrics = {
        this_week: rows[0],
        last_week: rows[1],
        two_weeks_ago: rows[2],
        three_weeks_ago: rows[3]
    };

    console.log("SCRAPED METRICS:", metrics);

    fs.writeFileSync("metrics.json", JSON.stringify(metrics, null, 2));

    await browser.close();
})();

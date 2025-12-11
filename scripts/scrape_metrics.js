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

    // Wait for iframe
    await page.waitForSelector("#pbiTable");

    const frameHandle = await page.$("#pbiTable");
    const frame = await frameHandle.contentFrame();

    // Wait for Power BI to render
    await new Promise(r => setTimeout(r, 6000));

    // Dump all text
    const allText = await frame.evaluate(() => document.body.innerText);
    console.log("=== DEBUG START ===");
    console.log(allText);
    console.log("=== DEBUG END ===");

    // Helper to clean numeric values
    const clean = (v) => v.replace(/[\$,c%p ]+/g, "").trim();

    // ROW CAPTURE REGEX
    // Captures:
    // index, total head, clearance %, VOR, AYCI, ayci change,
    // total head change, clearance change, vor change
    const rowRegex = /Select Row\s*(\d+)\s*([\d,]+)\s*([\d.]+%)\s*\$?(-?[\d,]+)\s*([\d,]+)\s*(-?[\d]+c)\s*(-?[\d.]+%)\s*(-?[\d]+pp)\s*\$?(-?[\d,]+)/g;

    const rows = [];
    let match;
    while ((match = rowRegex.exec(allText)) !== null) {
        rows.push({
            index: match[1],
            total_head: clean(match[2]),
            clearance_rate: clean(match[3]),
            amount_over_reserve: clean(match[4]),
            ayci_dw: clean(match[5]),
            ayci_change: clean(match[6]),
            total_head_change: clean(match[7]),
            clearance_rate_change: clean(match[8]),
            vor_change: clean(match[9])
        });
    }

    if (rows.length !== 4) {
        console.error("❌ ERROR: Expected 4 rows but found:", rows.length);
        console.error(rows);
        process.exit(1);
    }

    // Map rows to week labels
    const metrics = {
        this_week: rows[0],
        last_week: rows[1],
        two_weeks_ago: rows[2],
        three_weeks_ago: rows[3]
    };

    console.log("Scraped Metrics:", metrics);

    // Save JSON
    fs.writeFileSync("metrics.json", JSON.stringify(metrics, null, 2));

    await browser.close();
})();

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

    // Wait for iframe to appear
    await page.waitForSelector("iframe");

    const frameHandle = await page.$("iframe");
    const frame = await frameHandle.contentFrame();

    // Give Power BI extra time to fully render the table
    await new Promise(r => setTimeout(r, 8000));

    // Extract ALL text from inside iframe (debug purposes)
    const allText = await frame.evaluate(() => document.body.innerText);
    console.log("=== DEBUG TEXT START ===");
    console.log(allText);
    console.log("=== DEBUG TEXT END ===");

    // Extract table data
    const rows = await frame.evaluate(() => {
        const cells = Array.from(document.querySelectorAll('div[role="gridcell"]'));

        if (!cells.length) return null;

        const map = {};
        cells.forEach(cell => {
            const row = parseInt(cell.getAttribute("row-index"));
            const col = parseInt(cell.getAttribute("column-index"));
            const text = cell.innerText.trim();
            if (!map[row]) map[row] = {};
            map[row][col] = text;
        });

        return map;
    });

    if (!rows || !rows[1]) {
        throw new Error("❌ ERROR: Power BI table did NOT load any gridcell elements.");
    }

    // Clean function to standardise values
    function clean(v) {
        if (!v) return null;
        return v.replace(/[^\d\-.,]/g, "").trim();
    }

    // Build metrics JSON using row indexes:
    // Row 1 = This Week
    // Row 2 = Last Week
    // Row 3 = Two Weeks Ago
    // Row 4 = Three Weeks Ago

    const metrics = {
        this_week: {
            total_head: clean(rows[1][1]),
            clearance_rate: clean(rows[1][2]),
            amount_over_reserve: clean(rows[1][3]),
            ayci_dw: clean(rows[1][4])
        },
        last_week: {
            total_head: clean(rows[2][1]),
            clearance_rate: clean(rows[2][2]),
            amount_over_reserve: clean(rows[2][3]),
            ayci_dw: clean(rows[2][4])
        },
        two_weeks_ago: {
            total_head: clean(rows[3][1]),
            clearance_rate: clean(rows[3][2]),
            amount_over_reserve: clean(rows[3][3]),
            ayci_dw: clean(rows[3][4])
        },
        three_weeks_ago: {
            total_head: clean(rows[4][1]),
            clearance_rate: clean(rows[4][2]),
            amount_over_reserve: clean(rows[4][3]),
            ayci_dw: clean(rows[4][4])
        }
    };

    console.log("SCRAPED METRICS:", metrics);

    // Save JSON to file
    fs.writeFileSync("metrics.json", JSON.stringify(metrics, null, 2));

    await browser.close();
})();

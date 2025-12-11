const fs = require("fs");
const puppeteer = require("puppeteer");

(async () => {

    const url = "https://mcmanusm.github.io/Cattle_Comments/table.html";

    const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    // Wait for Power BI iframe
    await page.waitForSelector("#pbiTable");

    const frameHandle = await page.$("#pbiTable");
    const frame = await frameHandle.contentFrame();

    // Wait for table cells
    await frame.waitForSelector('div[role="gridcell"]');

    // Extract full table
    const rows = await frame.evaluate(() => {
        const cells = Array.from(document.querySelectorAll('div[role="gridcell"]'));

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

    // Helper to clean numeric strings
    const clean = v => v.replace(/[$,%c]/g, "");

    // Build JSON using real column indexes
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

    fs.writeFileSync("metrics.json", JSON.stringify(metrics, null, 2));

    await browser.close();
})();

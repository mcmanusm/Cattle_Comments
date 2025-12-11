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

    await page.waitForSelector("#pbiTable");

    const frameHandle = await page.$("#pbiTable");
    const frame = await frameHandle.contentFrame();

    await new Promise(r => setTimeout(r, 6000));

    const allText = await frame.evaluate(() => document.body.innerText);

    console.log("=== DEBUG START ===");
    console.log(allText);
    console.log("=== DEBUG END ===");

    const lines = allText.split("\n").map(l => l.trim()).filter(Boolean);

    const rows = [];
    for (let i = 0; i < lines.length; i++) {

        if (lines[i] === "Select Row") {
            const block = lines.slice(i, i + 11); // grab next 10 fields

            const row = {
                index: block[1],
                total_head: block[2].replace(/[^\d-]/g, ""),
                clearance_rate: block[3].replace(/[^\d-]/g, ""),
                amount_over_reserve: block[4].replace(/[^\d-]/g, ""),
                ayci_dw: block[5].replace(/[^\d-]/g, ""),
                ayci_change: block[6].replace(/[^\d-]/g, ""),
                total_head_change: block[7].replace(/[^\d-]/g, ""),
                clearance_rate_change: block[8].replace(/[^\d-]/g, ""),
                vor_change: block[9].replace(/[^\d-]/g, "")
            };

            rows.push(row);
        }
    }

    if (rows.length !== 4) {
        console.error("❌ ERROR: Expected 4 rows but found:", rows.length);
        console.error(rows);
        process.exit(1);
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

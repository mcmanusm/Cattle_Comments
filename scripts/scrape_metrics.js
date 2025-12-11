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

    // Wait for visuals to finish rendering
    await new Promise(r => setTimeout(r, 6000));

    // Extract all visible text from the report
    const allText = await frame.evaluate(() => document.body.innerText);
    console.log("=== DEBUG TEXT DUMP START ===");
    console.log(allText);
    console.log("=== DEBUG TEXT DUMP END ===");

    // CLEANER regex extract helper
    function extract(pattern) {
        const match = allText.match(pattern);
        return match ? match[1].replace(/[, $]/g, "").trim() : null;
    }

    // ----------------------------
    // MAIN METRICS (THIS WEEK)
    // ----------------------------
    const thisWeek = {
        total_head: extract(/Total Head Incl Reoffers\s*([\d,]+)/i),
        clearance_rate: extract(/Clearance Rate[^0-9]*([\d.]+)/i),
        vor: extract(/Amount Over Reserve[^0-9]*([\d.]+)/i),
        ayci: extract(/AYCI c\/kg DW\s*([\d,]+)/i)
    };

    // ----------------------------
    // LAST WEEK
    // ----------------------------
    const lastWeek = {
        total_head: extract(/Last Week[\s\S]*?Total Head Incl Reoffers\s*([\d,]+)/i),
        clearance_rate: extract(/Last Week[\s\S]*?Clearance Rate[^0-9]*([\d.]+)/i),
        vor: extract(/Last Week[\s\S]*?Amount Over Reserve[^0-9]*([\d.]+)/i),
        ayci: extract(/Last Week[\s\S]*?AYCI c\/kg DW\s*([\d,]+)/i)
    };

    // ----------------------------
    // TWO WEEKS AGO
    // ----------------------------
    const twoWeeks = {
        total_head: extract(/2 Weeks Ago[\s\S]*?Total Head Incl Reoffers\s*([\d,]+)/i),
        clearance_rate: extract(/2 Weeks Ago[\s\S]*?Clearance Rate[^0-9]*([\d.]+)/i),
        vor: extract(/2 Weeks Ago[\s\S]*?Amount Over Reserve[^0-9]*([\d.]+)/i),
        ayci: extract(/2 Weeks Ago[\s\S]*?AYCI c\/kg DW\s*([\d,]+)/i)
    };

    // ----------------------------
    // THREE WEEKS AGO
    // ----------------------------
    const threeWeeks = {
        total_head: extract(/3 Weeks Ago[\s\S]*?Total Head Incl Reoffers\s*([\d,]+)/i),
        clearance_rate: extract(/3 Weeks Ago[\s\S]*?Clearance Rate[^0-9]*([\d.]+)/i),
        vor: extract(/3 Weeks Ago[\s\S]*?Amount Over Reserve[^0-9]*([\d.]+)/i),
        ayci: extract(/3 Weeks Ago[\s\S]*?AYCI c\/kg DW\s*([\d,]+)/i)
    };

    // Final JSON structure
    const metrics = {
        this_week: thisWeek,
        last_week: lastWeek,
        two_weeks_ago: twoWeeks,
        three_weeks_ago: threeWeeks
    };

    console.log("SCRAPED METRICS:", metrics);

    fs.writeFileSync("metrics.json", JSON.stringify(metrics, null, 2));
    await browser.close();
})();

const fs = require("fs");
const puppeteer = require("puppeteer");

(async () => {
    const url = "https://mcmanusm.github.io/Cattle_Comments/";

    const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    await page.waitForSelector("#pbiFrame");
    const frameHandle = await page.$("#pbiFrame");
    const frame = await frameHandle.contentFrame();

    // Helper to wait for Power BI visuals to render
    async function waitRender() {
        await new Promise(r => setTimeout(r, 6000));
    }

    // Extract helper (your EXACT working regex system)
    function extract(text, pattern) {
        const match = text.match(pattern);
        return match ? match[1].trim() : null;
    }

    // Extract all metrics using your verified regex patterns
    function extractMetrics(text) {
        return {
            total_head: extract(text, /Commercial Cattle Offerings\s*([\d,]+)/i),
            amount_over_reserve: extract(text, /Amount Over Reserve \(VOR\)\s*\$?([\d,]+)/i),
            clearance_rate: extract(text, /Clearance Rate \(\%\)\s*([\d,]+)\s*%/i),
            ayci_dw: extract(text, /AYCI c\/kg DW\s*([\d,]+)/i)
        };
    }

    // Click a tab by visible name
    async function clickTab(label) {
        await frame.evaluate((tabName) => {
            const buttons = [...document.querySelectorAll("*")];
            const el = buttons.find(x => x.innerText && x.innerText.trim() === tabName);
            if (el) el.click();
        }, label);

        await waitRender();
    }

    // SCRAPE ALL 4 WEEKS
    const results = {};

    // THIS WEEK
    await clickTab("This Week");
    let textTW = await frame.evaluate(() => document.body.innerText);
    results.this_week = extractMetrics(textTW);

    // LAST WEEK
    await clickTab("Last Week");
    let textLW = await frame.evaluate(() => document.body.innerText);
    results.last_week = extractMetrics(textLW);

    // 2 WEEKS AGO
    await clickTab("2 Weeks Ago");
    let text2W = await frame.evaluate(() => document.body.innerText);
    results.two_weeks_ago = extractMetrics(text2W);

    // 3 WEEKS AGO
    await clickTab("3 Weeks Ago");
    let text3W = await frame.evaluate(() => document.body.innerText);
    results.three_weeks_ago = extractMetrics(text3W);

    console.log("SCRAPED METRICS:");
    console.log(results);

    fs.writeFileSync("metrics.json", JSON.stringify(results, null, 2));

    await browser.close();
})();

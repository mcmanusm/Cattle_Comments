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

    // Wait for Power BI visuals to render
    await new Promise(r => setTimeout(r, 6000));

    // Extract visible text
    const allText = await frame.evaluate(() => document.body.innerText);
    console.log(allText);

    const metrics = {
        total_head: (allText.match(/Commercial Cattle Offerings\s*([\d,]+)/i) || [])[1] || null,
        amount_over_reserve: (allText.match(/Amount Over Reserve \(VOR\)\s*\$?([\d,]+)/i) || [])[1] || null,
        clearance_rate: (allText.match(/Clearance Rate \(\%\)\s*([\d,]+)\s*%/i) || [])[1] || null,
        ayci_dw: (allText.match(/AYCI c\/kg DW\s*([\d,]+)/i) || [])[1] || null
    };

    console.log("Scraped metrics:", metrics);

    fs.writeFileSync("metrics.json", JSON.stringify(metrics, null, 2));

    await browser.close();
})();

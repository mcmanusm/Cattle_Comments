// ============================================================
// puppeteer_scrape.js
// ============================================================

const fs = require("fs");
const puppeteer = require("puppeteer");

(async () => {

  const url = "https://mcmanusm.github.io/Cattle_Comments/table.html";
  const outputFile = "metrics.json";

  // --------------------------------------------------------
  // LOAD PREVIOUS METRICS (FOR CHANGE DETECTION)
  // --------------------------------------------------------

  let previousMetrics = null;

  if (fs.existsSync(outputFile)) {
    previousMetrics = JSON.parse(fs.readFileSync(outputFile, "utf8"));
    console.log("Loaded previous metrics for comparison");
  } else {
    console.log("No previous metrics file found; full write will occur");
  }

  // --------------------------------------------------------
  // LAUNCH BROWSER
  // --------------------------------------------------------

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  // 🔒 Disable caching to force fresh Power BI data
  await page.setCacheEnabled(false);

  await page.goto(url, { waitUntil: "networkidle2" });

  // --------------------------------------------------------
  // WAIT FOR IFRAME
  // --------------------------------------------------------

  await page.waitForSelector("#pbiTable", { timeout: 15000 });

  const frameHandle = await page.$("#pbiTable");
  const frame = await frameHandle.contentFrame();

  if (!frame) {
    console.error("❌ Failed to access Power BI iframe");
    process.exit(1);
  }

  // --------------------------------------------------------
  // WAIT FOR POWER BI TABLE CONTENT TO RENDER
  // --------------------------------------------------------
  
  await frame.waitForFunction(
    () => document.body.innerText.includes("Select Row"),
    { timeout: 30000 }
  );


  // --------------------------------------------------------
  // SCRAPE TEXT
  // --------------------------------------------------------

  const allText = await frame.evaluate(() => document.body.innerText);

  console.log("=== RAW SCRAPE START ===");
  console.log(allText);
  console.log("=== RAW SCRAPE END ===");

  const lines = allText
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  const rows = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === "Select Row") {
      const block = lines.slice(i, i + 11);

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

  // --------------------------------------------------------
  // VALIDATION
  // --------------------------------------------------------

  if (rows.length !== 4) {
    console.error("❌ Expected 4 rows but found:", rows.length);
    console.error(rows);
    process.exit(1);
  }

  // --------------------------------------------------------
  // STRUCTURE METRICS
  // --------------------------------------------------------

  const metrics = {
    updated_at: new Date().toISOString(),
    this_week: rows[0],
    last_week: rows[1],
    two_weeks_ago: rows[2],
    three_weeks_ago: rows[3]
  };

  console.log("SCRAPED METRICS:", JSON.stringify(metrics, null, 2));

  // --------------------------------------------------------
  // CHANGE DETECTION (IGNORE updated_at)
  // --------------------------------------------------------

  const stripTimestamp = obj => {
    const clone = JSON.parse(JSON.stringify(obj));
    delete clone.updated_at;
    return clone;
  };

  if (
    previousMetrics &&
    JSON.stringify(stripTimestamp(previousMetrics)) ===
      JSON.stringify(stripTimestamp(metrics))
  ) {
    console.log("No metric value changes detected");
  } else {
    console.log("Metric value changes detected");
  }

  // --------------------------------------------------------
  // WRITE OUTPUT (ALWAYS WHEN SCRAPE RUNS)
  // --------------------------------------------------------

  fs.writeFileSync(outputFile, JSON.stringify(metrics, null, 2));
  console.log("metrics.json written successfully");

  await browser.close();
  console.log("Scrape completed successfully");

})();

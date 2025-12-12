// ============================================================
// puppeteer_scrape.js
// ============================================================
// PURPOSE:
// This script uses Puppeteer (a headless Chrome browser) to:
// 1. Open a web page that embeds a Power BI table
// 2. Wait for the table to fully render
// 3. Extract the visible text from the table
// 4. Parse that text into structured metrics
// 5. Validate the result
// 6. Write the data to a JSON file for downstream use
//
// Think of this as:
// "Turn a visually-rendered Power BI table into machine-readable data"
// ============================================================

// ------------------------------------------------------------
// IMPORTS
// ------------------------------------------------------------

// Node.js built-in module for reading/writing files
const fs = require('fs');

// Puppeteer controls a real Chrome browser programmatically
const puppeteer = require('puppeteer');

// ------------------------------------------------------------
// MAIN ASYNC FUNCTION (Immediately Invoked)
// ------------------------------------------------------------

// JavaScript uses async/await for operations that take time
// (page loads, rendering, network calls, etc.)
//
// This pattern defines an async function and runs it immediately
(async () => {

    // --------------------------------------------------------
    // CONFIGURATION
    // --------------------------------------------------------

    // URL of the page that contains the Power BI table iframe
    const url = "https://mcmanusm.github.io/Cattle_Comments/table.html";

    // --------------------------------------------------------
    // LAUNCH HEADLESS BROWSER
    // --------------------------------------------------------

    // Start a new Chrome browser instance
    const browser = await puppeteer.launch({
        headless: "new",                 // Use modern headless Chrome
        args: [
            "--no-sandbox",              // Required for CI / Docker environments
            "--disable-setuid-sandbox"
        ]
    });

    // Open a new browser tab (page)
    const page = await browser.newPage();

    // Navigate to the target URL
    // waitUntil: "networkidle2" means:
    // "Wait until network activity has mostly stopped"
    // This is important because Power BI loads assets dynamically
    await page.goto(url, { waitUntil: "networkidle2" });

    // --------------------------------------------------------
    // WAIT FOR POWER BI IFRAME TO EXIST
    // --------------------------------------------------------

    // Do not continue until the iframe with id="pbiTable" exists
    // If this selector never appears, the script will fail here
    await page.waitForSelector("#pbiTable");

    // --------------------------------------------------------
    // SWITCH CONTEXT INTO THE IFRAME
    // --------------------------------------------------------

    // Grab a handle to the iframe element itself
    const frameHandle = await page.$("#pbiTable");

    // Switch execution context into the iframe
    // This is required to access Power BI's DOM
    const frame = await frameHandle.contentFrame();

    // --------------------------------------------------------
    // EXTRA WAIT FOR POWER BI TABLE RENDERING
    // --------------------------------------------------------

    // Power BI tables often render AFTER the iframe loads
    // This hard wait ensures the table content is visible
    // before we try to read it
    await new Promise(r => setTimeout(r, 6000));

    // --------------------------------------------------------
    // EXTRACT VISIBLE TEXT FROM THE TABLE
    // --------------------------------------------------------

    // Run code INSIDE the browser context
    // document.body.innerText returns what a user would see
    const allText = await frame.evaluate(() => document.body.innerText);

    // Debug output to inspect raw scraped text
    console.log("=== DEBUG START ===");
    console.log(allText);
    console.log("=== DEBUG END ===");

    // --------------------------------------------------------
    // NORMALISE RAW TEXT INTO CLEAN LINES
    // --------------------------------------------------------

    const lines = allText
        .split("\n")           // Split text into lines
        .map(l => l.trim())     // Remove leading/trailing whitespace
        .filter(Boolean);       // Remove empty lines

    // --------------------------------------------------------
    // PARSE TABLE ROWS
    // --------------------------------------------------------

    const rows = [];

    // Loop through every line of text
    for (let i = 0; i < lines.length; i++) {

        // "Select Row" is a consistent marker at the start of each table row
        if (lines[i] === "Select Row") {

            // Each table row spans a fixed number of text lines
            // Slice out the current row block
            const block = lines.slice(i, i + 11);

            // Convert raw positional text into a structured object
            const row = {
                index: block[1],

                // Remove all characters except digits and minus sign
                // This strips %, commas, spaces, etc.
                total_head: block[2].replace(/[^\d-]/g, ""),
                clearance_rate: block[3].replace(/[^\d-]/g, ""),
                amount_over_reserve: block[4].replace(/[^\d-]/g, ""),
                ayci_dw: block[5].replace(/[^\d-]/g, ""),
                ayci_change: block[6].replace(/[^\d-]/g, ""),
                total_head_change: block[7].replace(/[^\d-]/g, ""),
                clearance_rate_change: block[8].replace(/[^\d-]/g, ""),
                vor_change: block[9].replace(/[^\d-]/g, "")
            };

            // Add parsed row to results
            rows.push(row);
        }
    }

    // --------------------------------------------------------
    // VALIDATION CHECK
    // --------------------------------------------------------

    // The table is expected to contain exactly 4 rows
    // If this changes, something upstream has broken
    if (rows.length !== 4) {
        console.error("❌ ERROR: Expected 4 rows but found:", rows.length);
        console.error(rows);
        process.exit(1); // Fail loudly and stop the pipeline
    }

    // --------------------------------------------------------
    // APPLY BUSINESS MEANING TO ROWS
    // --------------------------------------------------------

    // Convert positional rows into semantically named metrics
    const metrics = {
        this_week: rows[0],
        last_week: rows[1],
        two_weeks_ago: rows[2],
        three_weeks_ago: rows[3]
    };

    // Log final structured output
    console.log("SCRAPED METRICS:", metrics);

    // --------------------------------------------------------
    // WRITE OUTPUT TO JSON FILE
    // --------------------------------------------------------

    // Save results in a machine-readable format
    fs.writeFileSync(
        "metrics.json",
        JSON.stringify(metrics, null, 2) // Pretty-print with indentation
    );

    // --------------------------------------------------------
    // CLEANUP
    // --------------------------------------------------------

    // Always close the browser to free resources
    await browser.close();

})();

name: Update PowerBI Metrics

on:
  workflow_dispatch: {}
  schedule:
    - cron: "*/30 * * * *"

concurrency:
  group: update-powerbi-metrics
  cancel-in-progress: false

jobs:
  scrape:
    runs-on: ubuntu-latest

    steps:
      # ------------------------------------------------------------
      # CHECKOUT REPOSITORY
      # ------------------------------------------------------------
      - name: Checkout repository
        uses: actions/checkout@v3

      # ------------------------------------------------------------
      # INSTALL DEPENDENCIES
      # ------------------------------------------------------------
      - name: Install dependencies
        run: |
          npm install puppeteer

      # ------------------------------------------------------------
      # RUN SCRAPER (ALWAYS)
      # ------------------------------------------------------------
      - name: Run scraper
        run: node scripts/scrape_metrics.js

      # ------------------------------------------------------------
      # COMMIT CHANGES (ONLY IF METRICS CHANGED)
      # ------------------------------------------------------------
      - name: Commit and push metrics.json
        run: |
          git config --global user.name "GitHub Action"
          git config --global user.email "action@github.com"

          if git diff --quiet metrics.json; then
            echo "No metric changes detected; skipping commit"
            exit 0
          fi

          git add metrics.json
          git commit -m "Update Power BI metrics"
          git push

      # ------------------------------------------------------------
      # ALERT ON FAILURE
      # ------------------------------------------------------------
      - name: Alert on failure
        if: failure()
        run: |
          echo "❌ Power BI scrape failed" >&2

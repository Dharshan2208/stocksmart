// script.js - Modernized Version
const apiKeys = {
  keys: [],
  currentIndex: 0,
  isInitialized: false,

  async initialize() {
    try {
      const response = await fetch("./keys.json");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      this.keys = this.extractKeys(data);

      if (this.keys.length === 0) {
        throw new Error("No valid API keys found");
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      this.showErrorModal(error);
      return false;
    }
  },

  extractKeys(data) {
    return [
      ...(data.keys || []),
      data.ALPHA_VANTAGE_API_KEY,
      data.alpha_vantage_api_key,
    ].filter((k) => typeof k === "string" && k.length === 16);
  },

  showErrorModal(error) {
    const modal = document.createElement("div");
    modal.className = "config-modal";
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Configuration Required</h2>
        <p>${error.message}</p>
        <pre>{
  "keys": [
    "YOUR_API_KEY_1",
    "YOUR_API_KEY_2"
  ]
}</pre>
        <button onclick="location.reload()">Reload After Setup</button>
      </div>
    `;
    document.body.appendChild(modal);
  },

  getNextKey() {
    if (!this.isInitialized) return null;
    const key = this.keys[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    return key;
  },
};

class StockDashboard {
  constructor() {
    this.chart = null;
    this.stockData = null;
    this.tooltip = null;
    this.currentNewsFilter = "all";
    this.initDOM();
    this.initEventListeners();
    this.initTooltip();
  }

  initDOM() {
    this.dom = {
      searchForm: document.getElementById("searchForm"),
      searchInput: document.getElementById("searchInput"),
      chartTypeSelect: document.getElementById("chartType"),
      timeRangeSelect: document.getElementById("timeRange"),
      stockCard: document.getElementById("stockCard"),
      chartCanvas: document.getElementById("chartCanvas"),
      tooltip: document.getElementById("tooltip"),
      newsGrid: document.getElementById("newsGrid"),
      themeToggle: document.getElementById("themeToggle"),
      newsFilterBtns: document.querySelectorAll(".news-filter-btn"),
    };
  }

  initEventListeners() {
    this.dom.searchForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      await this.handleSearch();
    });

    this.dom.chartTypeSelect.addEventListener("change", () => {
      if (this.stockData) this.updateChartType();
    });

    this.dom.timeRangeSelect.addEventListener("change", () => {
      if (this.stockData) this.updateTimeRange();
    });

    this.dom.themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark-theme");
      if (this.chart) {
        const isDarkTheme = document.body.classList.contains("dark-theme");
        this.updateChartTheme(isDarkTheme);
      }
    });

    // Auto-suggest popular stocks
    this.dom.searchInput.addEventListener("input", (e) => {
      const value = e.target.value.trim().toUpperCase();
      if (value.length > 0) {
        this.showStockSuggestions(value);
      }
    });

    // News filter buttons
    this.dom.newsFilterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.setActiveFilterButton(btn);
        this.currentNewsFilter = btn.dataset.filter;
        if (this.stockData && this.stockData.news) {
          this.displayNews(this.stockData.news);
        }
      });
    });

    // Auto-suggest with keyboard navigation support
    this.dom.searchInput.addEventListener("keydown", (e) => {
      const suggestions = document.getElementById("stockSuggestions");
      if (!suggestions) return;

      const items = suggestions.querySelectorAll(".suggestion-item");
      if (items.length === 0) return;

      let focusedIndex = Array.from(items).findIndex((item) =>
        item.classList.contains("focused")
      );

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          this.focusSuggestion(items, focusedIndex + 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          this.focusSuggestion(items, focusedIndex - 1);
          break;
        case "Enter":
          // Only handle Enter if a suggestion is focused and the form isn't being submitted
          if (focusedIndex >= 0) {
            e.preventDefault();
            items[focusedIndex].click();
          }
          break;
        case "Escape":
          e.preventDefault();
          const suggestionsEl = document.getElementById("stockSuggestions");
          if (suggestionsEl) {
            suggestionsEl.innerHTML = "";
          }
          break;
      }
    });
  }

  initTooltip() {
    this.tooltip = {
      el: this.dom.tooltip,
      show(x, y, content) {
        this.el.innerHTML = content;
        this.el.style.display = "block";
        this.el.style.left = `${x}px`;
        this.el.style.top = `${y}px`;
      },
      hide() {
        this.el.style.display = "none";
      },
    };
  }

  showStockSuggestions(query) {
    // Popular stocks for quick suggestions
    const popularStocks = [
      { symbol: "AAPL", name: "Apple Inc." },
      { symbol: "MSFT", name: "Microsoft Corporation" },
      { symbol: "GOOGL", name: "Alphabet Inc." },
      { symbol: "AMZN", name: "Amazon.com Inc." },
      { symbol: "META", name: "Meta Platforms, Inc." },
      { symbol: "TSLA", name: "Tesla, Inc." },
      { symbol: "NVDA", name: "NVIDIA Corporation" },
      { symbol: "AMD", name: "Advanced Micro Devices, Inc." },
    ];

    // Simple filtering for matching symbols or names
    const matches = popularStocks
      .filter(
        (stock) =>
          stock.symbol.includes(query) ||
          stock.name.toUpperCase().includes(query)
      )
      .slice(0, 5);

    // Show suggestions if we have matches
    if (matches.length && query.length >= 1) {
      let suggestionsEl = document.getElementById("stockSuggestions");

      if (!suggestionsEl) {
        suggestionsEl = document.createElement("div");
        suggestionsEl.id = "stockSuggestions";
        suggestionsEl.className = "stock-suggestions";
        suggestionsEl.setAttribute("role", "listbox");
        this.dom.searchForm.appendChild(suggestionsEl);
      }

      suggestionsEl.innerHTML = matches
        .map(
          (stock, index) =>
            `<div class="suggestion-item"
              id="suggestion-${index}"
              role="option"
              data-symbol="${stock.symbol}">
          <strong>${stock.symbol}</strong> - ${stock.name}
        </div>`
        )
        .join("");

      // Add click event to suggestions
      document.querySelectorAll(".suggestion-item").forEach((item) => {
        item.addEventListener("click", () => {
          this.dom.searchInput.value = item.dataset.symbol;
          suggestionsEl.innerHTML = "";
          this.handleSearch();
        });
      });
    } else {
      const suggestionsEl = document.getElementById("stockSuggestions");
      if (suggestionsEl) {
        suggestionsEl.innerHTML = "";
      }
    }
  }

  focusSuggestion(items, index) {
    // Handle wrapping and clear previous focus
    if (index < 0) index = items.length - 1;
    if (index >= items.length) index = 0;

    items.forEach((item) => item.classList.remove("focused"));
    items[index].classList.add("focused");
    this.dom.searchInput.setAttribute("aria-activedescendant", items[index].id);
  }

  setActiveFilterButton(activeBtn) {
    this.dom.newsFilterBtns.forEach((btn) => {
      btn.classList.remove("active");
    });
    activeBtn.classList.add("active");
  }

  async handleSearch() {
    const symbol = this.dom.searchInput.value.trim().toUpperCase();
    if (!symbol) return;

    this.showLoadingState();

    try {
      const [quote, series, news] = await Promise.all([
        this.fetchData("GLOBAL_QUOTE", symbol),
        this.fetchData("TIME_SERIES_DAILY", symbol),
        this.fetchData("NEWS_SENTIMENT", symbol),
      ]);

      // Store stock data for reuse
      this.stockData = { symbol, quote, series, news };

      this.displayStockData(quote);
      this.renderStockChart(series);
      this.displayNews(news);
    } catch (error) {
      this.showError(error.message);
    }
  }

  async fetchData(functionType, symbol) {
    const key = apiKeys.getNextKey();
    if (!key) throw new Error("API keys not configured");

    const response = await fetch(
      `https://www.alphavantage.co/query?function=${functionType}&symbol=${symbol}&apikey=${key}`
    );

    if (!response.ok) throw new Error("API request failed");
    const data = await response.json();

    if (data.Information?.includes("API key")) {
      throw new Error("Invalid API key");
    }

    // Check for error messages indicating the stock wasn't found
    if (
      data["Error Message"] ||
      Object.keys(data).length === 0 ||
      (functionType === "GLOBAL_QUOTE" && !data["Global Quote"]["05. price"])
    ) {
      throw new Error(
        `No data found for symbol "${symbol}". Please check the stock symbol and try again.`
      );
    }

    return data;
  }

  displayStockData(quoteData) {
    // Check for valid quote data
    if (
      !quoteData ||
      !quoteData["Global Quote"] ||
      Object.keys(quoteData["Global Quote"]).length === 0
    ) {
      this.showError(`No data found for ${this.stockData.symbol}`);
      return;
    }

    const quote = quoteData["Global Quote"];
    const price = parseFloat(quote["05. price"]).toFixed(2);
    const change = parseFloat(quote["09. change"]).toFixed(2);
    const changePercent = parseFloat(
      quote["10. change percent"].replace("%", "")
    ).toFixed(2);
    const isPositive = change >= 0;

    this.dom.stockCard.innerHTML = `
      <div class="stock-header">
        <div class="stock-title">
          <h2>${this.stockData.symbol}</h2>
          <span class="last-updated">Last Updated: ${new Date().toLocaleString()}</span>
        </div>
        <div class="price ${isPositive ? "positive" : "negative"}">
          $${price}
          <span class="change">
            <i class="fas fa-${isPositive ? "caret-up" : "caret-down"}"></i>
            ${isPositive ? "+" : ""}${change} (${
      isPositive ? "+" : ""
    }${changePercent}%)
          </span>
        </div>
      </div>
      <div class="stock-metrics">
        <div class="metric">
          <span>Open</span>
          <span>$${parseFloat(quote["02. open"]).toFixed(2)}</span>
        </div>
        <div class="metric">
          <span>High</span>
          <span>$${parseFloat(quote["03. high"]).toFixed(2)}</span>
        </div>
        <div class="metric">
          <span>Low</span>
          <span>$${parseFloat(quote["04. low"]).toFixed(2)}</span>
        </div>
        <div class="metric">
          <span>Volume</span>
          <span>${parseInt(quote["06. volume"]).toLocaleString()}</span>
        </div>
      </div>
    `;
  }

  renderStockChart(seriesData) {
    const ctx = this.dom.chartCanvas.getContext("2d");

    // Set chart type attribute on canvas for CSS
    this.dom.chartCanvas.setAttribute(
      "data-chart-type",
      this.dom.chartTypeSelect.value
    );

    // Get the selected time range and chart type
    const timeRange = this.dom.timeRangeSelect.value;
    const chartType = this.dom.chartTypeSelect.value;
    let daysToShow = 30; // Default 1M

    switch (timeRange) {
      case "3M":
        daysToShow = 90;
        break;
      case "6M":
        daysToShow = 180;
        break;
      case "1Y":
        daysToShow = 365;
        break;
      default:
        daysToShow = 30;
    }

    // Get dates and price data
    const timeSeries = seriesData["Time Series (Daily)"];
    const dates = Object.keys(timeSeries).slice(0, daysToShow);
    const closes = dates.map((date) =>
      parseFloat(timeSeries[date]["4. close"])
    );
    const opens = dates.map((date) => parseFloat(timeSeries[date]["1. open"]));
    const highs = dates.map((date) => parseFloat(timeSeries[date]["2. high"]));
    const lows = dates.map((date) => parseFloat(timeSeries[date]["3. low"]));
    const volumes = dates.map((date) =>
      parseInt(timeSeries[date]["5. volume"])
    );

    // Calculate min and max for better scaling
    const minPrice = Math.min(...lows);
    const maxPrice = Math.max(...highs);
    const buffer = (maxPrice - minPrice) * 0.1;

    if (this.chart) this.chart.destroy();

    // Determine whether dark theme is active
    const isDarkTheme = document.body.classList.contains("dark-theme");

    // Store historical data for tooltips
    this.chartData = {
      dates: dates.slice().reverse(),
      closes: closes.slice().reverse(),
      opens: opens.slice().reverse(),
      highs: highs.slice().reverse(),
      lows: lows.slice().reverse(),
      volumes: volumes.slice().reverse(),
    };

    if (chartType === "line") {
      // Line chart configuration
      const config = {
        type: "line",
        data: {
          labels: dates.slice().reverse(),
          datasets: [
            {
              label: "Price",
              data: closes.slice().reverse(),
              borderColor: "#4a90e2",
              backgroundColor: "rgba(74, 144, 226, 0.2)",
              borderWidth: 2,
              tension: 0.4,
              fill: "origin",
              pointRadius: 0,
              pointHoverRadius: 5,
              pointHoverBackgroundColor: "#4a90e2",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: "index",
            intersect: false,
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              enabled: false, // Disable built-in tooltip
              external: this.externalTooltipHandler.bind(this),
            },
          },
          scales: {
            x: {
              grid: {
                color: isDarkTheme
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.05)",
              },
              ticks: {
                maxTicksLimit: 8,
                color: isDarkTheme
                  ? "rgba(255,255,255,0.7)"
                  : "rgba(0,0,0,0.7)",
              },
            },
            y: {
              grid: {
                color: isDarkTheme
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.05)",
              },
              ticks: {
                color: isDarkTheme
                  ? "rgba(255,255,255,0.7)"
                  : "rgba(0,0,0,0.7)",
              },
              suggestedMin: minPrice - buffer,
              suggestedMax: maxPrice + buffer,
            },
          },
          onHover: (event, elements) => {
            this.dom.chartCanvas.style.cursor = elements.length
              ? "pointer"
              : "default";
          },
        },
      };

      this.chart = new Chart(ctx, config);
    } else if (chartType === "candlestick") {
      try {
        // Prepare data in the format expected by the financial chart
        const candleData = [];

        // Process the data in reverse (most recent first)
        for (let i = dates.length - 1; i >= 0; i--) {
          candleData.push({
            x: moment(dates[i]).valueOf(), // Use moment for date handling
            o: opens[i],
            h: highs[i],
            l: lows[i],
            c: closes[i],
          });
        }

        const config = {
          type: "candlestick",
          data: {
            datasets: [
              {
                label: "OHLC",
                data: candleData,
                color: {
                  up: "var(--positive)",
                  down: "var(--negative)",
                  unchanged: "#888888",
                },
                borderColor: {
                  up: "var(--positive)",
                  down: "var(--negative)",
                  unchanged: "#888888",
                },
                wickColor: {
                  up: "var(--positive)",
                  down: "var(--negative)",
                  unchanged: "#888888",
                },
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
              mode: "index",
              intersect: false,
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                enabled: false, // Disable built-in tooltip
                external: this.externalTooltipHandler.bind(this),
                callbacks: {
                  label: function (context) {
                    const item = context.raw;
                    return `O: ${item.o} H: ${item.h} L: ${item.l} C: ${item.c}`;
                  },
                },
              },
            },
            scales: {
              x: {
                type: "time",
                time: {
                  unit: "day",
                  parser: "MM/DD/YYYY",
                  tooltipFormat: "ll",
                  displayFormats: {
                    day: "MMM D",
                  },
                },
                grid: {
                  color: isDarkTheme
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.05)",
                },
                ticks: {
                  maxTicksLimit: 8,
                  color: isDarkTheme
                    ? "rgba(255,255,255,0.7)"
                    : "rgba(0,0,0,0.7)",
                },
              },
              y: {
                grid: {
                  color: isDarkTheme
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.05)",
                },
                ticks: {
                  color: isDarkTheme
                    ? "rgba(255,255,255,0.7)"
                    : "rgba(0,0,0,0.7)",
                },
                suggestedMin: minPrice - buffer,
                suggestedMax: maxPrice + buffer,
              },
            },
            onHover: (event, elements) => {
              this.dom.chartCanvas.style.cursor = elements.length
                ? "pointer"
                : "default";
            },
          },
        };

        this.chart = new Chart(ctx, config);
      } catch (error) {
        console.error("Error creating candlestick chart:", error);
        // Fall back to line chart if candlestick fails
        this.dom.chartTypeSelect.value = "line";
        this.renderStockChart(seriesData);
      }
    }
  }

  externalTooltipHandler(context) {
    // Hide tooltip if no tooltip
    if (context.tooltip.opacity === 0) {
      this.tooltip.hide();
      return;
    }

    const { chart, tooltip } = context;

    // Find the index of the hovered data point
    const dataIndex = tooltip.dataPoints[0].dataIndex;

    // Get data for this point
    const date = this.chartData.dates[dataIndex];
    const open = this.chartData.opens[dataIndex].toFixed(2);
    const high = this.chartData.highs[dataIndex].toFixed(2);
    const low = this.chartData.lows[dataIndex].toFixed(2);
    const close = this.chartData.closes[dataIndex].toFixed(2);
    const volume = this.chartData.volumes[dataIndex].toLocaleString();

    // Calculate price change and percentage
    const priceChange = (close - open).toFixed(2);
    const priceChangePercent = (((close - open) / open) * 100).toFixed(2);
    const isPositive = close >= open;

    // Format date
    const formattedDate = new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    // Create tooltip content with highlight for price change
    const content = `
      <div class="tooltip-date">${formattedDate}</div>
      <div class="tooltip-price">
        <div class="tooltip-row"><span>Open:</span> <span>$${open}</span></div>
        <div class="tooltip-row"><span>High:</span> <span>$${high}</span></div>
        <div class="tooltip-row"><span>Low:</span> <span>$${low}</span></div>
        <div class="tooltip-row"><span>Close:</span> <span class="${
          isPositive ? "positive" : "negative"
        }">$${close}</span></div>
        <div class="tooltip-row ${isPositive ? "positive" : "negative"}">
          <span>Change:</span>
          <span>${isPositive ? "+" : ""}${priceChange} (${
      isPositive ? "+" : ""
    }${priceChangePercent}%)</span>
        </div>
        <div class="tooltip-row"><span>Volume:</span> <span>${volume}</span></div>
      </div>
    `;

    // Position tooltip relative to mouse cursor
    const canvasRect = chart.canvas.getBoundingClientRect();

    // Calculate tooltip position to avoid going off-screen
    let x, y;

    // Position horizontally
    if (tooltip.caretX > canvasRect.width - 200) {
      // If near the right edge, position to the left of the cursor
      x = canvasRect.left + tooltip.caretX - 190;
    } else {
      // Otherwise position to the right of the cursor
      x = canvasRect.left + tooltip.caretX + 15;
    }

    // Position vertically
    if (tooltip.caretY < 150) {
      // If near the top, position below the cursor
      y = canvasRect.top + tooltip.caretY + 15;
    } else {
      // Otherwise position above the cursor
      y = canvasRect.top + tooltip.caretY - 15;
    }

    this.tooltip.show(x, y, content);
  }

  updateChartType() {
    if (!this.stockData) return;
    this.renderStockChart(this.stockData.series);
  }

  updateTimeRange() {
    if (!this.stockData) return;
    this.renderStockChart(this.stockData.series);
  }

  updateChartTheme(isDarkTheme) {
    // Update chart colors for theme
    if (this.chart) {
      this.chart.options.scales.x.grid.color = isDarkTheme
        ? "rgba(255,255,255,0.1)"
        : "rgba(0,0,0,0.05)";
      this.chart.options.scales.y.grid.color = isDarkTheme
        ? "rgba(255,255,255,0.1)"
        : "rgba(0,0,0,0.05)";
      this.chart.options.scales.x.ticks.color = isDarkTheme
        ? "rgba(255,255,255,0.7)"
        : "rgba(0,0,0,0.7)";
      this.chart.options.scales.y.ticks.color = isDarkTheme
        ? "rgba(255,255,255,0.7)"
        : "rgba(0,0,0,0.7)";
      this.chart.update();
    }
  }

  displayNews(newsData) {
    // Check if news data exists and has items
    if (!newsData || !newsData.feed || newsData.feed.length === 0) {
      this.dom.newsGrid.innerHTML = `
        <div class="no-news-message">
          <i class="fas fa-newspaper"></i>
          <p>No recent news available for ${this.stockData.symbol}</p>
        </div>
      `;
      return;
    }

    // Filter news based on current filter
    let filteredNews = newsData.feed.slice(0, 10);

    if (this.currentNewsFilter === "positive") {
      filteredNews = filteredNews.filter(
        (article) => article.overall_sentiment_score > 0.2
      );
    } else if (this.currentNewsFilter === "negative") {
      filteredNews = filteredNews.filter(
        (article) => article.overall_sentiment_score < -0.1
      );
    }

    // Show message if no news match the filter
    if (filteredNews.length === 0) {
      this.dom.newsGrid.innerHTML = `
        <div class="no-news-message">
          <i class="fas fa-filter"></i>
          <p>No ${this.currentNewsFilter} news found for ${this.stockData.symbol}</p>
        </div>
      `;
      return;
    }

    this.dom.newsGrid.innerHTML = filteredNews
      .map((article) => {
        // Add a sentiment badge based on the sentiment score
        let sentimentBadge = "";
        const score = article.overall_sentiment_score || 0;

        if (score > 0.2) {
          sentimentBadge =
            '<span class="sentiment-badge positive">Positive</span>';
        } else if (score < -0.1) {
          sentimentBadge =
            '<span class="sentiment-badge negative">Negative</span>';
        } else {
          sentimentBadge =
            '<span class="sentiment-badge neutral">Neutral</span>';
        }

        return `
            <article class="news-card">
              <img src="${
                article.banner_image ||
                "https://via.placeholder.com/300x160?text=No+Image"
              }" alt="${
          article.title
        }" onerror="this.src='https://via.placeholder.com/300x160?text=No+Image'">
              <div class="news-content">
                <div class="news-header">
                  ${sentimentBadge}
                  <span class="news-date">${new Date(
                    article.time_published
                  ).toLocaleDateString()}</span>
                </div>
                <h3>${article.title}</h3>
                <p>${article.summary}</p>
                <a href="${article.url}" target="_blank">Read more</a>
              </div>
            </article>
          `;
      })
      .join("");
  }

  showLoadingState() {
    // Create skeleton loading UI for the stock card
    this.dom.stockCard.innerHTML = `
      <div class="skeleton-loader">
        <div class="skeleton-header">
          <div class="skeleton-title"></div>
          <div class="skeleton-subtitle"></div>
        </div>
        <div class="skeleton-price"></div>
        <div class="skeleton-metrics">
          <div class="skeleton-metric"></div>
          <div class="skeleton-metric"></div>
          <div class="skeleton-metric"></div>
          <div class="skeleton-metric"></div>
        </div>
      </div>
    `;

    // Create skeleton loading UI for the news grid
    this.dom.newsGrid.innerHTML = Array(3)
      .fill(0)
      .map(
        () => `
      <article class="news-card skeleton">
        <div class="skeleton-image"></div>
        <div class="news-content">
          <div class="skeleton-title"></div>
          <div class="skeleton-text"></div>
          <div class="skeleton-text"></div>
          <div class="skeleton-link"></div>
        </div>
      </article>
    `
      )
      .join("");

    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  showError(message) {
    this.dom.stockCard.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
      </div>
    `;
  }
}

// Initialize application
document.addEventListener("DOMContentLoaded", async () => {
  await apiKeys.initialize();
  if (apiKeys.isInitialized) {
    new StockDashboard();
  }

  // Initialize with loading UI until search is performed
  const stockCard = document.getElementById("stockCard");
  stockCard.innerHTML = `
    <div class="welcome-message">
      <i class="fas fa-chart-line"></i>
      <h3>Welcome to StockSmart</h3>
      <p>Enter a stock symbol above to get started</p>
    </div>
  `;
});

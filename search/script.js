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
      }
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
    const matches = popularStocks.filter(stock => 
      stock.symbol.includes(query) || 
      stock.name.toUpperCase().includes(query)
    ).slice(0, 5);

    // Show suggestions if we have matches
    if (matches.length && query.length >= 1) {
      let suggestionsEl = document.getElementById("stockSuggestions");
      
      if (!suggestionsEl) {
        suggestionsEl = document.createElement("div");
        suggestionsEl.id = "stockSuggestions";
        suggestionsEl.className = "stock-suggestions";
        this.dom.searchForm.appendChild(suggestionsEl);
      }

      suggestionsEl.innerHTML = matches.map(stock => 
        `<div class="suggestion-item" data-symbol="${stock.symbol}">
          <strong>${stock.symbol}</strong> - ${stock.name}
        </div>`
      ).join("");

      // Add click event to suggestions
      document.querySelectorAll(".suggestion-item").forEach(item => {
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
    if (data["Error Message"] || Object.keys(data).length === 0 || 
        (functionType === "GLOBAL_QUOTE" && !data["Global Quote"]["05. price"])) {
      throw new Error(`No data found for symbol "${symbol}". Please check the stock symbol and try again.`);
    }

    return data;
  }

  displayStockData(quoteData) {
    const quote = quoteData["Global Quote"];
    const price = parseFloat(quote["05. price"]).toFixed(2);
    const change = parseFloat(quote["09. change"]).toFixed(2);
    const changePercent = quote["10. change percent"].replace("%", "");
    const changePercentValue = parseFloat(changePercent).toFixed(2);
    const isPositive = change >= 0;
    
    this.dom.stockCard.innerHTML = `
      <div class="stock-header">
        <h2>${this.stockData.symbol}</h2>
        <span class="price">$${price}</span>
      </div>
      <div class="stock-metrics">
        <div class="metric ${isPositive ? "positive" : "negative"}">
          <span>Change</span>
          <span>${isPositive ? '+' : ''}${change} (${isPositive ? '+' : ''}${changePercentValue}%)</span>
        </div>
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
    
    // Get the selected time range
    const timeRange = this.dom.timeRangeSelect.value;
    let daysToShow = 30; // Default 1M
    
    switch(timeRange) {
      case "3M": daysToShow = 90; break;
      case "6M": daysToShow = 180; break;
      case "1Y": daysToShow = 365; break;
      default: daysToShow = 30;
    }
    
    // Get dates and close prices
    const timeSeries = seriesData["Time Series (Daily)"];
    const dates = Object.keys(timeSeries).slice(0, daysToShow);
    const closes = dates.map(date => parseFloat(timeSeries[date]["4. close"]));
    const opens = dates.map(date => parseFloat(timeSeries[date]["1. open"]));
    const highs = dates.map(date => parseFloat(timeSeries[date]["2. high"]));
    const lows = dates.map(date => parseFloat(timeSeries[date]["3. low"]));
    const volumes = dates.map(date => parseInt(timeSeries[date]["5. volume"]));
    
    // Calculate min and max for better scaling
    const minPrice = Math.min(...lows);
    const maxPrice = Math.max(...highs);
    const buffer = (maxPrice - minPrice) * 0.1;
    
    if (this.chart) this.chart.destroy();
    
    // Set chart type based on selection
    const chartType = this.dom.chartTypeSelect.value;
    
    // Determine whether dark theme is active
    const isDarkTheme = document.body.classList.contains("dark-theme");
    
    // Chart configuration
    this.chart = new Chart(ctx, {
      type: chartType,
      data: {
        labels: dates.reverse(),
        datasets: [
          {
            label: "Price",
            data: closes.reverse(),
            borderColor: "#4a90e2",
            backgroundColor: "rgba(74, 144, 226, 0.2)",
            borderWidth: 2,
            tension: 0.4,
            fill: chartType === "line" ? "origin" : false,
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
              color: isDarkTheme ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
            },
            ticks: {
              maxTicksLimit: 8,
              color: isDarkTheme ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
            },
          },
          y: { 
            grid: { 
              color: isDarkTheme ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
            },
            ticks: {
              color: isDarkTheme ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
            },
            suggestedMin: minPrice - buffer,
            suggestedMax: maxPrice + buffer,
          },
        },
        onHover: (event, elements) => {
          this.dom.chartCanvas.style.cursor = elements.length ? "pointer" : "default";
        },
      },
    });
    
    // Store historical data for tooltips
    this.chartData = {
      dates: dates.reverse(),
      closes: closes.reverse(),
      opens: opens.reverse(),
      highs: highs.reverse(),
      lows: lows.reverse(),
      volumes: volumes.reverse(),
    };
  }
  
  externalTooltipHandler(context) {
    // Hide tooltip if no tooltip
    if (context.tooltip.opacity === 0) {
      this.tooltip.hide();
      return;
    }
    
    const { chart, tooltip } = context;
    const dataIndex = tooltip.dataPoints[0].dataIndex;
    
    // Get data for this point
    const date = this.chartData.dates[dataIndex];
    const open = this.chartData.opens[dataIndex].toFixed(2);
    const high = this.chartData.highs[dataIndex].toFixed(2);
    const low = this.chartData.lows[dataIndex].toFixed(2);
    const close = this.chartData.closes[dataIndex].toFixed(2);
    const volume = this.chartData.volumes[dataIndex].toLocaleString();
    
    // Format date
    const formattedDate = new Date(date).toLocaleDateString(undefined, {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
    
    // Create tooltip content
    const content = `
      <div class="tooltip-date">${formattedDate}</div>
      <div class="tooltip-price">
        <div class="tooltip-row"><span>Open:</span> <span>$${open}</span></div>
        <div class="tooltip-row"><span>High:</span> <span>$${high}</span></div>
        <div class="tooltip-row"><span>Low:</span> <span>$${low}</span></div>
        <div class="tooltip-row"><span>Close:</span> <span>$${close}</span></div>
        <div class="tooltip-row"><span>Volume:</span> <span>${volume}</span></div>
      </div>
    `;
    
    // Show tooltip
    const position = chart.canvas.getBoundingClientRect();
    const x = position.left + tooltip.caretX;
    const y = position.top + tooltip.caretY - 160; // Offset tooltip above the cursor
    
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
    
    this.dom.newsGrid.innerHTML = newsData.feed
      .slice(0, 6)
      .map(
        (article) => `
      <article class="news-card">
        <img src="${article.banner_image || "https://via.placeholder.com/300x160?text=No+Image"}" alt="${
          article.title
        }" onerror="this.src='https://via.placeholder.com/300x160?text=No+Image'">
        <div class="news-content">
          <h3>${article.title}</h3>
          <p>${article.summary}</p>
          <a href="${article.url}" target="_blank">Read more</a>
        </div>
      </article>
    `
      )
      .join("");
  }

  showLoadingState() {
    this.dom.stockCard.innerHTML = '<div class="loading-spinner"></div>';
    this.dom.newsGrid.innerHTML = '<div class="loading-spinner"></div>';
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
});

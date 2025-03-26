// DOM Elements
const chatMessages = document.getElementById("chatMessages");
const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendButton");

// API Configuration
const API_URL = "/api/gemini";

// State Management
let apiFailureCount = 0;
const MAX_API_FAILURES = 2;
let useDemoMode = false;

// Sample predefined responses for demo mode fallback
const demoResponses = [
  {
    keywords: ["stock", "stocks", "equity"],
    response: `Based on your interest in stocks, here's a recommended strategy:

    <div class="strategy-card">
      <h3>Diversified Growth Strategy</h3>
      <p><strong>Allocation:</strong> 60% large-cap, 30% mid-cap, 10% small-cap stocks</p>
      <p><strong>Time Horizon:</strong> Medium to long-term (3-5+ years)</p>
      <p><strong>Risk Level:</strong> Moderate</p>
      <p><strong>Approach:</strong> Focus on quality companies with strong fundamentals and growth potential. Consider dollar-cost averaging to reduce timing risk.</p>
    </div>`,
  },
  {
    keywords: ["crypto", "bitcoin", "ethereum"],
    response: `Based on your interest in crypto, here's a recommended strategy:

    <div class="strategy-card">
      <h3>Crypto Core-Satellite Strategy</h3>
      <p><strong>Allocation:</strong> 60% Bitcoin/Ethereum, 40% alt-coins</p>
      <p><strong>Time Horizon:</strong> Variable (1-5 years)</p>
      <p><strong>Risk Level:</strong> High</p>
      <p><strong>Approach:</strong> Hold core positions in established cryptocurrencies while taking calculated positions in promising alt-coins. Set strict stop-loss levels and consider DCA during major market corrections.</p>
    </div>`,
  },
  {
    keywords: ["forex", "currency", "trading"],
    response: `Based on your interest in forex trading, here's a recommended strategy:

    <div class="strategy-card">
      <h3>Trend-Following Forex Strategy</h3>
      <p><strong>Pairs Focus:</strong> Major pairs (EUR/USD, GBP/USD, USD/JPY)</p>
      <p><strong>Time Horizon:</strong> Short to medium-term</p>
      <p><strong>Risk Level:</strong> Moderate to High</p>
      <p><strong>Approach:</strong> Utilize moving average crossovers and momentum indicators to identify trending markets. Implement proper position sizing (1-2% risk per trade) and maintain consistent risk-reward ratios of at least 1:2.</p>
    </div>`,
  },
  {
    keywords: ["etf", "index", "passive"],
    response: `Based on your interest in passive investing, here's a recommended strategy:

    <div class="strategy-card">
      <h3>Global ETF Portfolio</h3>
      <p><strong>Allocation:</strong> 60% broad market ETFs, 20% sector-specific ETFs, 20% bond ETFs</p>
      <p><strong>Time Horizon:</strong> Long-term (5+ years)</p>
      <p><strong>Risk Level:</strong> Low to Moderate</p>
      <p><strong>Approach:</strong> Build a core portfolio with low-cost broad market ETFs. Add satellite positions in sector ETFs that align with long-term economic trends. Rebalance annually to maintain target allocation.</p>
    </div>`,
  },
];

// Function to get a demo response
const getDemoResponse = (userMessage) => {
  // Look for matching keywords
  const matchedResponse = demoResponses.find((item) =>
    item.keywords.some((keyword) =>
      userMessage.toLowerCase().includes(keyword.toLowerCase())
    )
  );

  if (matchedResponse) return matchedResponse.response;

  // Default response if no keywords matched
  return `To generate a trading strategy, I need more specific information. Could you tell me:
  <br><br>
  1. What assets are you interested in? (stocks, crypto, forex, etc.)<br>
  2. What's your risk tolerance? (low, moderate, high)<br>
  3. What's your investment timeframe?`;
};

// Function to add a message to the chat
const addMessage = (message, isUser = false) => {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message");
  messageElement.classList.add(isUser ? "user-message" : "bot-message");
  messageElement.innerHTML = message;
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
};

// Function to show typing indicator
const showTypingIndicator = () => {
  const indicator = document.createElement("div");
  indicator.classList.add("typing-indicator");
  indicator.innerHTML = `
    <span></span>
    <span></span>
    <span></span>
  `;
  indicator.id = "typingIndicator";
  chatMessages.appendChild(indicator);
  chatMessages.scrollTop = chatMessages.scrollHeight;
};

// Function to remove typing indicator
const removeTypingIndicator = () => {
  const indicator = document.getElementById("typingIndicator");
  if (indicator) {
    indicator.remove();
  }
};

// Function to call the Gemini API
const callGeminiAPI = async (userMessage) => {
  // If in demo mode, return a predefined response
  if (useDemoMode) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(getDemoResponse(userMessage)), 1000);
    });
  }

  try {
    // Add timeout to prevent indefinite waiting
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: userMessage }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok) {
      // Track API failures
      apiFailureCount++;
      if (apiFailureCount >= MAX_API_FAILURES) {
        console.log("Switching to demo mode after repeated API failures");
        useDemoMode = true;
        return `API connection issues detected. Switching to demo mode for example strategies.<br><br>${getDemoResponse(
          userMessage
        )}`;
      }

      return (
        data.response ||
        "Sorry, I encountered an error generating your strategy. Please try again."
      );
    }

    // Reset failure count on success
    apiFailureCount = 0;
    return data.response;
  } catch (error) {
    console.error("Error calling Gemini API:", error);

    // Track API failures
    apiFailureCount++;
    if (apiFailureCount >= MAX_API_FAILURES) {
      console.log("Switching to demo mode after repeated API failures");
      useDemoMode = true;
      return `API connection issues detected. Switching to demo mode for example strategies.<br><br>${getDemoResponse(
        userMessage
      )}`;
    }

    if (error.name === "AbortError") {
      return "Request timed out. The server might be busy or unavailable. Please try again later.";
    }
    return "Sorry, I encountered an error generating your strategy. Please try again.";
  }
};

// Function to process user input and generate a response
const processUserInput = async () => {
  const message = userInput.value.trim();
  if (!message) return;

  // Add user message to chat
  addMessage(message, true);

  // Clear input field
  userInput.value = "";

  // Show typing indicator
  showTypingIndicator();

  try {
    // Use the Gemini API to get a response
    const botResponse = await callGeminiAPI(message);

    // Remove typing indicator
    removeTypingIndicator();

    // Add bot response to chat
    addMessage(botResponse);
  } catch (error) {
    // Remove typing indicator
    removeTypingIndicator();

    // Add error message
    addMessage("Sorry, I encountered an error. Please try again.");
    console.error("Error processing message:", error);
  }
};

// Event listeners
const initEventListeners = () => {
  sendButton.addEventListener("click", processUserInput);

  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      processUserInput();
    }
  });
};

// Initialize the application
const init = () => {
  initEventListeners();
  userInput.focus();
};

// Run initialization when DOM is loaded
document.addEventListener("DOMContentLoaded", init);

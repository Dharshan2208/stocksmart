const express = require("express");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const dotenv = require("dotenv");

// LangChain imports
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { PromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { RunnableSequence } = require("@langchain/core/runnables");
const {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
} = require("@langchain/core/prompts");

// Load environment variables
try {
  dotenv.config();

  // If API key is missing, try to manually read from .env file
  if (!process.env.GEMINI_API_KEY) {
    console.log(
      "API key not found in environment, trying manual load from .env"
    );
    const envPath = path.join(__dirname, ".env");
    if (fs.existsSync(envPath)) {
      const envFile = fs.readFileSync(envPath, "utf8");
      const apiKeyMatch = envFile.match(/GEMINI_API_KEY=([^\s"']+)/);
      if (apiKeyMatch && apiKeyMatch[1]) {
        process.env.GEMINI_API_KEY = apiKeyMatch[1];
        console.log("Manually loaded API key from .env file");
      }
    }
  }
} catch (error) {
  console.error("Error loading environment variables:", error);
}

// Initialize LangChain with Gemini
const apiKey = process.env.GEMINI_API_KEY;
console.log(
  "API Key (first few chars):",
  apiKey ? apiKey.substring(0, 5) + "..." : "missing"
);

// Create a Gemini model instance with LangChain
const model = new ChatGoogleGenerativeAI({
  apiKey: apiKey,
  modelName: "gemini-2.0-flash",
  temperature: 0.7,
  maxOutputTokens: 2048,
});

// Create a prompt template for trading strategy generation
const tradingStrategyPromptTemplate = ChatPromptTemplate.fromMessages([
  HumanMessagePromptTemplate.fromTemplate(
    `You are a trading strategy assistant. Generate a trading strategy based on the following user input: "{message}".

    Please follow these guidelines:
    - If the user's input doesn't contain enough information, ask follow-up questions to understand their goals, risk tolerance, and preferred assets
    - Format your response professionally and include specific recommendations if possible
    - Consider different asset classes based on the user's preferences
    - Include risk management considerations
    - Provide a clear structure with allocation percentages when appropriate

    Your response should be detailed, actionable and tailored to the user's specific situation.`
  ),
]);

// Create a chain for generating trading strategies
const tradingStrategyChain = RunnableSequence.from([
  tradingStrategyPromptTemplate,
  model,
  new StringOutputParser(),
]);

// Setup Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Serve the HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// API endpoint to handle Gemini requests using LangChain
app.post("/api/gemini", async (req, res) => {
  try {
    const { message } = req.body;
    console.log("Received user message:", message);

    if (!message) {
      return res.status(400).json({ response: "Message is required" });
    }

    // Run the LangChain sequence
    console.log("Calling LangChain with Gemini...");
    const response = await tradingStrategyChain.invoke({
      message: message,
    });
    console.log("Received response from LangChain");

    // Format the response for the UI
    let formattedResponse = response;

    if (
      response.includes("strategy") ||
      response.includes("recommend") ||
      response.includes("portfolio")
    ) {
      // Extract a title if possible
      const lines = response.split("\n");
      const possibleTitle = lines.find(
        (line) =>
          line.toLowerCase().includes("strategy") ||
          line.toLowerCase().includes("portfolio") ||
          line.toLowerCase().includes("plan")
      );

      const title = possibleTitle || "Trading Strategy Recommendation";

      // Create strategy card with highlights
      formattedResponse = `${response}

      <div class="strategy-card">
        <h3>${title}</h3>
        <p><strong>Key Points:</strong></p>
        <ul>
          ${extractKeyPoints(response)
            .map((point) => `<li>${point}</li>`)
            .join("")}
        </ul>
      </div>`;
    }

    return res.json({ response: formattedResponse });
  } catch (error) {
    console.error("Error details:", error);

    // Return a more detailed error message
    let errorMessage =
      "Sorry, I encountered an error generating your strategy. Please try again.";

    if (error.message) {
      if (error.message.includes("API key")) {
        errorMessage =
          "API key error: The server is not properly configured to use the Gemini API.";
      } else if (error.message.includes("PERMISSION_DENIED")) {
        errorMessage =
          "Access denied: The API key doesn't have permission to use the Gemini API.";
      } else if (error.message.includes("RESOURCE_EXHAUSTED")) {
        errorMessage =
          "API quota exceeded: The server has reached its limit for API requests.";
      } else if (error.message.includes("network")) {
        errorMessage = "Network error: Could not connect to the Gemini API.";
      }
    }

    return res.status(500).json({
      response: errorMessage,
    });
  }
});

// Helper function to extract key points from the response
function extractKeyPoints(text) {
  // Try to find bullet points or numbered lists
  const bulletPoints = text.match(/[•\-*]\s+([^\n]+)/g) || [];
  const numberedPoints = text.match(/\d+\.\s+([^\n]+)/g) || [];

  // Combine points found
  let points = [...bulletPoints, ...numberedPoints];

  // If no structured points found, extract sentences with key terms
  if (points.length === 0) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    points = sentences
      .filter(
        (sentence) =>
          sentence.toLowerCase().includes("allocation") ||
          sentence.toLowerCase().includes("risk") ||
          sentence.toLowerCase().includes("invest") ||
          sentence.toLowerCase().includes("strategy") ||
          sentence.toLowerCase().includes("portfolio") ||
          sentence.toLowerCase().includes("recommend")
      )
      .slice(0, 5);
  }

  // Limit to 5 points
  return points.slice(0, 5).map((point) => point.trim());
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

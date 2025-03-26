# Trading Strategy Generator

A sleek chatbot UI that generates personalized trading strategies using Gemini AI and LangChain.

## Features

- Interactive chat interface
- Real-time response generation
- Personalized trading strategy recommendations
- Mobile-responsive design
- LangChain integration for advanced AI workflows
- Smart formatting of trading strategies with key points extraction

## Technologies Used

- HTML, CSS, JavaScript (Frontend)
- Node.js & Express (Backend)
- Google Gemini API (AI Model)
- LangChain.js (AI Framework)

## Setup Instructions

1. Clone this repository
2. Navigate to the strategy directory
3. Install dependencies:
   ```
   npm install
   ```
4. Create a `.env` file with your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   PORT=3000
   ```
5. Start the server:
   ```
   npm start
   ```
6. Open your browser and navigate to `http://localhost:3000`

## How It Works

This application uses LangChain.js to create a structured workflow for generating trading strategies:

1. User inputs are captured through the chat interface
2. LangChain processes these inputs using a custom prompt template
3. The Gemini model generates a detailed response through LangChain's RunnableSequence
4. The server extracts key points and formats the response with a strategy card
5. The UI displays the response in a user-friendly format

## Getting a Gemini API Key

1. Visit the [Google AI Studio](https://ai.google.dev/)
2. Sign in with your Google account
3. Navigate to the API keys section
4. Create a new API key
5. Copy the key and paste it in your `.env` file

## Usage

1. Type your investment preferences, goals, and risk tolerance in the chat
2. The AI will generate a personalized trading strategy based on your inputs
3. You can continue the conversation to refine the strategy

## Example Prompts

- "I'm interested in cryptocurrency trading with a high risk tolerance"
- "What's a good ETF strategy for long-term retirement planning?"
- "Help me create a forex trading strategy for day trading"
- "I want to invest in tech stocks with moderate risk for a 5+ year horizon"

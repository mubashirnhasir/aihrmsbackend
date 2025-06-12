const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Handle chat messages for AI assistant
 */
const handleChat = async (req, res) => {
  try {
    const { message, context = "hr", conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string') {
      throw new ApiError(400, "Message is required and must be a string");
    }

    // Define system prompts based on context
    const systemPrompts = {
      hr: "You are a helpful HR assistant. Provide professional, accurate, and helpful responses about HR-related topics including employee policies, benefits, leave management, performance reviews, and general workplace questions. Keep responses concise and actionable.",
      general: "You are a helpful AI assistant. Provide accurate, helpful, and professional responses to user queries.",
      technical: "You are a technical assistant specializing in HR technology, systems, and processes."
    };

    const systemPrompt = systemPrompts[context] || systemPrompts.general;

    // Prepare conversation messages
    const messages = [
      { role: "system", content: systemPrompt }
    ];

    // Add conversation history (last 10 messages to avoid token limits)
    const recentHistory = conversationHistory.slice(-10);
    messages.push(...recentHistory);

    // Add current user message
    messages.push({ role: "user", content: message });

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const assistantResponse = completion.choices[0].message.content;

    return res.status(200).json(new ApiResponse(
      200,
      {
        response: assistantResponse,
        context,
        timestamp: new Date().toISOString()
      },
      "Chat response generated successfully"
    ));

  } catch (error) {
    console.error('Chat Error:', error);
    
    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      throw new ApiError(503, "AI service temporarily unavailable. Please try again later.");
    } else if (error.code === 'rate_limit_exceeded') {
      throw new ApiError(429, "Too many requests. Please wait a moment before trying again.");
    }
    
    throw new ApiError(500, "Failed to process chat message", error);
  }
};

/**
 * Get predefined HR FAQ responses
 */
const getHRFAQ = async (req, res) => {
  try {
    const faqs = [
      {
        id: 1,
        question: "How do I apply for leave?",
        answer: "You can apply for leave through the employee portal. Go to the 'Leaves' section, select your leave type, choose dates, and submit your request for manager approval."
      },
      {
        id: 2,
        question: "What are the company holidays for this year?",
        answer: "You can view all company holidays in the 'Holidays' section of the dashboard. This includes national holidays and company-specific holidays."
      },
      {
        id: 3,
        question: "How do I update my personal information?",
        answer: "Go to your employee profile section to update personal information such as contact details, address, and emergency contacts."
      },
      {
        id: 4,
        question: "What benefits do I have access to?",
        answer: "Your benefits information can be found in the employee handbook and benefits section of the portal. This includes health insurance, retirement plans, and other company benefits."
      },
      {
        id: 5,
        question: "How do I report time and attendance?",
        answer: "Use the clock-in/clock-out feature in the attendance section. Make sure to log your time accurately each day."
      }
    ];

    return res.status(200).json(new ApiResponse(
      200,
      { faqs },
      "HR FAQ retrieved successfully"
    ));

  } catch (error) {
    console.error('HR FAQ Error:', error);
    throw new ApiError(500, "Failed to retrieve HR FAQ", error);
  }
};

module.exports = {
  handleChat,
  getHRFAQ
};

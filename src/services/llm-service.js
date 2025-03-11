// Base LLM Service class
class LLMService {
  async generateReply(comment, style, userPrompt, maxLength = 140) {
    throw new Error('Method not implemented');
  }
}

// Mock implementation for testing
class MockLLMService extends LLMService {
  async generateReply(comment, style, userPrompt, maxLength = 140) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock responses based on style
    const responses = {
      positive: "Thanks for sharing your perspective! Really appreciate your thoughtful comment. 👍",
      constructive: "Interesting point! Have you also considered looking at it from alternative perspective? 🤔",
      critical: "While I see your point, I respectfully disagree. Let's discuss further."
    };

    // Return appropriate response based on style
    return responses[style];
  }
}

// OpenAI implementation
class OpenAIService extends LLMService {
  constructor(apiKey) {
    super();
    if (!apiKey) {
      throw new Error('API key is required for OpenAI service');
    }
    this.apiKey = apiKey;
  }

  async generateReply(comment, style, userPrompt, maxLength = 140) {
    try {
      // Validate inputs
      if (!comment) throw new Error('Comment is required');
      if (!style) throw new Error('Style is required');

      // Create system prompt based on style
      const stylePrompts = {
        positive: "You are a supportive and encouraging commenter. Your goal is to provide positive feedback while maintaining authenticity.",
        constructive: "You are a thoughtful commenter who provides constructive feedback. Your goal is to offer alternative perspectives and suggestions respectfully.",
        critical: "You are a critical thinker who challenges ideas respectfully. Your goal is to express disagreement or concerns while maintaining professionalism."
      };

      const systemPrompt = stylePrompts[style] || stylePrompts.constructive;

      // Construct the user prompt
      let promptText = `Please generate a reply to this YouTube comment: "${comment}"`;
      if (userPrompt) {
        promptText += `\nConsider these points in your response: ${userPrompt}`;
      }
      promptText += `\nKeep the response under ${maxLength} characters.`;

      // Make API request
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: promptText
            }
          ],
          max_tokens: 150,
          temperature: 0.7,
          top_p: 1,
          frequency_penalty: 0.5,
          presence_penalty: 0.5
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to generate reply');
      }

      const data = await response.json();
      const generatedReply = data.choices[0]?.message?.content?.trim();

      if (!generatedReply) {
        throw new Error('No reply generated');
      }

      // Ensure the reply doesn't exceed maxLength
      return generatedReply.length > maxLength
        ? generatedReply.substring(0, maxLength - 3) + '...'
        : generatedReply;

    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error(`Failed to generate reply: ${error.message}`);
    }
  }
}

// Factory for creating LLM services
class LLMServiceFactory {
  static createService(type, config) {
    switch (type) {
      case 'mock':
        return new MockLLMService();
      case 'openai':
        return new OpenAIService(config?.apiKey);
      default:
        throw new Error(`Unknown LLM service type: ${type}`);
    }
  }
}

export { LLMService, LLMServiceFactory };
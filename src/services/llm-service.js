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

// OpenAI implementation (to be used later)
class OpenAIService extends LLMService {
  constructor(apiKey) {
    super();
    this.apiKey = apiKey;
  }

  async generateReply(comment, style, userPrompt, maxLength = 140) {
    // TODO: Implement real OpenAI API call
    throw new Error('OpenAI implementation not ready yet');
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
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

    // Check if comment is in Chinese (contains Chinese characters)
    const isChinese = /[\u4e00-\u9fff]/.test(comment);

    // Mock responses based on style and language
    const responses = {
      positive: {
        en: "Thanks for sharing your perspective! Really appreciate your thoughtful comment. 👍",
        zh: "感谢分享你的观点！真的很欣赏你的见解。 👍"
      },
      constructive: {
        en: "Interesting point! Have you also considered looking at it from [alternative perspective]? 🤔",
        zh: "有趣的观点！你有没有考虑从[其他角度]来看这个问题？🤔"
      },
      critical: {
        en: "While I see your point, I respectfully disagree because [reason]. Let's discuss further.",
        zh: "虽然我理解你的观点，但我持不同意见，因为[原因]。我们可以进一步讨论。"
      }
    };

    // Return appropriate response based on language and style
    return responses[style][isChinese ? 'zh' : 'en'];
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
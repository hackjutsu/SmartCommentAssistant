// Base LLM Service class
class LLMService {
  constructor() {
    this.type = 'base';
  }

  setApiKey(apiKey) {
    throw new Error('Method not implemented');
  }

  async generateReply(comment, style, userPrompt, maxLength = 140, videoTitle = '') {
    throw new Error('Method not implemented');
  }
}

// Mock implementation for testing
class MockLLMService extends LLMService {
  constructor() {
    super();
    this.type = 'mock';
  }

  setApiKey(apiKey) {
    // Mock service doesn't need an API key
    return;
  }

  async generateReply(comment, style, userPrompt, maxLength = 140, videoTitle = '') {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock responses based on style
    const responses = {
      'super-agree': `OMG YES!!! 🤩 Your comment about "${videoTitle}" is absolutely BRILLIANT! I couldn't agree more! This is exactly what I was thinking! You totally nailed it! ✨`,
      'agree': `You make a great point about "${videoTitle}"! 😃 I completely agree with your perspective and really appreciate you sharing your thoughts! 👍`,
      'neutral': `Interesting thoughts on "${videoTitle}" 🤔. While I see your point, we could also consider different aspects of this topic. Let's explore this further...`,
      'disagree': `I have to respectfully disagree with your take on "${videoTitle}" 😡. Here's why I think differently...`,
      'super-disagree': `Oh please... 💩 This has to be one of the most ridiculous comments I've seen about "${videoTitle}". Are you seriously suggesting that...? *eye roll*`
    };

    // Return appropriate response based on style, fallback to neutral if style not found
    return responses[style] || responses['neutral'];
  }
}

// OpenAI implementation
class OpenAIService extends LLMService {
  constructor(apiKey) {
    super();
    this.type = 'openai';
    this.apiKey = apiKey;
    this.model = "gpt-3.5-turbo";  // Specify the model name
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  setModel(model) {
    this.model = model;
  }

  async generateReply(comment, style, userPrompt, maxLength = 140, videoTitle = '') {
    try {
      // Validate inputs
      if (!comment) throw new Error('Comment is required');
      if (!style) throw new Error('Style is required');

      // Validate API key
      if (!this.apiKey) throw new Error('API key is required for OpenAI service');

      // Create system prompt based on style
      const stylePrompts = {
        'super-agree': "You are an extremely enthusiastic and excited commenter. Express strong agreement and amplify the comment's points with high energy, using exclamation marks and positive language. Show genuine excitement while staying authentic.",
        'agree': "You are a supportive and friendly commenter. Express agreement with the comment's points in a positive and constructive way, while maintaining a balanced and genuine tone.",
        'neutral': "You are a thoughtful and balanced commenter. Consider multiple perspectives and provide a well-reasoned response that neither strongly agrees nor disagrees with the comment.",
        'disagree': "You are a respectfully critical commenter. Express disagreement with the comment's points while maintaining professionalism and providing clear reasoning for your perspective.",
        'super-disagree': "You are a sarcastic and critical commenter. Express strong disagreement with the comment using rhetorical questions and witty remarks, while still maintaining some level of civility."
      };

      const systemPrompt = stylePrompts[style] || stylePrompts.neutral;

      // Construct the user prompt with video context
      let promptText = videoTitle
        ? `Please generate a reply to this YouTube comment on the video "${videoTitle}": "${comment}"`
        : `Please generate a reply to this YouTube comment: "${comment}"`;

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
          model: this.model,
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
        throw new Error(error.error?.message || 'Failed to generate response');
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
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }
}

// Factory for creating LLM services
class LLMServiceFactory {
  static createService(type, config = {}) {
    const { apiKey } = config;

    switch (type) {
      case 'mock':
        const mockService = new MockLLMService();
        if (apiKey) {
          mockService.setApiKey(apiKey);
        }
        return mockService;
      case 'openai':
        const openaiService = new OpenAIService(apiKey);
        return openaiService;
      default:
        throw new Error(`Unknown LLM service type: ${type}`);
    }
  }
}

export { LLMService, LLMServiceFactory };
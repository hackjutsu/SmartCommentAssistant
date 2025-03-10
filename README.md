# Smart Comment Assistant

A Chrome extension that helps users generate YouTube comment replies using OpenAI's API. This tool assists content creators and active commenters in crafting contextually appropriate responses to YouTube comments.

## Features

- Automatic activation on YouTube
- Manual toggle control
- OpenAI-powered comment generation
- Multiple response styles (Positive/Supportive, Constructive/Thoughtful, Critical/Negative)
- Custom prompt input
- Secure API key management

## Development Setup

1. Clone the repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Project Structure

```
smartCommentAssistant/
├── manifest.json           # Extension configuration
├── src/                   # Source code
│   ├── background/        # Background scripts
│   ├── content/          # Content scripts
│   ├── popup/            # Popup UI
│   └── utils/            # Shared utilities
├── assets/               # Images and other assets
└── styles/               # CSS files
```

## Development

1. Make changes to the source code
2. Reload the extension in `chrome://extensions/`
3. Test the changes on YouTube

## License

MIT License
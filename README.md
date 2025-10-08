# Multi-Agent Research Assistant

A sophisticated research tool that uses multiple AI agents to analyze topics through a structured workflow. The system provides human-in-the-loop feedback capabilities and generates comprehensive reports with streaming real-time updates.

## 🌟 Features

- **Multi-Agent Analysis**: 5 specialized agents work in sequence (Researcher → Generator → Evaluator → Proposer → Aggregator)
- **Human-in-the-Loop**: Provide feedback between iterations to refine results
- **Real-time Streaming**: Watch analysis unfold in real-time with streaming responses
- **Multiple LLM Support**: Use Gemini API or local LLMs (Ollama/OpenAI-compatible)
- **File Upload**: Include context files to enhance analysis
- **Export Options**: Save results as Markdown or JSON
- **Session Sharing**: Share analysis sessions via URL links
- **Auto-save**: Automatic session persistence and restore
- **Dark/Light Mode**: Toggle between themes
- **Prompt Editing**: Customize agent prompts for specific needs

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Gemini API key (for cloud AI) OR local LLM setup (optional)

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd multi-agent-research-assistant
   npm install
   ```

2. **Set up your API key:**
   - Create `.env.local` file in the root directory
   - Add your Gemini API key:
     ```
     API_KEY=your_gemini_api_key_here
     ```

3. **Run the application:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   - Navigate to `http://localhost:5173`
   - Start analyzing!

## 📖 How to Use

### Basic Workflow

1. **Choose Your LLM Provider**
   - **Gemini API**: Default option, requires API key
   - **Local LLM**: Use Ollama, LM Studio, or OpenAI-compatible endpoint

2. **Enter Your Research Topic**
   - Be specific for better results
   - Examples: "The impact of renewable energy on job markets", "Blockchain adoption in healthcare"

3. **Upload Context Files (Optional)**
   - Drag & drop or click to upload text files
   - Supports: .txt, .md, .csv, and other text formats
   - Files provide additional context for agents

4. **Start Analysis**
   - Click "Start Analysis" 
   - Watch the 6-step process unfold in real-time

5. **Review Results**
   - Read agent outputs as they stream
   - Check stylized facts and questions
   - Review the final aggregated report

6. **Provide Feedback (Optional)**
   - After completion, add feedback in the feedback panel
   - Click "Submit Revision" to run iteration 2
   - Agents will refine their analysis based on your input

### The 6-Step Analysis Process

```
1. 🔍 Research      → Gathers background information
2. ⚡ Generate      → Creates initial analysis
3. 🔍 Evaluate      → Critically reviews the analysis
4. 💡 Propose       → Suggests improvements
5. 📊 Aggregate     → Synthesizes everything into final report
6. ✨ Stylize       → Extracts key facts and questions
```

### Advanced Features

#### **Session Management**
- **Auto-save**: Sessions automatically save to localStorage
- **Restore**: Reload your last session on app startup
- **Share**: Copy shareable links to distribute your analysis
- **Export**: Save as Markdown (.md) or JSON (.json)

#### **Prompt Customization**
- Click the ✏️ edit icon on any agent card
- Modify prompts to suit your specific needs
- Test and improve prompts with the built-in tester
- Prompts persist across sessions

#### **Local LLM Setup**
1. **Install Ollama** (recommended):
   ```bash
   # macOS/Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Pull a model
   ollama pull qwen3:4b
   ```

2. **Configure in the app**:
   - Select "Local LLM" provider
   - URL: `http://localhost:11434/v1/chat/completions`
   - Model: `qwen3:4b` (automatically configured)

3. **Alternative setups**:
   - LM Studio: Use their OpenAI-compatible endpoint
   - Oobabooga: Configure with OpenAI extension
   - Any OpenAI-compatible API

## 🎯 Use Cases

### **Academic Research**
- Literature reviews and synthesis
- Topic exploration and hypothesis generation
- Critical analysis of research areas
- Identifying research gaps and questions

### **Business Analysis**
- Market research and competitive analysis
- Strategy development and evaluation
- Risk assessment and opportunity identification
- Policy analysis and recommendations

### **Content Creation**
- Blog post research and outline generation
- Report writing with structured analysis
- Fact-checking and source verification
- Educational material development

### **Personal Learning**
- Deep dives into complex topics
- Structured learning with Q&A generation
- Skill development research
- Career planning and industry analysis

## 💡 Tips for Best Results

### **Topic Formulation**
- ✅ **Good**: "The role of artificial intelligence in transforming customer service in retail"
- ❌ **Avoid**: "AI" (too broad)
- ✅ **Good**: "Environmental impact of electric vehicle adoption in urban areas"
- ❌ **Avoid**: "Cars and environment" (too vague)

### **Using Context Files**
- Include relevant documents, data, or research papers
- Keep files focused and relevant to your topic
- Use text formats for best parsing (.txt, .md, .csv)
- Multiple perspectives enhance analysis quality

### **Effective Feedback**
- Be specific about what to improve or change
- Point out missing perspectives or areas to explore
- Ask for additional analysis on specific subtopics
- Request different frameworks or approaches

### **Prompt Optimization**
- Test prompts with the built-in prompt tester
- Include specific output format requirements
- Add domain expertise instructions
- Specify analysis frameworks or methodologies

## 🔧 Troubleshooting

### **Common Issues**

**"Model not found" error with local LLM:**
- Ensure your local LLM is running (`ollama serve`)
- Check the model name matches what you've pulled
- Verify the endpoint URL is correct

**Slow or no streaming:**
- Check your internet connection
- For local LLMs, ensure sufficient system resources
- Try refreshing the page and restarting

**API key errors:**
- Verify your Gemini API key is correctly set
- Check the `.env.local` file format
- Ensure the API key has proper permissions

**Dark mode not working:**
- Try a hard refresh (Ctrl+F5 or Cmd+Shift+R)
- Clear browser cache
- Check if browser extensions are interfering

### **Performance Optimization**

**For better speed:**
- Use local LLMs for faster processing
- Reduce file upload sizes
- Close other browser tabs during analysis
- Use wired internet connection for stability

**For better quality:**
- Provide more context through file uploads
- Use specific, well-crafted topics
- Iterate with targeted feedback
- Customize prompts for your domain

## 🛠️ Development

### **Tech Stack**
- **Frontend**: React 19, TypeScript, Tailwind CSS
- **AI Integration**: Gemini API, OpenAI-compatible endpoints, @huggingface/transformers (client-side models)
- **Build Tool**: Vite
- **Deployment**: Static hosting compatible

### **Client-side AI with @huggingface/transformers**
This project now includes support for running lightweight AI models directly in the browser using @huggingface/transformers. This enables:
- Offline AI capabilities
- Reduced latency for simple tasks
- Privacy-focused processing (no data sent to external servers)
- Fallback option when API keys are not available

The Transformers.js service has been enhanced with:
- True streaming support for real-time text generation
- Improved type safety and error handling
- Structured response parsing for reliable JSON output
- Resource cleanup methods for better memory management
- Updated to the latest version (3.7.5) for better performance and model support
- Using Qwen3 0.6B model for improved text generation quality

### **Project Structure**
```
├── components/          # UI components
│   ├── AgentCard.tsx   # Individual agent displays
│   ├── ControlPanel.tsx # Main controls
│   ├── ResultsPanel.tsx # Facts & questions
│   └── ...
├── services/           # AI service integrations
├── types.ts           # TypeScript definitions
├── prompts.ts         # Default agent prompts
└── App.tsx           # Main application
```

### **Customization**
- Modify prompts in `prompts.ts`
- Add new agent types in `types.ts`
- Extend UI components as needed
- Configure additional LLM providers

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For questions, issues, or feature requests:
- Open an issue on GitHub
- Check the troubleshooting section above
- Review the tips for optimal usage

---

**Happy Researching!** 🎉
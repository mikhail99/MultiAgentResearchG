# 🧠 A-Mem Memory Test Lab

A comprehensive testing and demonstration environment for the Agentic Memory (A-Mem) system, allowing you to experiment with memory construction, dynamic linking, and memory evolution using your own documents.

## 🎯 What is the Memory Test Lab?

The **Memory Test Lab** is an interactive playground where you can:

- **📄 Upload Documents**: Drop any text files (.txt, .md) to test memory creation
- **🧠 Process into Memory**: Convert documents into structured memory notes with keywords, context, and tags
- **🔗 Watch Linking**: See how memories automatically connect based on semantic similarity
- **📊 Analyze Quality**: Monitor memory network quality and connectivity metrics
- **🔄 Test Evolution**: Observe how memories adapt and evolve with new information

## 🚀 How to Access

### From the Main App
1. **Open your multi-agent research assistant**
2. **Look for the brain icon (🧠) in the top-right corner**
3. **Click it to open the Memory Test Lab**
4. **The lab opens as a full-screen modal**

### Direct Access
The Memory Test Lab is integrated as a modal component within the main application, accessible via the header button.

## 📋 Features Overview

### 1. Document Upload Area
```
📁 Document Upload
├── Research Topic Input
├── File Drop Zone
├── Uploaded Files List
└── Processing Controls
```

### 2. Memory Network Visualization
```
🕸️ Memory Network
├── Quality Score Indicator
├── Network Statistics
├── Interactive Memory Nodes
└── Connection Visualization
```

### 3. Memory Detail Modal
```
📄 Memory Details
├── Agent Attribution
├── Context Summary
├── Keywords & Tags
├── Content Preview
└── Metadata Information
```

## 🎮 How to Use

### Step 1: Prepare Your Documents
Create or gather text documents you want to test with. Examples:
- **Research Papers** (abstracts, summaries)
- **Meeting Notes** (key points, decisions)
- **Project Documentation** (requirements, specifications)
- **Analysis Reports** (findings, recommendations)
- **Any text content** (.txt, .md files)

### Step 2: Set Research Topic
```
Research Topic: [Enter your topic]
```
Define the research context that will be used for memory processing and linking.

### Step 3: Upload Documents
**Method 1: Drag & Drop**
- Drag files from your computer
- Drop them onto the dashed area
- Supported: .txt, .md, plain text files

**Method 2: Select Files**
- Click the drop zone
- Use file browser to select documents
- Multiple files supported

### Step 4: Process into Memory
1. **Click "🧠 Process into Memory"**
2. **Watch the progress** - each file gets processed sequentially
3. **See memory notes created** - keywords, context, and tags extracted
4. **Observe connections form** - links created between related documents

### Step 5: Analyze Results
- **Quality Score**: Overall memory network health (0-100%)
- **Network Statistics**: Memories, connections, unique keywords
- **Memory Nodes**: Individual document memories with metadata
- **Connection Lines**: Relationships between documents

### Step 6: Explore Memory Details
- **Click any memory node** to see detailed information
- **View extracted keywords** and generated tags
- **See connection strength** to other memories
- **Examine content preview** and metadata

## 📊 Understanding the Results

### Memory Quality Score
- **0-30%**: Basic memory network with few connections
- **30-70%**: Moderate connectivity with emerging patterns
- **70-100%**: High-quality network with strong relationships

### Network Statistics
- **Memories**: Number of processed documents
- **Connections**: Links between related documents
- **Unique Keywords**: Total distinct keywords across all documents

### Memory Node Information
Each memory node shows:
- **Agent Name**: Processing agent identifier
- **Context**: LLM-generated summary
- **Keywords**: Key terms extracted from content
- **Tags**: Categorized labels for organization
- **Connection Indicators**: Visual links to related memories

### Connection Visualization
- **Green dots**: Connected memories with strength indicators
- **Connection lines**: Show relationships between documents
- **Strength percentages**: Confidence in semantic relationships

## 🧪 Test Scenarios

### Scenario 1: Research Paper Analysis
```
Topic: Machine Learning Algorithms
Documents:
├── transformer_paper.txt
├── reinforcement_learning.md
├── neural_networks.txt
└── algorithm_comparison.md

Expected Results:
- High keyword overlap detection
- Strong connections between related papers
- Quality score: 70-90%
- Clear research clusters
```

### Scenario 2: Meeting Notes Analysis
```
Topic: Project Planning
Documents:
├── sprint_planning.txt
├── stakeholder_meeting.md
├── technical_discussion.txt
└── decision_log.md

Expected Results:
- Context-based connections
- Decision flow linking
- Quality score: 60-80%
- Temporal relationship detection
```

### Scenario 3: Mixed Content Analysis
```
Topic: Technology Trends
Documents:
├── ai_research.txt
├── market_analysis.md
├── user_feedback.txt
└── competitor_review.md

Expected Results:
- Diverse connection patterns
- Cross-domain insights
- Quality score: 50-75%
- Interdisciplinary linking
```

## 🔍 Debugging & Troubleshooting

### Common Issues

#### Issue: No Connections Formed
**Symptoms**: Quality score stays at 0%, no connection lines
**Solutions**:
- Check if documents have overlapping keywords
- Ensure documents are related to the research topic
- Try different documents with more semantic overlap

#### Issue: Memory Quality Low
**Symptoms**: Quality score below 30%
**Solutions**:
- Upload more related documents
- Use documents with similar themes
- Check keyword extraction quality

#### Issue: Processing Fails
**Symptoms**: Error during memory processing
**Solutions**:
- Check file format (must be plain text)
- Ensure files are not corrupted
- Try smaller files first

### Debug Information
The Memory Test Lab provides detailed logging:
- **File processing status**
- **Memory creation progress**
- **Link generation results**
- **Quality calculation details**

## 🎨 Advanced Features

### Custom Research Topics
Experiment with different topics to see how they affect:
- Memory linking patterns
- Keyword extraction focus
- Tag generation categories

### Multi-Document Analysis
Upload multiple related documents to:
- Test large-scale memory networks
- Observe cluster formation
- Analyze cross-document relationships

### Performance Testing
- **Small datasets**: 2-5 documents (fast processing)
- **Medium datasets**: 10-20 documents (moderate processing)
- **Large datasets**: 50+ documents (comprehensive testing)

## 📈 Measuring Success

### Key Metrics
- **Processing Speed**: Time to convert documents to memories
- **Connection Accuracy**: Relevance of generated links
- **Quality Consistency**: Stable quality scores across runs
- **Keyword Relevance**: Accuracy of extracted keywords

### Benchmarking
Compare results across:
- Different document types
- Various research topics
- Document sizes and complexity
- Processing parameters

## 🚀 Integration Benefits

### For A-Mem Development
- **Rapid Prototyping**: Test memory features quickly
- **Visual Feedback**: Immediate results visualization
- **Iterative Testing**: Fast development cycles
- **User Validation**: Real-world usage scenarios

### For Research Applications
- **Document Analysis**: Understand complex document relationships
- **Knowledge Discovery**: Find connections in large document sets
- **Research Synthesis**: Combine insights from multiple sources
- **Pattern Recognition**: Identify themes across documents

## 🎯 Future Enhancements

### Planned Features
- **Batch Processing**: Upload entire document folders
- **Export Capabilities**: Save memory networks as data files
- **Advanced Visualization**: 3D network graphs, timeline views
- **Memory Evolution**: Show how memories change over time
- **Collaborative Features**: Share memory networks with team members

### Integration Possibilities
- **API Endpoints**: RESTful access to memory processing
- **Plugin System**: Custom memory analysis modules
- **Database Integration**: Persistent memory storage
- **Real-time Collaboration**: Multi-user memory networks

## 📚 Learning Resources

### Documentation
- [A-Mem Paper](https://arxiv.org/html/2502.12110v10) - Original research
- [Memory Test Suite](./test_amem.mjs) - Automated tests
- [API Reference](./src/types/) - Type definitions

### Best Practices
- Start with small, related document sets
- Use clear, descriptive research topics
- Experiment with different document types
- Analyze connection patterns for insights

---

**🎉 Happy Memory Testing!**

The Memory Test Lab is your playground for exploring the fascinating world of agentic memory systems. Upload some documents, set a research topic, and watch as your AI creates an intelligent knowledge network! 🧠✨

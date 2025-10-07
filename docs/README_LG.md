# Multi-Agent Research Assistant (LangGraph.js Edition)

This is a LangGraph.js implementation of the multi-agent research assistant, providing a more robust and scalable workflow orchestration system compared to the original manual implementation.

## 🚀 Key Improvements with LangGraph.js

### **1. Graph-Based Workflow Management**
- **Before**: Manual sequential execution with complex conditional logic
- **After**: Clean graph with nodes and edges, conditional routing via `addConditionalEdges`

### **2. Built-in Persistence & Memory**
- **Before**: Custom localStorage persistence
- **After**: LangGraph.js `MemorySaver` with automatic state management

### **3. Human-in-the-Loop Support**
- **Before**: Custom feedback system
- **After**: Native interruption support with `interrupt()` function

### **4. Enhanced Streaming**
- **Before**: Custom streaming implementation
- **After**: LangGraph.js built-in streaming with `streamMode: "values"`

### **5. Tool Integration**
- **Before**: Custom tool service with manual error handling
- **After**: Standardized LangGraph.js tool nodes with Zod schemas

## 📁 Files Overview

### **Core LangGraph Implementation:**
- `types/workflow_LG.ts` - TypeScript types for LangGraph state and configuration
- `services/workflowService_LG.ts` - Graph definition with nodes and edges
- `services/langgraphService_LG.ts` - Service for interacting with LangGraph.js
- `App_LG.tsx` - React component using LangGraph.js

### **Dependencies:**
- `package_LG.json` - Updated dependencies for LangGraph.js

## 🏗️ Architecture

### **Workflow Graph Structure**
```
START → Search → Learnings → Opportunity Analysis → [Conditional: Restart?] → Proposer → Novelty Checker → Aggregator → END
```

### **Key LangGraph Features Used**

1. **StateGraph**: Manages complex state with multiple arrays for iterations
2. **Conditional Edges**: Handles Opportunity Analysis restart logic automatically
3. **MemorySaver**: Persists state across workflow runs
4. **Streaming**: Real-time updates as each node processes
5. **Annotations**: Type-safe state management

### **State Management**
```typescript
interface WorkflowState {
  // Topic and metadata
  topic: string;
  iteration: number;
  feedback: string;

  // Agent outputs (arrays for iterations)
  searchResults: string[];
  learnings: string[];
  gapAnalyses: string[];
  proposals: string[];
  noveltyChecks: string[];
  aggregations: string[];

  // Workflow control
  currentStep: ProcessStatus;
  completedSteps: ProcessStatus[];
  shouldRestart: boolean;
}
```

## 🔧 Setup Instructions

### **1. Install Dependencies**
```bash
# Copy the LangGraph package.json
cp package_LG.json package.json

# Install dependencies
npm install
```

### **2. Environment Setup**
```bash
# Ensure you have the required environment variables
# API_KEY for Gemini (if using Gemini)
# VITE_FASTAPI_URL for tool service (if using tools)
```

### **3. Run the Application**
```bash
npm run dev
```

## 🎯 LangGraph.js Benefits in Action

### **Opportunity Analysis Restart Logic**
**Before (Manual):**
```javascript
const restartKeywords = ['research_again', 'restart', 'search again', ...];
const shouldRestartSearch = restartKeywords.some(keyword => lowerResult.includes(keyword));
if (shouldRestartSearch) {
  // Complex manual restart logic
}
```

**After (LangGraph.js):**
```javascript
// Define conditional edge
graph.addConditionalEdges('gap_analysis', shouldRestart, {
  search: 'search_agent',
  proposer: 'proposer_agent'
});
```

### **State Persistence**
**Before (Manual):**
```javascript
// Complex localStorage management
const saveLastRun = () => { /* 30+ lines of code */ };
```

**After (LangGraph.js):**
```javascript
const checkpointer = new MemorySaver();
// Automatic state persistence
```

### **Streaming Updates**
**Before (Manual):**
```javascript
// Custom streaming with manual state updates
await generateContentStream(AgentName.SEARCH, prompt, options, (chunk) => {
  setAgentStates(prev => /* complex update logic */);
});
```

**After (LangGraph.js):**
```javascript
const stream = await graph.stream(inputs, {
  streamMode: "values"
});
for await (const chunk of stream) {
  // Automatic state updates
}
```

## 🚀 Usage

1. **Start Workflow**: Click "Start Analysis" - LangGraph.js handles the entire workflow
2. **Monitor Progress**: Real-time streaming updates as each agent processes
3. **Provide Feedback**: Human-in-the-loop with native interruption support
4. **Automatic Restarts**: Opportunity Analysis can automatically restart the search if needed
5. **Persistence**: Workflow state automatically saved and can be resumed

## 🔄 Migration Benefits

### **Maintainability**
- **Before**: 600+ lines of workflow logic embedded in React component
- **After**: Clean separation between UI and workflow logic

### **Scalability**
- **Before**: Manual state management becomes complex with more agents
- **After**: LangGraph.js handles arbitrary complexity with same patterns

### **Reliability**
- **Before**: Custom error handling and edge cases
- **After**: LangGraph.js battle-tested framework with robust error handling

### **Features**
- **Before**: Basic human-in-the-loop
- **After**: Advanced interruption, branching, and time-travel capabilities

## 🛠️ Advanced LangGraph.js Features Available

1. **Time Travel**: Replay past actions with `graph.updateState`
2. **Branching**: Explore alternative paths from any state
3. **Subgraphs**: Hierarchical agent teams
4. **Parallel Execution**: Independent agents can run simultaneously
5. **Custom Checkpointers**: Database persistence, cross-thread memory

## 📊 Performance Comparison

| Aspect | Original | LangGraph.js |
|--------|----------|--------------|
| **Lines of Code** | ~600 workflow lines | ~200 graph definition |
| **State Management** | Manual useState arrays | Automatic with MemorySaver |
| **Error Handling** | Custom try/catch | Built-in framework handling |
| **Persistence** | localStorage manual | Automatic state persistence |
| **Streaming** | Custom implementation | Native streaming support |
| **Scalability** | Complex with more agents | Same patterns for any complexity |

## 🎉 Next Steps

1. **Test the Implementation**: Run the LangGraph.js version and compare performance
2. **Add Advanced Features**: Implement time travel, branching, or parallel execution
3. **Database Persistence**: Replace MemorySaver with PostgreSQL for production
4. **Multi-Agent Teams**: Create hierarchical agent structures with subgraphs

This LangGraph.js implementation provides a solid foundation for scaling your multi-agent system while maintaining clean, maintainable code.

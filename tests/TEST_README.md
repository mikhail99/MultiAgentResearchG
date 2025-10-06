# A-Mem System Tests

This directory contains comprehensive tests for the Agentic Memory (A-Mem) system that validates the core functionality of the memory network.

## 🧪 Test Overview

The test suite covers the three main components of the A-Mem system:

### 1. Memory Construction (`testMemoryConstruction`)
- ✅ **Validates structured memory creation** from text content
- ✅ **Tests keyword extraction** and context generation
- ✅ **Verifies memory note structure** and metadata
- ✅ **Checks agent attribution** and timestamps

### 2. Dynamic Linking (`testDynamicLinking`)
- ✅ **Tests automatic connection discovery** between memories
- ✅ **Validates relationship detection** based on keyword overlap
- ✅ **Checks link strength calculation** and relationship types
- ✅ **Verifies bidirectional linking** and metadata integrity

### 3. Memory Evolution (`testMemoryEvolution`)
- ✅ **Tests context updating** when new information is learned
- ✅ **Validates tag enhancement** and metadata evolution
- ✅ **Checks evolution action generation** and application
- ✅ **Verifies memory network adaptation** over time

### 4. Memory Quality Calculation (`testMemoryQuality`)
- ✅ **Tests connectivity scoring** (linked vs unlinked notes)
- ✅ **Validates strength assessment** (average link confidence)
- ✅ **Checks diversity measurement** (unique vs total keywords)
- ✅ **Verifies quality score combination** and normalization

## 🚀 Running the Tests

### Prerequisites
- Node.js installed
- Terminal access

### Execute Tests
```bash
# From the project root directory
node test_amem.mjs
```

### Expected Output
```
🧪 Starting A-Mem System Tests...

==================================================

📝 Test 1: Memory Construction
Testing automatic creation of structured memory from text...

✅ id: string
✅ content: Recent advances in machine learning algorithms...
✅ context: string
✅ keywords: true
✅ tags: true
✅ agentName: SEARCH
✅ iteration: 1
✅ links: true

📊 Memory Construction: 8/8 tests passed
🔑 Extracted Keywords: machine learning, algorithms, transformer, reinforcement learning, artificial intelligence
🏷️  Generated Tags: AI, ML, algorithms, research, technology

🔗 Test 2: Dynamic Linking
Testing automatic connection of related memories...

🔗 Generated 1 links for new memory

🔗 Link 1:
✅ id: string
✅ sourceNoteId: mem_learnings_123...
✅ targetNoteId: string
✅ strength: number
✅ relationship: related

📊 Dynamic Linking: 1 links created successfully

🔄 Test 3: Memory Evolution
Testing automatic updating of existing memories...

🎯 Found 1 connected notes for evolution
🔄 Generated 2 evolution actions

🔄 Evolution Actions Applied:
Action 1: update_context on mem_search_001
  New Context: Overview of recent advances in machine learning algorithms... Enhanced understanding of integration with reinforcement learning approaches.
Action 2: update_tags on mem_search_001
  New Tags: AI, ML, algorithms, research, technology, transformers, RL, integration, opportunities

📊 Memory Evolution: 2 actions applied successfully

📊 Test 4: Memory Quality Calculation
Testing memory network quality assessment...

1. Empty memory:
   Quality Score: 0.0%
2. Notes without links:
   Quality Score: 20.0%
   Connectivity: 0.0%
3. Full memory network:
   Quality Score: 75.0%
   Connectivity: 100.0%
   Avg Link Strength: 85.0%

📊 Memory Quality Calculation: Test completed

==================================================
🏁 A-Mem System Tests Complete!
==================================================

📋 Test Summary:
- Memory Notes Created: 2
- Links Generated: 1
- Evolution Actions: Applied
- Final Quality Score: 75.0%
🎉 High-quality memory network created!
```

## 📊 Test Scenarios

### Sample Data Used
The tests use realistic research content about machine learning algorithms:

- **Search Agent**: General overview of ML algorithm advances
- **Learnings Agent**: Detailed explanation of transformer architectures
- **Opportunity Agent**: Integration possibilities between transformers and RL

### Memory Network Flow
```
1. Search Agent creates memory → Keywords: [ML, algorithms, transformer]
2. Learnings Agent creates memory → Keywords: [transformer, attention, architecture]
3. System detects "transformer" overlap → Creates "related" link (85% strength)
4. Opportunity Agent adds context → Updates existing memories with new insights
5. Quality score improves from 0% → 75% as network becomes connected
```

## 🎯 What the Tests Validate

### Memory Construction Quality
- **Structured data creation** from unstructured text
- **Intelligent keyword extraction** and context summarization
- **Proper metadata attachment** (agent, timestamp, iteration)
- **Tag generation** for categorization and retrieval

### Linking Intelligence
- **Semantic similarity detection** based on keyword overlap
- **Relationship type classification** (related, follows, supports, etc.)
- **Confidence scoring** based on overlap strength
- **Bidirectional link creation** with proper metadata

### Evolution Capability
- **Context enhancement** when new information is discovered
- **Tag expansion** to include new relevant categories
- **Memory adaptation** without losing original content
- **Network growth** through incremental learning

### Quality Assessment
- **Connectivity measurement** (percentage of linked memories)
- **Strength evaluation** (average confidence of connections)
- **Diversity scoring** (keyword uniqueness ratio)
- **Composite scoring** with weighted components

## 🔧 Test Architecture

### Mock Data Approach
- **No external dependencies** - runs entirely with mock data
- **Deterministic results** - same inputs always produce same outputs
- **Comprehensive coverage** - tests all major functionality paths
- **Fast execution** - no network calls or LLM API dependencies

### Validation Strategy
- **Structural validation** - ensures correct data types and formats
- **Content validation** - verifies keyword extraction and context generation
- **Relationship validation** - checks link creation and evolution logic
- **Quality validation** - tests scoring algorithms and metrics

## 📈 Interpreting Results

### Success Metrics
- **Memory Construction**: 8/8 tests pass (100% success rate)
- **Dynamic Linking**: Links created with proper relationships
- **Memory Evolution**: Context and tags successfully updated
- **Quality Score**: Above 50% indicates healthy memory network

### Expected Behaviors
- **First memory**: Isolated node with no connections
- **Second memory**: Links to first based on keyword similarity
- **Evolution**: Existing memories gain new context and tags
- **Quality improvement**: Score increases with connectivity and diversity

This test suite provides comprehensive validation of the A-Mem system's core capabilities, ensuring reliable memory construction, intelligent linking, adaptive evolution, and accurate quality assessment.

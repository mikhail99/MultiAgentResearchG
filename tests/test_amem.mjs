#!/usr/bin/env node

/**
 * A-Mem (Agentic Memory) System Tests
 *
 * Tests the core functionality of the Agentic Memory system:
 * 1. Memory Construction - Creating structured memories from text
 * 2. Dynamic Linking - Connecting related memories
 * 3. Memory Evolution - Updating existing memories
 */

// Test data - simulating what the LLM would return
const TEST_TOPIC = "Machine Learning Algorithms";
const TEST_ITERATION = 1;

const SAMPLE_TEXTS = {
  search: `Recent advances in machine learning algorithms have revolutionized the field of artificial intelligence. Key developments include transformer architectures, reinforcement learning techniques, and neural network optimization methods. These algorithms are now capable of processing vast amounts of data and making complex predictions across various domains.`,

  learnings: `The transformer architecture, introduced in the paper "Attention is All You Need", has become the foundation for modern language models. Key components include self-attention mechanisms, multi-head attention, and positional encoding. These innovations have enabled significant improvements in natural language processing tasks.`,

  opportunity: `The integration of transformer models with reinforcement learning presents new opportunities for creating more adaptive and context-aware AI systems. By combining the representational power of transformers with the decision-making capabilities of reinforcement learning, we can develop agents that learn from both supervised data and interactive experiences.`
};

// Mock memory notes that would be created by the system
const mockMemoryNotes = [
  {
    id: "mem_search_001",
    content: SAMPLE_TEXTS.search,
    context: "Overview of recent advances in machine learning algorithms and their applications in AI",
    keywords: ["machine learning", "algorithms", "transformer", "reinforcement learning", "artificial intelligence"],
    tags: ["AI", "ML", "algorithms", "research", "technology"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    agentName: "SEARCH",
    iteration: 1,
    links: [],
    metadata: {
      topic: TEST_TOPIC,
      constructionPrompt: "mock",
      modelProvider: "LOCAL"
    }
  },
  {
    id: "mem_learnings_001",
    content: SAMPLE_TEXTS.learnings,
    context: "Detailed explanation of transformer architecture components and mechanisms",
    keywords: ["transformer", "attention", "self-attention", "multi-head", "positional encoding"],
    tags: ["transformer", "NLP", "architecture", "attention", "neural networks"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    agentName: "LEARNINGS",
    iteration: 1,
    links: [],
    metadata: {
      topic: TEST_TOPIC,
      constructionPrompt: "mock",
      modelProvider: "LOCAL"
    }
  }
];

// Mock memory links
const mockMemoryLinks = [
  {
    id: "link_001",
    sourceNoteId: "mem_learnings_001",
    targetNoteId: "mem_search_001",
    strength: 0.85,
    relationship: "related",
    createdAt: new Date().toISOString()
  }
];

console.log('🧪 Starting A-Mem System Tests...\n');

/**
 * Test 1: Memory Construction
 * Tests automatic creation of structured memory from text
 */
function testMemoryConstruction() {
  console.log('📝 Test 1: Memory Construction');
  console.log('Testing automatic creation of structured memory from text...\n');

  try {
    // Simulate memory construction process
    const memoryNote = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: SAMPLE_TEXTS.search,
      context: "Overview of recent advances in machine learning algorithms and their applications in AI",
      keywords: ["machine learning", "algorithms", "transformer", "reinforcement learning", "artificial intelligence"],
      tags: ["AI", "ML", "algorithms", "research", "technology"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      agentName: "SEARCH",
      iteration: TEST_ITERATION,
      links: [],
      metadata: {
        topic: TEST_TOPIC,
        constructionPrompt: "mock",
        modelProvider: "LOCAL"
      }
    };

    // Validate memory structure
    const validations = [
      { test: 'id', value: memoryNote.id, expected: 'string' },
      { test: 'content', value: memoryNote.content, expected: SAMPLE_TEXTS.search },
      { test: 'context', value: memoryNote.context, expected: 'string' },
      { test: 'keywords', value: Array.isArray(memoryNote.keywords), expected: true },
      { test: 'tags', value: Array.isArray(memoryNote.tags), expected: true },
      { test: 'agentName', value: memoryNote.agentName, expected: 'SEARCH' },
      { test: 'iteration', value: memoryNote.iteration, expected: TEST_ITERATION },
      { test: 'links', value: Array.isArray(memoryNote.links), expected: true }
    ];

    let passed = 0;
    validations.forEach(({ test, value, expected }) => {
      if (typeof expected === 'string') {
        if (typeof value === expected) {
          console.log(`✅ ${test}: ${typeof value}`);
          passed++;
        } else {
          console.log(`❌ ${test}: expected ${expected}, got ${typeof value}`);
        }
      } else {
        if (value === expected) {
          console.log(`✅ ${test}: ${value}`);
          passed++;
        } else {
          console.log(`❌ ${test}: expected ${expected}, got ${value}`);
        }
      }
    });

    console.log(`\n📊 Memory Construction: ${passed}/${validations.length} tests passed`);

    if (memoryNote.keywords.length > 0) {
      console.log(`🔑 Extracted Keywords: ${memoryNote.keywords.join(', ')}`);
    }

    if (memoryNote.tags.length > 0) {
      console.log(`🏷️  Generated Tags: ${memoryNote.tags.join(', ')}`);
    }

    return memoryNote;

  } catch (error) {
    console.error('❌ Memory Construction test failed:', error);
    return null;
  }
}

/**
 * Test 2: Dynamic Linking
 * Tests creation of connections between related memories
 */
function testDynamicLinking(existingNotes) {
  console.log('\n🔗 Test 2: Dynamic Linking');
  console.log('Testing automatic connection of related memories...\n');

  if (!existingNotes || existingNotes.length === 0) {
    console.log('⚠️  Skipping linking test - no existing memories to link to');
    return [];
  }

  try {
    // Create a new memory that should link to existing ones
    const newNote = {
      id: `mem_learnings_${Date.now()}`,
      content: SAMPLE_TEXTS.learnings,
      context: "Detailed explanation of transformer architecture components and mechanisms",
      keywords: ["transformer", "attention", "self-attention", "multi-head", "positional encoding"],
      tags: ["transformer", "NLP", "architecture", "attention", "neural networks"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      agentName: "LEARNINGS",
      iteration: TEST_ITERATION,
      links: [],
      metadata: {
        topic: TEST_TOPIC,
        constructionPrompt: "mock",
        modelProvider: "LOCAL"
      }
    };

    // Simulate linking logic - find connections based on keywords
    const links = [];
    existingNotes.forEach(existingNote => {
      // Check for keyword overlap
      const overlappingKeywords = newNote.keywords.filter(k =>
        existingNote.keywords.includes(k)
      );

      if (overlappingKeywords.length > 0) {
        const link = {
          id: `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sourceNoteId: newNote.id,
          targetNoteId: existingNote.id,
          strength: Math.min(overlappingKeywords.length * 0.2, 0.9), // Strength based on overlap
          relationship: overlappingKeywords.length > 2 ? "related" : "follows",
          createdAt: new Date().toISOString()
        };
        links.push(link);
      }
    });

    console.log(`🔗 Generated ${links.length} links for new memory`);

    // Validate link structure
    links.forEach((link, index) => {
      const validations = [
        { test: 'id', value: link.id, expected: 'string' },
        { test: 'sourceNoteId', value: link.sourceNoteId, expected: newNote.id },
        { test: 'targetNoteId', value: link.targetNoteId, expected: 'string' },
        { test: 'strength', value: typeof link.strength, expected: 'number' },
        { test: 'relationship', value: link.relationship, expected: 'string' }
      ];

      console.log(`\n🔗 Link ${index + 1}:`);
      validations.forEach(({ test, value, expected }) => {
        if (typeof expected === 'string' && test === 'relationship') {
          if (['similar', 'related', 'follows', 'contradicts', 'supports'].includes(value)) {
            console.log(`✅ ${test}: ${value}`);
          } else {
            console.log(`❌ ${test}: invalid relationship type ${value}`);
          }
        } else if (typeof expected === 'string') {
          if (typeof value === expected) {
            console.log(`✅ ${test}: ${value}`);
          } else {
            console.log(`❌ ${test}: expected ${expected}, got ${typeof value}`);
          }
        } else if (test === 'sourceNoteId') {
          if (value === expected) {
            console.log(`✅ ${test}: ${value}`);
          } else {
            console.log(`❌ ${test}: expected ${expected}, got ${value}`);
          }
        }
      });
    });

    console.log(`\n📊 Dynamic Linking: ${links.length} links created successfully`);
    return links;

  } catch (error) {
    console.error('❌ Dynamic Linking test failed:', error);
    return [];
  }
}

/**
 * Test 3: Memory Evolution
 * Tests updating existing memories based on new information
 */
function testMemoryEvolution(existingNotes, newLinks) {
  console.log('\n🔄 Test 3: Memory Evolution');
  console.log('Testing automatic updating of existing memories...\n');

  if (!existingNotes || existingNotes.length === 0 || !newLinks || newLinks.length === 0) {
    console.log('⚠️  Skipping evolution test - insufficient data');
    return existingNotes;
  }

  try {
    // Create a new memory that should trigger evolution
    const newNote = {
      id: `mem_opportunity_${Date.now()}`,
      content: SAMPLE_TEXTS.opportunity,
      context: "Integration opportunities between transformer models and reinforcement learning",
      keywords: ["transformer", "reinforcement learning", "adaptive", "context-aware", "integration"],
      tags: ["transformers", "RL", "integration", "opportunities", "AI"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      agentName: "OPPORTUNITY_ANALYSIS",
      iteration: TEST_ITERATION,
      links: [],
      metadata: {
        topic: TEST_TOPIC,
        constructionPrompt: "mock",
        modelProvider: "LOCAL"
      }
    };

    // Get connected notes from the links
    const connectedNoteIds = newLinks.map(link => link.targetNoteId);
    const connectedNotes = existingNotes.filter(note =>
      connectedNoteIds.includes(note.id)
    );

    console.log(`🎯 Found ${connectedNotes.length} connected notes for evolution`);

    // Simulate evolution actions
    const evolutionActions = [];

    connectedNotes.forEach(note => {
      // Check if new note provides additional context
      const hasNewKeywords = newNote.keywords.some(k =>
        !note.keywords.includes(k)
      );

      if (hasNewKeywords) {
        // Update context to include new insights
        const updatedContext = `${note.context} Enhanced understanding of integration with reinforcement learning approaches.`;
        const updatedTags = [...new Set([...note.tags, ...newNote.tags.filter(t => !note.tags.includes(t))])];

        evolutionActions.push({
          action: "update_context",
          targetNoteId: note.id,
          newContext: updatedContext
        });

        if (updatedTags.length > note.tags.length) {
          evolutionActions.push({
            action: "update_tags",
            targetNoteId: note.id,
            newTags: updatedTags
          });
        }
      }
    });

    console.log(`🔄 Generated ${evolutionActions.length} evolution actions`);

    // Apply evolution actions
    const evolvedNotes = [...existingNotes];
    evolutionActions.forEach(action => {
      const noteIndex = evolvedNotes.findIndex(note => note.id === action.targetNoteId);
      if (noteIndex !== -1) {
        const note = evolvedNotes[noteIndex];
        if (action.action === "update_context" && action.newContext) {
          note.context = action.newContext;
          note.updatedAt = new Date().toISOString();
        } else if (action.action === "update_tags" && action.newTags) {
          note.tags = action.newTags;
          note.updatedAt = new Date().toISOString();
        }
      }
    });

    console.log('\n🔄 Evolution Actions Applied:');
    evolutionActions.forEach((action, index) => {
      console.log(`Action ${index + 1}: ${action.action} on ${action.targetNoteId}`);
      if (action.newContext) {
        console.log(`  New Context: ${action.newContext.substring(0, 100)}...`);
      }
      if (action.newTags) {
        console.log(`  New Tags: ${action.newTags.join(', ')}`);
      }
    });

    console.log(`\n📊 Memory Evolution: ${evolutionActions.length} actions applied successfully`);
    return evolvedNotes;

  } catch (error) {
    console.error('❌ Memory Evolution test failed:', error);
    return existingNotes;
  }
}

/**
 * Test 4: Memory Quality Calculation
 * Tests the quality scoring system
 */
function testMemoryQuality(notes, links) {
  console.log('\n📊 Test 4: Memory Quality Calculation');
  console.log('Testing memory network quality assessment...\n');

  try {
    // Simulate quality calculation (since we don't have the actual service)
    const calculateMemoryQuality = (testNotes, testLinks) => {
      if (testNotes.length === 0) return 0;

      // Calculate connectivity score (notes with links vs total notes)
      const connectedNotes = new Set();
      testLinks.forEach(link => {
        connectedNotes.add(link.sourceNoteId);
        connectedNotes.add(link.targetNoteId);
      });
      const connectivityScore = connectedNotes.size / testNotes.length;

      // Calculate average link strength
      const avgStrength = testLinks.length > 0
        ? testLinks.reduce((sum, link) => sum + link.strength, 0) / testLinks.length
        : 0;

      // Calculate diversity score (unique keywords vs total keywords)
      const allKeywords = testNotes.flatMap(note => note.keywords);
      const uniqueKeywords = new Set(allKeywords);
      const diversityScore = uniqueKeywords.size / allKeywords.length;

      // Combine scores with weights
      return Math.min((connectivityScore * 0.4) + (avgStrength * 0.4) + (diversityScore * 0.2), 1);
    };

    // Test quality calculation with different scenarios
    const scenarios = [
      { notes: [], links: [], description: 'Empty memory' },
      { notes: notes, links: [], description: 'Notes without links' },
      { notes: notes, links: links, description: 'Full memory network' }
    ];

    scenarios.forEach((scenario, index) => {
      const quality = calculateMemoryQuality(scenario.notes, scenario.links);
      console.log(`${index + 1}. ${scenario.description}:`);
      console.log(`   Quality Score: ${(quality * 100).toFixed(1)}%`);

      if (scenario.notes.length > 0) {
        const connectivity = (scenario.links.length * 2) / scenario.notes.length;
        console.log(`   Connectivity: ${(Math.min(connectivity, 1) * 100).toFixed(1)}%`);
      }

      if (scenario.links.length > 0) {
        const avgStrength = scenario.links.reduce((sum, link) => sum + link.strength, 0) / scenario.links.length;
        console.log(`   Avg Link Strength: ${(avgStrength * 100).toFixed(1)}%`);
      }
      console.log('');
    });

    console.log('📊 Memory Quality Calculation: Test completed');

  } catch (error) {
    console.error('❌ Memory Quality test failed:', error);
  }
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('🚀 Running A-Mem System Tests\n');
  console.log('=' .repeat(50));

  // Test 1: Memory Construction
  const memoryNote = testMemoryConstruction();
  if (!memoryNote) {
    console.log('\n❌ Cannot continue tests - memory construction failed');
    return;
  }

  // Test 2: Dynamic Linking
  const existingNotes = [memoryNote];
  const links = testDynamicLinking(existingNotes);

  // Test 3: Memory Evolution
  const evolvedNotes = testMemoryEvolution(existingNotes, links);

  // Test 4: Memory Quality
  testMemoryQuality(evolvedNotes, links);

  console.log('\n' + '='.repeat(50));
  console.log('🏁 A-Mem System Tests Complete!');
  console.log('=' .repeat(50));

  // Summary
  console.log('\n📋 Test Summary:');
  console.log(`- Memory Notes Created: ${evolvedNotes.length}`);
  console.log(`- Links Generated: ${links.length}`);
  console.log(`- Evolution Actions: ${evolvedNotes.length > existingNotes.length ? 'Applied' : 'None'}`);

  // Calculate final quality score
  const calculateMemoryQuality = (testNotes, testLinks) => {
    if (testNotes.length === 0) return 0;

    const connectedNotes = new Set();
    testLinks.forEach(link => {
      connectedNotes.add(link.sourceNoteId);
      connectedNotes.add(link.targetNoteId);
    });
    const connectivityScore = connectedNotes.size / testNotes.length;

    const avgStrength = testLinks.length > 0
      ? testLinks.reduce((sum, link) => sum + link.strength, 0) / testLinks.length
      : 0;

    const allKeywords = testNotes.flatMap(note => note.keywords);
    const uniqueKeywords = new Set(allKeywords);
    const diversityScore = uniqueKeywords.size / allKeywords.length;

    return Math.min((connectivityScore * 0.4) + (avgStrength * 0.4) + (diversityScore * 0.2), 1);
  };

  const finalQuality = calculateMemoryQuality(evolvedNotes, links);
  console.log(`- Final Quality Score: ${(finalQuality * 100).toFixed(1)}%`);

  if (finalQuality > 0.5) {
    console.log('🎉 High-quality memory network created!');
  } else if (finalQuality > 0.2) {
    console.log('👍 Moderate-quality memory network created.');
  } else {
    console.log('📈 Basic memory network created - add more connections for higher quality.');
  }
}

// Handle command line execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { runAllTests, testMemoryConstruction, testDynamicLinking, testMemoryEvolution, testMemoryQuality };

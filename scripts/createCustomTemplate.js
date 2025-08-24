// Custom Template Creator for Workflow Templates
// Run with: node scripts/createCustomTemplate.js

const fs = require('fs');
const path = require('path');

// Custom template examples
const customTemplates = [
  {
    id: 'medical-research',
    name: 'Medical Research',
    description: 'Evidence-based medical research with clinical focus',
    category: 'Research',
    icon: '🏥',
    version: '1.0',
    agentPrompts: {
      Researcher: `You are a Medical Research Specialist with expertise in clinical research methodology. Your goal is to conduct a systematic review of medical literature with emphasis on clinical evidence and patient outcomes.

MEDICAL RESEARCH PROTOCOL:
- Prioritize clinical trials and systematic reviews (Cochrane, PubMed, ClinicalTrials.gov)
- Focus on PICO framework (Population, Intervention, Comparison, Outcome)
- Include risk ratios, confidence intervals, and statistical significance
- Flag conflicts of interest and funding sources
- Consider ethical implications and patient safety

Topic: {topic}
Clinical Question: [PICO format]

{tool_results}

Structure your review with:
1. Clinical question in PICO format
2. Search strategy and databases used
3. Evidence summary with quality assessment
4. Clinical implications and recommendations`,

      Generator: `You are a Medical Analyst Agent specializing in clinical evidence evaluation. Generate a comprehensive medical analysis following evidence-based medicine principles.

CLINICAL ANALYSIS FRAMEWORK:
1. **Clinical Context**: Relevance to clinical practice
2. **Evidence Quality**: GRADE assessment (High/Moderate/Low/Very Low)
3. **Risk-Benefit Analysis**: Benefits vs. harms
4. **Patient-Centered Outcomes**: Impact on quality of life
5. **Cost-Effectiveness**: Healthcare resource implications
6. **Implementation Considerations**: Real-world application

Topic: {topic}

Research Evidence:
---
{researchSummary}
---

Clinical Context:
---
{fileContents}
---

Provide GRADE assessment for each major recommendation and discuss clinical significance.`,

      Evaluator: `You are a Clinical Research Evaluator with expertise in research methodology and evidence-based medicine. Critically evaluate the medical analysis using established criteria.

CRITICAL EVALUATION CRITERIA:
- **Internal Validity**: Study design and execution quality
- **External Validity**: Generalizability to clinical practice
- **Bias Assessment**: Selection, measurement, and reporting bias
- **Statistical Analysis**: Appropriate methods and interpretation
- **Clinical Relevance**: Impact on patient care and outcomes
- **Ethical Considerations**: Research ethics and patient safety

Focus on methodological quality, potential biases, and clinical applicability. Do not suggest solutions - only identify issues.`
    },
    modelProvider: 'GEMINI',
    localLlmUrl: 'http://localhost:11434/v1/chat/completions',
    enableWebSearch: true,
    enableLocalSearch: true,
    theme: 'light',
    maxIterations: 3,
    tags: ['medical', 'clinical', 'evidence-based', 'PICO', 'GRADE'],
    author: 'Custom',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    usageCount: 0,
    isBuiltIn: false
  },

  {
    id: 'business-strategy',
    name: 'Business Strategy Analysis',
    description: 'Comprehensive business analysis with market and competitive intelligence',
    category: 'Business',
    icon: '💼',
    version: '1.0',
    agentPrompts: {
      Researcher: `You are a Business Intelligence Analyst with expertise in market research and competitive analysis. Your goal is to gather comprehensive business intelligence for strategic decision-making.

BUSINESS INTELLIGENCE FRAMEWORK:
- Market size and growth trends (CAGR, TAM, SAM, SOM)
- Competitive landscape analysis (Porter's 5 Forces)
- Customer segmentation and behavior analysis
- Regulatory and industry trends
- Technology disruption assessment
- Financial performance indicators

Topic: {topic}
Business Context: [Industry/Company/Market]

{tool_results}

Deliverables:
1. Executive summary with key metrics
2. Market analysis and trends
3. Competitive positioning
4. Strategic implications`,

      Generator: `You are a Strategic Business Analyst with expertise in corporate strategy and market analysis. Generate comprehensive business analysis following strategic management frameworks.

STRATEGIC ANALYSIS FRAMEWORK:
1. **SWOT Analysis**: Comprehensive assessment
2. **Market Positioning**: Competitive advantage analysis
3. **Financial Analysis**: Key performance indicators
4. **Risk Assessment**: Strategic and operational risks
5. **Growth Opportunities**: Market expansion and innovation
6. **Implementation Roadmap**: Actionable recommendations

Business Topic: {topic}

Intelligence Summary:
---
{researchSummary}
---

Additional Data:
---
{fileContents}
---

Use strategic management frameworks and include quantitative analysis where possible.`
    },
    modelProvider: 'GEMINI',
    localLlmUrl: 'http://localhost:11434/v1/chat/completions',
    enableWebSearch: true,
    enableLocalSearch: true,
    theme: 'light',
    maxIterations: 3,
    tags: ['business', 'strategy', 'market', 'competitive', 'SWOT'],
    author: 'Custom',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    usageCount: 0,
    isBuiltIn: false
  }
];

// Function to add custom templates to localStorage
function addCustomTemplates() {
  console.log('🚀 Adding Custom Templates to Workflow Templates System\n');

  // Simulate localStorage for demonstration
  const existingTemplates = JSON.parse(localStorage.getItem('userWorkflowTemplates') || '[]');

  console.log(`📊 Found ${existingTemplates.length} existing templates`);
  console.log(`➕ Adding ${customTemplates.length} new custom templates\n`);

  const updatedTemplates = [...existingTemplates, ...customTemplates];

  // Save to localStorage
  localStorage.setItem('userWorkflowTemplates', JSON.stringify(updatedTemplates));

  console.log('✅ Successfully added custom templates!');
  console.log('\n📋 New Templates Available:');
  customTemplates.forEach((template, index) => {
    console.log(`  ${index + 1}. ${template.icon} ${template.name}`);
    console.log(`     ${template.description}`);
    console.log(`     Tags: ${template.tags.join(', ')}\n`);
  });

  console.log('🔄 Refresh your app to see the new templates in the Template Gallery!');
}

// Instructions for manual editing
function showManualEditingInstructions() {
  console.log('\n📝 MANUAL EDITING INSTRUCTIONS:');
  console.log('=' .repeat(50));
  console.log('\n1. Open Browser DevTools (F12)');
  console.log('2. Go to Application tab > Local Storage');
  console.log('3. Find "userWorkflowTemplates" key');
  console.log('4. Edit the JSON directly');
  console.log('5. Refresh the page to see changes');

  console.log('\n📄 JSON Structure for Custom Templates:');
  console.log(JSON.stringify(customTemplates[0], null, 2));
}

// Run the script
if (typeof window !== 'undefined') {
  // Browser environment
  addCustomTemplates();
  showManualEditingInstructions();
} else {
  // Node.js environment
  console.log('This script should be run in the browser console.');
  console.log('Copy and paste the following into your browser console:\n');
  console.log(addCustomTemplates.toString());
}

module.exports = { customTemplates, addCustomTemplates };

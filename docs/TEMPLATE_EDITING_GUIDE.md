# 🎯 Workflow Templates - Complete Editing Guide

This comprehensive guide covers all methods for customizing and editing Workflow Templates in your Multi-Agent Research Assistant.

## 📋 Table of Contents

1. [Quick Start](#-quick-start)
2. [Editing Methods Overview](#-editing-methods-overview)
3. [Method 1: Direct Code Editing](#-method-1-direct-code-editing)
4. [Method 2: Browser Console Editor](#-method-2-browser-console-editor)
5. [Method 3: Direct localStorage Editing](#-method-3-direct-localstorage-editing)
6. [Method 4: Custom Template Creation](#-method-4-custom-template-creation)
7. [Advanced Customization Techniques](#-advanced-customization-techniques)
8. [Template Examples](#-template-examples)
9. [Performance Optimization](#-performance-optimization)
10. [Best Practices](#-best-practices)
11. [Troubleshooting](#-troubleshooting)

---

## 🚀 Quick Start

### **Simplest Way to Customize**
```javascript
// 1. Open browser console (F12)
// 2. Load the template editor:
const script = document.createElement('script');
script.src = 'scripts/templateEditor.js';
document.head.appendChild(script);

// 3. Use the editor:
setTimeout(() => {
  window.templateEditor.editPrompt('academic-research', 'Researcher', 'Your custom prompt here...');
}, 1000);
```

### **Immediate Template Preview**
```javascript
// See what any template does before using it
// Click "Preview" button on any template card in the gallery
```

---

## 🎨 Editing Methods Overview

| Method | Difficulty | Speed | Flexibility | Persistence |
|--------|------------|-------|-------------|-------------|
| **Direct Code** | Expert | Fast | Maximum | Permanent |
| **Console Editor** | Intermediate | Medium | High | Session-based |
| **localStorage** | Advanced | Medium | High | Persistent |
| **Custom Creation** | Expert | Slow | Maximum | Persistent |

---

## 🔧 Method 1: Direct Code Editing

### **Edit Built-in Templates**

**File:** `hooks/useWorkflowTemplates.ts`

**What I Already Enhanced:**
```typescript
// Enhanced Academic Research Template
Researcher: `You are a specialist Research Agent with expertise in [YOUR_FIELD]...
CRITICAL INSTRUCTIONS:
- Prioritize sources from the last 3 years when available
- Always include DOI links and publication years for citations
- Focus on peer-reviewed journals and conference proceedings
- Structure your review with clear headings and subheadings`

Generator: `You are an expert Analyst Agent specializing in evidence-based analysis...
ANALYSIS FRAMEWORK:
1. **Contextual Background**: Synthesize with broader field context
2. **Evidence Evaluation**: Assess quality and reliability of sources
3. **Theoretical Integration**: Connect findings to established theories`
```

### **How to Modify:**
```bash
# Edit the source code directly
code hooks/useWorkflowTemplates.ts

# Find the template you want to modify
# Update the agentPrompts object
# Rebuild and restart the app
npm run build
```

### **Pros & Cons:**
- ✅ **Permanent changes** that persist across sessions
- ✅ **Full control** over all template aspects
- ✅ **Version control** friendly
- ❌ **Requires coding knowledge**
- ❌ **App restart required**
- ❌ **Affects all users**

---

## 🖥️ Method 2: Browser Console Editor

### **Load the Template Editor**

**Step 1:** Copy this into browser console:
```javascript
// Load the editor script
const script = document.createElement('script');
script.src = 'scripts/templateEditor.js';
document.head.appendChild(script);
```

**Step 2:** Wait for it to load, then use:
```javascript
// Initialize (if not auto-loaded)
const editor = new window.templateEditor;

// List all available templates
editor.listTemplates();
```

### **Common Commands:**

```javascript
// 1. List all templates
editor.listTemplates();

// 2. Get specific template details
editor.getTemplate('academic-research');

// 3. Edit an agent prompt
editor.editPrompt('academic-research', 'Researcher', `
  Your custom research prompt here...
  Add specific instructions for your use case.
`);

// 4. Update template settings
editor.updateSettings('academic-research', {
  theme: 'dark',
  maxIterations: 5,
  enableWebSearch: false
});

// 5. Clone a template
const newId = editor.cloneTemplate('academic-research', 'My Custom Academic');

// 6. Export template for sharing
editor.exportTemplate('academic-research');

// 7. Import template from JSON
editor.importTemplate(jsonString);

// 8. Delete a template
editor.deleteTemplate('template-id');
```

### **Pros & Cons:**
- ✅ **No coding required**
- ✅ **Immediate feedback**
- ✅ **Easy to experiment**
- ✅ **Works in browser**
- ❌ **Session-based** (lost on refresh)
- ❌ **No version control**

---

## 💾 Method 3: Direct localStorage Editing

### **Browser DevTools Method**

**Step 1:** Open Developer Tools (F12)
**Step 2:** Go to Application → Local Storage → Your domain
**Step 3:** Find `userWorkflowTemplates` key
**Step 4:** Edit the JSON directly

**Example JSON Structure:**
```json
[
  {
    "id": "academic-research",
    "name": "Academic Research",
    "agentPrompts": {
      "Researcher": "You are a specialist Research Agent...",
      "Generator": "You are an expert Analyst Agent...",
      "Evaluator": "You are a meticulous Critical Evaluator...",
      "Proposer": "You are an Academic Research Proposal Agent...",
      "NoveltyChecker": "You are a Novelty Assessment Agent...",
      "Aggregator": "You are an Academic Research Synthesizer..."
    },
    "modelProvider": "GEMINI",
    "enableWebSearch": true,
    "enableLocalSearch": true,
    "theme": "light",
    "maxIterations": 3,
    "tags": ["academic", "literature", "systematic"],
    "isBuiltIn": true
  }
]
```

### **Console Method:**
```javascript
// View current templates
const templates = JSON.parse(localStorage.getItem('userWorkflowTemplates') || '[]');
console.log(templates);

// Edit and save
templates[0].agentPrompts.Researcher = "Your custom prompt...";
localStorage.setItem('userWorkflowTemplates', JSON.stringify(templates));

// Refresh page to see changes
location.reload();
```

### **Pros & Cons:**
- ✅ **Persistent** across sessions
- ✅ **No app restart required**
- ✅ **Works in any browser**
- ❌ **JSON editing required**
- ❌ **Easy to break syntax**
- ❌ **No validation**

---

## 🚀 Method 4: Custom Template Creation

### **Medical Research Template Example:**

```javascript
const medicalTemplate = {
  id: 'medical-research',
  name: 'Medical Research',
  description: 'Evidence-based medical research with clinical focus',
  category: 'Research',
  icon: '🏥',
  version: '1.0',
  agentPrompts: {
    Researcher: `You are a Medical Research Specialist...

    MEDICAL RESEARCH PROTOCOL:
    - Prioritize clinical trials and systematic reviews
    - Focus on PICO framework (Population, Intervention, Comparison, Outcome)
    - Include risk ratios, confidence intervals, and statistical significance
    - Flag conflicts of interest and funding sources

    Topic: {topic}
    Clinical Question: [PICO format]

    {tool_results}`,

    Generator: `You are a Medical Analyst Agent...

    CLINICAL ANALYSIS FRAMEWORK:
    1. **Clinical Context**: Relevance to clinical practice
    2. **Evidence Quality**: GRADE assessment
    3. **Risk-Benefit Analysis**: Benefits vs. harms
    4. **Patient-Centered Outcomes**: Impact on quality of life

    Topic: {topic}
    Research Evidence: {researchSummary}`
  },
  modelProvider: 'GEMINI',
  enableWebSearch: true,
  enableLocalSearch: true,
  theme: 'light',
  maxIterations: 3,
  tags: ['medical', 'clinical', 'evidence-based'],
  author: 'Custom',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  usageCount: 0,
  isBuiltIn: false
};

// Add to localStorage
const existing = JSON.parse(localStorage.getItem('userWorkflowTemplates') || '[]');
existing.push(medicalTemplate);
localStorage.setItem('userWorkflowTemplates', JSON.stringify(existing));
```

### **Business Strategy Template:**
```javascript
const businessTemplate = {
  id: 'business-strategy',
  name: 'Business Strategy Analysis',
  category: 'Business',
  icon: '💼',
  agentPrompts: {
    Researcher: `You are a Business Intelligence Analyst...

    BUSINESS INTELLIGENCE FRAMEWORK:
    - Market size and growth trends (CAGR, TAM, SAM, SOM)
    - Competitive landscape analysis (Porter's 5 Forces)
    - Customer segmentation and behavior analysis
    - Financial performance indicators

    Topic: {topic}
    Business Context: [Industry/Company/Market]`
  }
  // ... other settings
};
```

### **Pros & Cons:**
- ✅ **Maximum customization**
- ✅ **Domain-specific workflows**
- ✅ **Complete control**
- ❌ **Complex setup**
- ❌ **Requires deep understanding**
- ❌ **Time-intensive**

---

## 🎨 Advanced Customization Techniques

### **1. Conditional Logic in Prompts**
```javascript
Researcher: `You are a Research Agent...

{topic.includes('medical') ?
  'Focus on clinical evidence and patient outcomes.' :
  'Focus on general research methodology.'
}

{tool_results}`
```

### **2. Dynamic Variables**
```javascript
Generator: `Analysis Framework:
- Use ${topic.length > 100 ? 'detailed' : 'concise'} analysis
- Include ${enableWebSearch ? 'web sources' : 'provided data only'}
- Format as ${outputFormat || 'structured report'}`
```

### **3. Template Inheritance**
```javascript
// Clone and modify existing template
const baseTemplate = editor.getTemplate('academic-research');
const specializedTemplate = {
  ...baseTemplate,
  name: 'Legal Academic Research',
  agentPrompts: {
    ...baseTemplate.agentPrompts,
    Researcher: baseTemplate.agentPrompts.Researcher + '\n\nLEGAL FOCUS: Include case law analysis...'
  }
};
```

### **4. Output Format Customization**
```javascript
Aggregator: `Create a structured academic paper with:
1. Abstract (150-250 words)
2. Introduction with research question
3. Literature Review with citations
4. Methodology section
5. Results and Discussion
6. Conclusion with implications
7. References (APA format with DOIs)`
```

---

## 📊 Template Examples

### **Specialized Domain Templates**

#### **Legal Research Template**
```javascript
agentPrompts: {
  Researcher: `You are a Legal Research Specialist...
  - Focus on case law and statutes
  - Include jurisdiction and precedent analysis
  - Consider legal implications and risks
  - Structure: Issue → Rule → Analysis → Conclusion`
}
```

#### **Financial Analysis Template**
```javascript
agentPrompts: {
  Researcher: `You are a Financial Analyst...
  - Include financial ratios and metrics
  - Analyze market trends and economic indicators
  - Consider regulatory and compliance factors
  - Focus on risk assessment and investment implications`
}
```

### **Workflow Optimization Templates**

#### **Fast Analysis Template**
```javascript
{
  id: 'quick-analysis',
  maxIterations: 1,
  enableWebSearch: true,
  enableLocalSearch: false,
  agentPrompts: {
    Researcher: 'Provide concise research summary...',
    Generator: 'Quick analysis focusing on key points...',
    Aggregator: 'Brief summary with main findings...'
  }
}
```

#### **Deep Research Template**
```javascript
{
  id: 'comprehensive-research',
  maxIterations: 5,
  enableWebSearch: true,
  enableLocalSearch: true,
  agentPrompts: {
    Researcher: 'Comprehensive literature review...',
    Generator: 'Detailed analysis with evidence evaluation...',
    Aggregator: 'Extensive final report with methodology...'
  }
}
```

---

## ⚡ Performance Optimization

### **Speed Optimization**
```javascript
// Fast template for quick analysis
{
  maxIterations: 2,
  enableWebSearch: true,
  enableLocalSearch: false,  // Skip for speed
  agentPrompts: {
    Researcher: 'Quick research synthesis...',
    Generator: 'Focused analysis on key aspects...',
    Aggregator: 'Concise summary with recommendations...'
  }
}
```

### **Quality Optimization**
```javascript
// Deep analysis template
{
  maxIterations: 4,
  enableWebSearch: true,
  enableLocalSearch: true,
  agentPrompts: {
    Researcher: 'Comprehensive systematic review...',
    Generator: 'Detailed evidence-based analysis...',
    Aggregator: 'Thorough synthesis with implications...'
  }
}
```

### **Cost Optimization**
```javascript
// Local LLM template (no API costs)
{
  modelProvider: 'LOCAL',
  maxIterations: 2,
  enableWebSearch: false,  // Reduce API calls
  agentPrompts: {
    // Optimized prompts for local models
  }
}
```

---

## 📋 Best Practices

### **Prompt Engineering**
- **Be specific** about output format and structure
- **Include examples** in your prompts when helpful
- **Use clear instructions** and avoid ambiguity
- **Test iteratively** and refine based on results
- **Consider token limits** and response lengths

### **Template Organization**
- **Use consistent naming** conventions
- **Add comprehensive tags** for searchability
- **Include usage context** in descriptions
- **Version control** your custom templates
- **Document changes** and reasoning

### **Testing & Validation**
- **Test with small topics** first
- **Validate output quality** before production use
- **Compare different prompt variations**
- **Monitor token usage** and costs
- **Gather user feedback** for improvements

### **Maintenance**
- **Regular review** of template effectiveness
- **Update prompts** based on new research methods
- **Archive unused templates**
- **Backup custom templates** regularly
- **Document template dependencies**

---

## 🔧 Troubleshooting

### **Common Issues & Solutions**

#### **1. Template Not Loading**
```javascript
// Check if template exists in localStorage
console.log(localStorage.getItem('userWorkflowTemplates'));

// Reset templates if corrupted
localStorage.removeItem('userWorkflowTemplates');
location.reload();
```

#### **2. Console Editor Not Working**
```javascript
// Check if editor is loaded
console.log(window.templateEditor);

// Manual initialization
const editor = new TemplateEditor();
window.templateEditor = editor;
```

#### **3. Changes Not Persisting**
```javascript
// Force save after edits
editor.saveTemplates();

// Check localStorage directly
console.log(localStorage.getItem('userWorkflowTemplates'));
```

#### **4. Invalid JSON Error**
```javascript
// Validate JSON before saving
try {
  JSON.parse(jsonString);
  console.log('✅ Valid JSON');
} catch (error) {
  console.error('❌ Invalid JSON:', error.message);
}
```

#### **5. Template Not Appearing**
```javascript
// Check template structure
const template = editor.getTemplate('your-template-id');
console.log('Template structure:', template);

// Verify required fields
if (!template.name || !template.agentPrompts) {
  console.error('Missing required fields');
}
```

### **Debug Commands**
```javascript
// View all templates in detail
const templates = JSON.parse(localStorage.getItem('userWorkflowTemplates') || '[]');
templates.forEach((t, i) => {
  console.log(`\n${i + 1}. ${t.name} (${t.id})`);
  console.log(`   Category: ${t.category}`);
  console.log(`   Agents: ${Object.keys(t.agentPrompts).join(', ')}`);
});

// Check for syntax errors in prompts
templates.forEach(t => {
  Object.entries(t.agentPrompts).forEach(([agent, prompt]) => {
    if (typeof prompt !== 'string') {
      console.error(`❌ ${t.name} - ${agent}: Not a string`);
    }
  });
});
```

---

## 🎯 Quick Reference

### **Most Common Edits:**

```javascript
// 1. Change research focus
editor.editPrompt('academic-research', 'Researcher',
  'Focus on [YOUR_SPECIFIC_FIELD] research...');

// 2. Modify output format
editor.editPrompt('academic-research', 'Aggregator',
  'Format as executive summary with bullet points...');

// 3. Adjust search behavior
editor.updateSettings('academic-research', {
  enableWebSearch: false,
  enableLocalSearch: true
});

// 4. Change iteration count
editor.updateSettings('academic-research', {
  maxIterations: 2
});
```

### **Template Variables Available:**
- `{topic}` - The research topic
- `{tool_results}` - Search results
- `{researchSummary}` - Research agent output
- `{generatedAnalysis}` - Generator agent output
- `{critique}` - Evaluator agent output
- `{proposal}` - Proposer agent output
- `{noveltyAssessment}` - Novelty checker output
- `{fileContents}` - Uploaded file contents
- `{fileNames}` - List of uploaded files

### **Settings Available:**
- `modelProvider`: 'GEMINI' | 'LOCAL'
- `localLlmUrl`: string
- `enableWebSearch`: boolean
- `enableLocalSearch`: boolean
- `theme`: 'light' | 'dark'
- `maxIterations`: number

---

## 🚀 Getting Started Guide

### **For Beginners:**
1. **Use the Preview feature** in the template gallery
2. **Start with console editing** for simple changes
3. **Clone existing templates** before major modifications
4. **Test changes on small topics** first

### **For Power Users:**
1. **Create custom templates** for specific domains
2. **Use direct code editing** for permanent changes
3. **Implement conditional logic** in prompts
4. **Set up template versioning** for different projects

### **For Teams:**
1. **Standardize templates** across team members
2. **Create domain-specific templates** for different departments
3. **Share templates** via export/import functionality
4. **Establish template governance** and review processes

---

## 📞 Support & Resources

### **Built-in Resources:**
- **Template Preview**: See what any template does before using it
- **Console Editor**: `window.templateEditor` with full API
- **Export/Import**: Share templates between instances
- **Version History**: Track changes and improvements

### **External Resources:**
- **Prompt Engineering Guide**: Best practices for LLM prompts
- **Template Marketplace**: Community-shared templates (future)
- **Documentation**: Comprehensive API reference
- **Support Forum**: Community discussions and help

---

## 🎉 Summary

You now have **complete control** over your Workflow Templates! Whether you prefer:

- **Quick edits** via browser console
- **Permanent changes** via code editing
- **Advanced customization** with custom templates
- **Team collaboration** with shared templates

The system is designed to grow with your needs. Start simple, then expand as you discover more advanced use cases.

**Happy customizing! 🚀**

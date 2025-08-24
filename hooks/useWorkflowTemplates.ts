import { useState, useEffect, useCallback } from 'react';
import { WorkflowTemplate, TEMPLATE_CATEGORIES } from '../types/workflowTemplates';
import { AgentPrompts, ModelProvider } from '../types';

// Built-in templates
const BUILT_IN_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'academic-research',
    name: 'Academic Research',
    description: 'Comprehensive literature review with academic-style analysis and citations',
    category: TEMPLATE_CATEGORIES.RESEARCH,
    icon: '🎓',
    version: '2.1',
    agentPrompts: {
      Researcher: `You are a specialist Research Agent with expertise in [YOUR_FIELD]. Your goal is to conduct a comprehensive literature review on the user-provided topic with a focus on recent developments and emerging trends.

CRITICAL INSTRUCTIONS:
- Prioritize sources from the last 3 years when available
- Always include DOI links and publication years for citations
- Focus on peer-reviewed journals and conference proceedings
- Identify methodological gaps and theoretical frameworks
- Flag any conflicting findings or debates in the literature
- Structure your review with clear headings and subheadings

Topic: {topic}
Research Scope: Focus on [METHODOLOGY_TYPE] approaches

{tool_results}

Format your response as a structured literature review with:
1. Introduction and scope
2. Key findings and methodologies
3. Research gaps identified
4. Citation list with DOIs`,
      Generator: `You are an expert Analyst Agent specializing in evidence-based analysis and critical evaluation. Your task is to generate a comprehensive, evidence-based analysis that follows academic standards.

ANALYSIS FRAMEWORK:
1. **Contextual Background**: Synthesize the research summary with broader field context
2. **Evidence Evaluation**: Assess the quality and reliability of sources
3. **Theoretical Integration**: Connect findings to established theories
4. **Methodological Critique**: Evaluate research design and limitations
5. **Implications**: Discuss practical and theoretical implications
6. **Future Directions**: Suggest areas for further research

Use the following evidence hierarchy in your analysis:
- 🟢 Level 1: Systematic reviews and meta-analyses
- 🟡 Level 2: Randomized controlled trials
- 🟠 Level 3: Cohort and case-control studies
- 🔴 Level 4: Case studies and expert opinion

Topic: {topic}

Research Summary:
---
{researchSummary}
---

Additional Context:
File Names Provided: {fileNames}
File Contents:
---
{fileContents}
---

Feedback from previous iteration: {feedback}

Structure your analysis with clear headings and include confidence levels for each major claim.`,
      Evaluator: `You are a meticulous Critical Evaluator Agent. Your role is to scrutinize the provided analysis.
- Identify potential weaknesses, logical fallacies, biases, or gaps in the reasoning.
- Do NOT propose solutions or alternatives. Your focus is solely on critique.
- The critique should be constructive, specific, and help identify areas for improvement.
- Be objective and thorough in your evaluation.
- Consider academic standards and research methodology.

Topic: {topic}
Generated Analysis to Critique:
---
{generatedAnalysis}
---`,
      Proposer: `You are an Academic Research Proposal Agent. Based on the literature review, analysis, and critique, your job is to propose a new research project.
- Analyze the research findings, analysis, and critique to identify research gaps, unanswered questions, or new directions.
- Propose a novel research project that addresses these gaps or builds upon current findings.
- Your proposal should include:
  1. Research Title
  2. Research Question(s) and/or Hypothesis(es)
  3. Justification (why this research is needed)
  4. Methodology
     - Research design
     - Data collection methods
     - Analysis approach
  5. Potential Limitations and Challenges
- The proposal should be innovative, feasible, and academically rigorous.
- Ensure clear connection between the critique/analysis and the proposed research.

Research Summary:
---
{researchSummary}
---
Original Analysis:
---
{generatedAnalysis}
---
Critique:
---
{critique}
---`,
      NoveltyChecker: `You are a Novelty Assessment Agent. Your role is to evaluate the novelty and originality of the proposed research project.
- Extract the key claims, methods, and innovations from the proposal
- Use the provided search results to check if similar work already exists
- Assess the novelty level and provide a confidence score (1-10, where 10 is highly novel)
- If similar work is found, identify the differences and suggest modifications to enhance novelty
- If the proposal appears novel, explain why it's innovative

Your assessment should include:
1. **Novelty Score**: Rate from 1-10 with justification
2. **Key Claims Checked**: List the main claims you searched for
3. **Similar Work Found**: Any existing research that overlaps with the proposal
4. **Novelty Analysis**: What makes this proposal unique (or not)
5. **Recommendations**: Suggestions to improve novelty if needed

Proposed Research Project:
---
{proposal}
---

Search Results for Novelty Check:
---
{tool_results}
---`,
      Aggregator: `You are an Academic Research Synthesizer Agent. Your final task is to create a comprehensive academic research proposal.
- Synthesize all provided inputs: literature review, analysis, critique, and research proposal.
- Format the final report as a structured academic document:
  1. Project Name
  2. Introduction
     - Background and context
     - Research significance
  3. Literature Review Summary
     - Key theories and concepts
     - Major findings and debates
     - Identified gaps
  4. Proposed Research Project
     - Research questions and hypotheses
     - Theoretical framework
     - Methodology (including alternative approaches)
     - Expected contributions
  5. Discussion and Implications
  6. References (if applicable)
- Use formal academic language and proper citations where appropriate.
- Ensure logical flow between sections and clear connections between critique and proposal.

Topic: {topic}
Initial Research Summary:
---
{researchSummary}
---
Original Analysis:
---
{generatedAnalysis}
---
Critique:
---
{critique}
---
Proposed Research Project:
---
{proposal}
---
Novelty Assessment:
---
{noveltyAssessment}
---
User Feedback for this Revision: {feedback}
File Contents:
---
{fileContents}
---`
    },
    modelProvider: ModelProvider.GEMINI,
    localLlmUrl: 'http://localhost:11434/v1/chat/completions',
    enableWebSearch: true,
    enableLocalSearch: true,
    theme: 'light',
    maxIterations: 3,
    tags: ['academic', 'literature', 'systematic', 'citations'],
    author: 'Built-in',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    usageCount: 245,
    isBuiltIn: true
  },
  {
    id: 'technical-review',
    name: 'Technical Review',
    description: 'Technical analysis with code and implementation focus',
    category: TEMPLATE_CATEGORIES.TECHNICAL,
    icon: '⚙️',
    version: '1.8',
    agentPrompts: {
      Researcher: `You are a Technical Research Agent. Your goal is to conduct a focused technical literature review on the user-provided topic.
- Use your internal knowledge and any provided tool search results to gather information.
- Identify the key technical concepts, implementations, and best practices related to the topic.
- Focus on practical applications, code examples, and technical specifications.
- The output should be a concise summary that will serve as the foundation for technical analysis.

Topic: {topic}

{tool_results}`,
      Generator: `You are a Technical Analyst Agent. Your task is to generate a comprehensive technical analysis of the given topic.
- Base your analysis on the provided research summary and technical documentation.
- Incorporate the context from the provided file contents, focusing on technical details.
- If feedback is provided from a previous iteration, use it to guide and refine your analysis.
- The analysis should be well-structured, technically accurate, and implementation-focused.
- Include code examples, technical specifications, and practical considerations.

Topic: {topic}
Research Summary:
---
{researchSummary}
---
File Names Provided: {fileNames}
File Contents:
---
{fileContents}
---
Feedback from previous iteration: {feedback}`,
      Evaluator: `You are a Technical Evaluator Agent. Your role is to scrutinize the provided technical analysis.
- Identify potential technical flaws, implementation issues, or architectural problems.
- Consider scalability, security, performance, and maintainability aspects.
- Do NOT propose solutions or alternatives. Your focus is solely on technical critique.
- The critique should be constructive, specific, and help identify areas for technical improvement.

Topic: {topic}
Generated Analysis to Critique:
---
{generatedAnalysis}
---`,
      Proposer: `You are a Technical Solution Proposer Agent. Based on the technical analysis and critique, your job is to propose a technical solution or improvement.
- Analyze the technical findings and critique to identify technical gaps or improvement opportunities.
- Propose a technical solution that addresses these issues or builds upon current approaches.
- Your proposal should include:
  1. Solution Overview
  2. Technical Requirements and Specifications
  3. Implementation Approach
  4. Architecture Design
  5. Performance and Scalability Considerations
- The proposal should be technically sound, implementable, and innovative.

Research Summary:
---
{researchSummary}
---
Original Analysis:
---
{generatedAnalysis}
---
Critique:
---
{critique}
---`,
      NoveltyChecker: `You are a Technical Novelty Assessment Agent. Your role is to evaluate the technical novelty of the proposed solution.
- Extract the key technical innovations, methods, and implementations from the proposal
- Use the provided search results to check if similar technical approaches already exist
- Assess the technical novelty level and provide a confidence score (1-10, where 10 is highly novel)
- If similar work is found, identify the technical differences and suggest modifications
- If the proposal appears novel, explain why it's technically innovative

Proposed Technical Solution:
---
{proposal}
---

Search Results for Technical Novelty Check:
---
{tool_results}
---`,
      Aggregator: `You are a Technical Documentation Synthesizer Agent. Your final task is to create comprehensive technical documentation.
- Synthesize all provided inputs: technical research, analysis, critique, and proposed solution.
- Format the final report as a structured technical document:
  1. Project Overview
  2. Technical Background and Context
  3. Technical Analysis Summary
     - Key technical findings
     - Implementation considerations
     - Technical gaps identified
  4. Proposed Technical Solution
     - Architecture and design
     - Implementation details
     - Performance characteristics
  5. Technical Assessment and Recommendations
  6. Implementation Roadmap
- Use precise technical language and include relevant specifications.
- Ensure logical flow between sections and clear technical connections.

Topic: {topic}
Technical Research Summary:
---
{researchSummary}
---
Technical Analysis:
---
{generatedAnalysis}
---
Technical Critique:
---
{critique}
---
Proposed Technical Solution:
---
{proposal}
---
Technical Novelty Assessment:
---
{noveltyAssessment}
---
User Feedback for this Revision: {feedback}
File Contents:
---
{fileContents}
---`
    },
    modelProvider: ModelProvider.GEMINI,
    localLlmUrl: 'http://localhost:11434/v1/chat/completions',
    enableWebSearch: true,
    enableLocalSearch: true,
    theme: 'light',
    maxIterations: 2,
    tags: ['technical', 'code', 'implementation', 'architecture'],
    author: 'Built-in',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    usageCount: 189,
    isBuiltIn: true
  }
];

export const useWorkflowTemplates = () => {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load templates from localStorage
  useEffect(() => {
    const loadTemplates = () => {
      try {
        const savedTemplates = localStorage.getItem('userWorkflowTemplates');
        const userTemplates: WorkflowTemplate[] = savedTemplates ? JSON.parse(savedTemplates) : [];

        // Combine built-in and user templates
        setTemplates([...BUILT_IN_TEMPLATES, ...userTemplates]);
      } catch (error) {
        console.error('Error loading templates:', error);
        setTemplates(BUILT_IN_TEMPLATES);
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplates();
  }, []);

  // Save templates to localStorage
  const saveTemplates = useCallback((newTemplates: WorkflowTemplate[]) => {
    try {
      const userTemplates = newTemplates.filter(t => !t.isBuiltIn);
      localStorage.setItem('userWorkflowTemplates', JSON.stringify(userTemplates));
      setTemplates(newTemplates);
    } catch (error) {
      console.error('Error saving templates:', error);
    }
  }, []);

  // Create a new template from current workflow state
  const createTemplate = useCallback((
    name: string,
    description: string,
    category: WorkflowTemplate['category'],
    currentState: {
      agentPrompts: AgentPrompts;
      modelProvider: ModelProvider;
      localLlmUrl: string;
      enableWebSearch: boolean;
      enableLocalSearch: boolean;
      theme: 'light' | 'dark';
      iteration: number;
      completedSteps?: any[];
    }
  ): string => {
    const newTemplate: WorkflowTemplate = {
      id: `custom-${Date.now()}`,
      name,
      description,
      category,
      icon: '📝',
      version: '1.0',
      agentPrompts: currentState.agentPrompts,
      modelProvider: currentState.modelProvider,
      localLlmUrl: currentState.localLlmUrl,
      enableWebSearch: currentState.enableWebSearch,
      enableLocalSearch: currentState.enableLocalSearch,
      theme: currentState.theme,
      maxIterations: currentState.iteration,
      completedSteps: currentState.completedSteps,
      iteration: currentState.iteration,
      tags: [category.toLowerCase(), 'custom'],
      author: 'User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      isBuiltIn: false
    };

    const updatedTemplates = [...templates, newTemplate];
    saveTemplates(updatedTemplates);

    return newTemplate.id;
  }, [templates, saveTemplates]);

  // Update template usage count
  const trackUsage = useCallback((templateId: string) => {
    const updatedTemplates = templates.map(template =>
      template.id === templateId
        ? { ...template, usageCount: template.usageCount + 1, updatedAt: new Date().toISOString() }
        : template
    );
    saveTemplates(updatedTemplates);
  }, [templates, saveTemplates]);

  // Delete a template
  const deleteTemplate = useCallback((templateId: string) => {
    const updatedTemplates = templates.filter(template => template.id !== templateId);
    saveTemplates(updatedTemplates);
  }, [templates, saveTemplates]);

  // Update a template
  const updateTemplate = useCallback((templateId: string, updates: Partial<WorkflowTemplate>) => {
    const updatedTemplates = templates.map(template =>
      template.id === templateId
        ? { ...template, ...updates, updatedAt: new Date().toISOString() }
        : template
    );
    saveTemplates(updatedTemplates);
  }, [templates, saveTemplates]);

  // Search templates
  const searchTemplates = useCallback((query: string): WorkflowTemplate[] => {
    if (!query.trim()) return templates;

    const searchTerm = query.toLowerCase();
    return templates.filter(template =>
      template.name.toLowerCase().includes(searchTerm) ||
      template.description.toLowerCase().includes(searchTerm) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      template.category.toLowerCase().includes(searchTerm)
    );
  }, [templates]);

  // Get templates by category
  const getTemplatesByCategory = useCallback((category: WorkflowTemplate['category']): WorkflowTemplate[] => {
    return templates.filter(template => template.category === category);
  }, [templates]);

  // Get popular templates
  const getPopularTemplates = useCallback((): WorkflowTemplate[] => {
    return [...templates].sort((a, b) => b.usageCount - a.usageCount).slice(0, 5);
  }, [templates]);

  return {
    templates,
    isLoading,
    createTemplate,
    trackUsage,
    deleteTemplate,
    updateTemplate,
    searchTemplates,
    getTemplatesByCategory,
    getPopularTemplates
  };
};

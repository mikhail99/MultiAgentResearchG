/**
 * A-Mem (Agentic Memory) Service
 *
 * Implements the three core components of A-Mem:
 * 1. Note Construction - Creates structured memory notes from agent outputs
 * 2. Link Generation - Establishes connections between related memories
 * 3. Memory Evolution - Updates existing memories based on new experiences
 *
 * Based on the A-Mem paper: https://arxiv.org/html/2502.12110v10
 */

import { WorkflowState, MemoryNote, MemoryLink, MemoryEvolutionAction } from '../types/workflow_LG';
import { AgentName, ModelProvider } from '../types';
import { generateContentStream } from './geminiService';

// Note Construction Prompt Template (based on A-Mem paper)
const NOTE_CONSTRUCTION_PROMPT = `Generate a structured analysis of the following agent output by:
1. Identifying the most salient keywords (focus on nouns, verbs, and key concepts)
2. Extracting core themes and contextual elements
3. Creating relevant categorical tags

Format the response as a JSON object:

{
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "context": "One sentence summarizing the main topic, key arguments, and purpose",
  "tags": ["tag1", "tag2", "tag3"]
}

Agent: {agent_name}
Topic: {topic}
Iteration: {iteration}
Content: {content}`;

// Link Generation Prompt Template (based on A-Mem paper)
const LINK_GENERATION_PROMPT = `You are an AI memory evolution agent. Analyze the new memory note and find connections with existing memories.

New Memory Note:
- Content: {new_content}
- Context: {new_context}
- Keywords: {new_keywords}
- Tags: {new_tags}

Existing Memory Notes:
{existing_notes}

Determine meaningful connections and return a JSON array of link objects:
[
  {
    "targetNoteId": "existing_memory_id",
    "strength": 0.0-1.0,
    "relationship": "similar" | "related" | "follows" | "contradicts" | "supports"
  }
]

Only include connections with strength > 0.3. Return empty array if no meaningful connections found.`;

// Memory Evolution Prompt Template (based on A-Mem paper)
const MEMORY_EVOLUTION_PROMPT = `You are an AI memory evolution agent. Analyze how new memories should update existing ones.

New Memory Note:
- Content: {new_content}
- Context: {new_context}
- Keywords: {new_keywords}
- Tags: {new_tags}

Connected Existing Memory Notes:
{connected_notes}

Determine evolution actions and return a JSON array of actions:
[
  {
    "action": "strengthen" | "update_context" | "update_tags" | "merge" | "prune",
    "targetNoteId": "memory_id",
    "newContext": "updated context if applicable",
    "newTags": ["new", "tags", "if", "applicable"],
    "mergeWithNoteId": "target_id_if_merging",
    "strengthDelta": 0.1
  }
]

Focus on actions that improve memory quality and connectivity.`;

export class AMemService {
  private static instance: AMemService;

  public static getInstance(): AMemService {
    if (!AMemService.instance) {
      AMemService.instance = new AMemService();
    }
    return AMemService.instance;
  }

  /**
   * Note Construction - Creates a structured memory note from agent output
   */
  async constructNote(
    agentName: AgentName,
    content: string,
    topic: string,
    iteration: number,
    modelProvider: ModelProvider = ModelProvider.LOCAL
  ): Promise<MemoryNote> {
    try {
      console.log(`📝 Constructing memory note for ${agentName}...`);

      const prompt = NOTE_CONSTRUCTION_PROMPT
        .replace('{agent_name}', agentName)
        .replace('{topic}', topic)
        .replace('{iteration}', iteration.toString())
        .replace('{content}', content);

      let responseBuffer = '';
      await generateContentStream(
        AgentName.SEARCH,
        prompt,
        { provider: modelProvider, url: 'http://localhost:11434/v1/chat/completions' },
        (chunk) => {
          responseBuffer += chunk;
        }
      );

      // Parse the JSON response
      const parsedResponse = this.parseNoteConstructionResponse(responseBuffer);

      const noteId = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      const memoryNote: MemoryNote = {
        id: noteId,
        content,
        context: parsedResponse.context,
        keywords: parsedResponse.keywords,
        tags: parsedResponse.tags,
        createdAt: now,
        updatedAt: now,
        agentName,
        iteration,
        links: [],
        metadata: {
          topic,
          constructionPrompt: prompt,
          modelProvider
        }
      };

      console.log(`✅ Memory note constructed: ${noteId}`);
      return memoryNote;

    } catch (error) {
      console.error('❌ Failed to construct memory note:', error);

      // Fallback note construction
      return this.createFallbackNote(agentName, content, topic, iteration);
    }
  }

  /**
   * Link Generation - Finds connections between new memory and existing memories
   */
  async generateLinks(
    newNote: MemoryNote,
    existingNotes: MemoryNote[],
    modelProvider: ModelProvider = ModelProvider.LOCAL
  ): Promise<MemoryLink[]> {
    // Ensure existingNotes is an array
    const safeExistingNotes = Array.isArray(existingNotes) ? existingNotes : [];

    console.log('🔗 Generate Links Debug:', {
      newNoteId: newNote.id,
      newNoteAgent: newNote.agentName,
      existingNotesCount: safeExistingNotes.length,
      existingNotesAgents: safeExistingNotes.map(n => n.agentName)
    });

    if (safeExistingNotes.length === 0) {
      console.log('ℹ️ No existing notes to link with');
      return [];
    }

    try {
      console.log(`🔗 Generating links for memory note ${newNote.id}...`);

      // Prepare existing notes for the prompt
      const existingNotesText = safeExistingNotes.map(note =>
        `- ID: ${note.id}\n  Content: ${note.content.substring(0, 200)}...\n  Keywords: ${note.keywords.join(', ')}\n  Tags: ${note.tags.join(', ')}\n  Context: ${note.context}`
      ).join('\n\n');

      const prompt = LINK_GENERATION_PROMPT
        .replace('{new_content}', newNote.content)
        .replace('{new_context}', newNote.context)
        .replace('{new_keywords}', newNote.keywords.join(', '))
        .replace('{new_tags}', newNote.tags.join(', '))
        .replace('{existing_notes}', existingNotesText);

      let responseBuffer = '';
      await generateContentStream(
        AgentName.SEARCH,
        prompt,
        { provider: modelProvider, url: 'http://localhost:11434/v1/chat/completions' },
        (chunk) => {
          responseBuffer += chunk;
        }
      );

      const linkData = this.parseLinkGenerationResponse(responseBuffer);

      const links: MemoryLink[] = linkData.map(link => ({
        id: `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sourceNoteId: newNote.id,
        targetNoteId: link.targetNoteId,
        strength: link.strength,
        relationship: link.relationship as 'similar' | 'related' | 'follows' | 'contradicts' | 'supports',
        createdAt: new Date().toISOString()
      }));

      console.log(`✅ Generated ${links.length} memory links`);
      return links;

    } catch (error) {
      console.error('❌ Failed to generate memory links:', error);
      return [];
    }
  }

  /**
   * Memory Evolution - Updates existing memories based on new experiences
   */
  async evolveMemories(
    newNote: MemoryNote,
    connectedNotes: MemoryNote[],
    modelProvider: ModelProvider = ModelProvider.LOCAL
  ): Promise<MemoryEvolutionAction[]> {
    if (connectedNotes.length === 0) {
      console.log('ℹ️ No connected notes to evolve');
      return [];
    }

    try {
      console.log(`🔄 Evolving ${connectedNotes.length} memory notes...`);

      // Prepare connected notes for the prompt
      const connectedNotesText = connectedNotes.map(note =>
        `- ID: ${note.id}\n  Content: ${note.content.substring(0, 300)}...\n  Keywords: ${note.keywords.join(', ')}\n  Tags: ${note.tags.join(', ')}\n  Context: ${note.context}`
      ).join('\n\n');

      const prompt = MEMORY_EVOLUTION_PROMPT
        .replace('{new_content}', newNote.content)
        .replace('{new_context}', newNote.context)
        .replace('{new_keywords}', newNote.keywords.join(', '))
        .replace('{new_tags}', newNote.tags.join(', '))
        .replace('{connected_notes}', connectedNotesText);

      let responseBuffer = '';
      await generateContentStream(
        AgentName.SEARCH,
        prompt,
        { provider: modelProvider, url: 'http://localhost:11434/v1/chat/completions' },
        (chunk) => {
          responseBuffer += chunk;
        }
      );

      const evolutionActions = this.parseMemoryEvolutionResponse(responseBuffer);

      console.log(`✅ Generated ${evolutionActions.length} memory evolution actions`);
      return evolutionActions;

    } catch (error) {
      console.error('❌ Failed to evolve memories:', error);
      return [];
    }
  }

  /**
   * Apply memory evolution actions to the workflow state
   */
  applyEvolutionActions(
    state: WorkflowState,
    actions: MemoryEvolutionAction[]
  ): WorkflowState {
    const updatedNotes = [...(state.memoryNotes || [])];
    const updatedLinks = [...(state.memoryLinks || [])];
    const updatedEvolutionQueue = [...(state.memoryEvolutionQueue || [])];

    actions.forEach(action => {
      const noteIndex = updatedNotes.findIndex(note => note.id === action.targetNoteId);

      if (noteIndex === -1) {
        console.warn(`⚠️ Target note ${action.targetNoteId} not found for evolution action`);
        return;
      }

      const note = updatedNotes[noteIndex];

      switch (action.action) {
        case 'strengthen':
          // Strengthen existing links to this note
          const relevantLinks = updatedLinks.filter(link =>
            link.sourceNoteId === action.targetNoteId || link.targetNoteId === action.targetNoteId
          );
          relevantLinks.forEach(link => {
            link.strength = Math.min(1.0, link.strength + (action.strengthDelta || 0.1));
          });
          break;

        case 'update_context':
          if (action.newContext) {
            note.context = action.newContext;
            note.updatedAt = new Date().toISOString();
          }
          break;

        case 'update_tags':
          if (action.newTags) {
            note.tags = action.newTags;
            note.updatedAt = new Date().toISOString();
          }
          break;

        case 'merge':
          if (action.mergeWithNoteId) {
            const mergeTargetIndex = updatedNotes.findIndex(note => note.id === action.mergeWithNoteId);
            if (mergeTargetIndex !== -1) {
              const mergeTarget = updatedNotes[mergeTargetIndex];

              // Merge content and keywords
              mergeTarget.content += '\n\n[MERGED FROM: ' + note.id + ']\n' + note.content;
              mergeTarget.keywords = [...new Set([...mergeTarget.keywords, ...note.keywords])];
              mergeTarget.tags = [...new Set([...mergeTarget.tags, ...note.tags])];
              mergeTarget.updatedAt = new Date().toISOString();

              // Remove the merged note
              updatedNotes.splice(noteIndex, 1);

              // Update links
              updatedLinks.forEach(link => {
                if (link.sourceNoteId === note.id) link.sourceNoteId = mergeTarget.id;
                if (link.targetNoteId === note.id) link.targetNoteId = mergeTarget.id;
              });
            }
          }
          break;

        case 'prune':
          // Remove the note and its links
          updatedNotes.splice(noteIndex, 1);
          const linksToRemove = updatedLinks.filter(link =>
            link.sourceNoteId === action.targetNoteId || link.targetNoteId === action.targetNoteId
          );
          linksToRemove.forEach(link => {
            const linkIndex = updatedLinks.indexOf(link);
            if (linkIndex !== -1) updatedLinks.splice(linkIndex, 1);
          });
          break;
      }
    });

    return {
      ...state,
      memoryNotes: updatedNotes,
      memoryLinks: updatedLinks,
      memoryEvolutionQueue: updatedEvolutionQueue,
      memoryStats: {
        ...(state.memoryStats || {
          totalNotes: 0,
          totalLinks: 0,
          lastEvolution: new Date().toISOString(),
          memoryQuality: 0,
        }),
        totalNotes: updatedNotes.length,
        totalLinks: updatedLinks.length,
        lastEvolution: new Date().toISOString(),
        memoryQuality: this.calculateMemoryQuality(updatedNotes, updatedLinks)
      }
    };
  }

  /**
   * Calculate memory quality score based on connectivity and relevance
   */
  private calculateMemoryQuality(notes: MemoryNote[], links: MemoryLink[]): number {
    if (notes.length === 0) return 0;

    // Calculate connectivity score (notes with links vs total notes)
    const connectedNotes = new Set<string>();
    links.forEach(link => {
      connectedNotes.add(link.sourceNoteId);
      connectedNotes.add(link.targetNoteId);
    });
    const connectivityScore = connectedNotes.size / notes.length;

    // Calculate average link strength
    const avgStrength = links.length > 0
      ? links.reduce((sum, link) => sum + link.strength, 0) / links.length
      : 0;

    // Calculate diversity score (unique keywords vs total keywords)
    const allKeywords = notes.flatMap(note => note.keywords);
    const uniqueKeywords = new Set(allKeywords);
    const diversityScore = uniqueKeywords.size / allKeywords.length;

    // Combine scores with weights
    return (connectivityScore * 0.4) + (avgStrength * 0.4) + (diversityScore * 0.2);
  }

  /**
   * Parse JSON response from note construction
   */
  private parseNoteConstructionResponse(response: string): {
    keywords: string[];
    context: string;
    tags: string[];
  } {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        context: typeof parsed.context === 'string' ? parsed.context : '',
        tags: Array.isArray(parsed.tags) ? parsed.tags : []
      };
    } catch (error) {
      console.error('❌ Failed to parse note construction response:', error);
      // Return fallback values
      return {
        keywords: [],
        context: 'Failed to extract context',
        tags: []
      };
    }
  }

  /**
   * Parse JSON response from link generation
   */
  private parseLinkGenerationResponse(response: string): Array<{
    targetNoteId: string;
    strength: number;
    relationship: string;
  }> {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('❌ Failed to parse link generation response:', error);
      return [];
    }
  }

  /**
   * Parse JSON response from memory evolution
   */
  private parseMemoryEvolutionResponse(response: string): MemoryEvolutionAction[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('❌ Failed to parse memory evolution response:', error);
      return [];
    }
  }

  /**
   * Create a fallback memory note when construction fails
   */
  private createFallbackNote(
    agentName: AgentName,
    content: string,
    topic: string,
    iteration: number
  ): MemoryNote {
    const noteId = `mem_fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    return {
      id: noteId,
      content,
      context: `Agent ${agentName} output for topic: ${topic} (iteration ${iteration})`,
      keywords: [agentName, topic, 'research'],
      tags: [agentName, 'fallback', 'research'],
      createdAt: now,
      updatedAt: now,
      agentName,
      iteration,
      links: [],
      metadata: {
        topic,
        isFallback: true,
        constructionError: 'Failed to parse LLM response'
      }
    };
  }
}

// Export singleton instance
export const amemService = AMemService.getInstance();

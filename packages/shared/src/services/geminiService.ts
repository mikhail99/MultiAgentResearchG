import { AgentName, StylizedFact, LlmOptions, ModelProvider } from '../types';

export const generateContentStream = async (
  agentName: AgentName,
  fullPrompt: string,
  options: LlmOptions,
  onChunk: (chunk: string) => void
): Promise<string> => {
  if (!options.url) throw new Error("Local LLM URL is not provided.");

  let accumulatedText = "";

  try {
    const response = await fetch(options.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model || 'qwen3:4b',
        messages: [{ role: 'user', content: fullPrompt }],
        temperature: options.temperature || 0.5,
        stream: true, // Enable streaming
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Local LLM API request failed with status ${response.status}: ${errorBody}`);
    }

    if (!response.body) {
      throw new Error('Response body is null.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process line by line
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the last, possibly incomplete line

      for (const line of lines) {
          if (line.startsWith('data: ')) {
              const data = line.substring(6);
              if (data.trim() === '[DONE]') {
                  break;
              }
              try {
                  const parsed = JSON.parse(data);
                  const chunkText = parsed.choices?.[0]?.delta?.content;
                  if (chunkText) {
                      onChunk(chunkText);
                      accumulatedText += chunkText;
                  }
              } catch (e) {
                  // Ignore parsing errors for incomplete JSON
              }
          }
      }
    }

  } catch (e) {
    console.error("Local LLM stream error:", e);
    throw new Error(`Failed to stream from local LLM at ${options.url}. Is the server running and CORS configured correctly?`);
  }

  return accumulatedText;
};

export const generateContent = async (agentName: AgentName, fullPrompt: string, options: LlmOptions): Promise<string> => {
  if (!options.url) throw new Error("Local LLM URL is not provided.");

  try {
    const response = await fetch(options.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model || 'qwen3:4b',
        messages: [{ role: 'user', content: fullPrompt }],
        temperature: options.temperature || 0.5,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Local LLM API request failed with status ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response structure from local LLM.');
    }

    return data.choices[0].message.content;
  } catch (e) {
    console.error("Local LLM request error:", e);
    throw new Error(`Failed to communicate with the local LLM at ${options.url}. Is the server running and CORS configured correctly?`);
  }
};

export const improvePrompt = async (promptToImprove: string, taskDescription: string, improvementInstruction: string, options: LlmOptions): Promise<string> => {
    const userInstruction = improvementInstruction.trim() 
        ? `The user has provided the following specific instruction for improvement: "${improvementInstruction}". You must incorporate this instruction into your rewrite.`
        : `Rewrite the prompt to be clearer, more effective, and more robust.`;

    const metaPrompt = `
      You are a world-class prompt engineer. Your task is to improve the following user-provided prompt.
      The prompt is for an LLM agent whose goal is: "${taskDescription}".

      ${userInstruction}
      
      Ensure the new prompt is well-structured and guides the LLM to produce a high-quality output that aligns with its goal.
      Return only the improved prompt, without any additional commentary or explanation.

      Original Prompt to Improve:
      ---
      ${promptToImprove}
      ---
    `;

    // We can just reuse generateContent for this meta-task. We'll pass a dummy agent name.
    return generateContent(AgentName.LEARNINGS, metaPrompt, options);
};


export const generateFacts = async (finalReport: string, options: LlmOptions): Promise<StylizedFact[]> => {
  if (!options.url) throw new Error("Local LLM URL is not provided.");

  const prompt = `
    Based on the following final report, extract 5 to 7 key "stylized facts".
    A stylized fact is a broad generalization or an empirical pattern that is widely accepted or representative of the core findings.
    Return a JSON object with a single key "facts". The value of "facts" should be an array of objects, where each object has a "fact" (string) and a "description" (string).
    Final Report:
    ---
    ${finalReport}
    ---
    IMPORTANT: You must respond with only a single JSON object, and nothing else. Do not include any text before or after the JSON.
  `;

  try {
    const response = await fetch(options.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model || 'qwen3:4b',
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature || 0.5,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Local LLM API request failed with status ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response structure from local LLM.');
    }

    const resultText = data.choices[0].message.content;
    const jsonStr = resultText.substring(resultText.indexOf('{'), resultText.lastIndexOf('}') + 1);
    const parsed = JSON.parse(jsonStr);

    return Array.isArray(parsed.facts) ? parsed.facts : [];
  } catch (e) {
    console.error("Failed to parse structured JSON from Local LLM for facts:", e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to communicate with the local LLM at ${options.url}. Is the server running and CORS configured correctly? Details: ${errorMessage}`);
  }
};

export const generateQuestions = async (finalReport: string, options: LlmOptions): Promise<string[]> => {
  if (!options.url) throw new Error("Local LLM URL is not provided.");

  const prompt = `
    Based on the following final report, generate 5 insightful and thought-provoking "stylized questions".
    These questions should stimulate further research, challenge assumptions, or explore the boundaries of the topic.
    Return a JSON object with a single key "questions", which is an array of strings.
    Final Report:
    ---
    ${finalReport}
    ---
    IMPORTANT: You must respond with only a single JSON object, and nothing else. Do not include any text before or after the JSON.
  `;

  try {
    const response = await fetch(options.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model || 'qwen3:4b',
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature || 0.5,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Local LLM API request failed with status ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response structure from local LLM.');
    }

    const resultText = data.choices[0].message.content;
    const jsonStr = resultText.substring(resultText.indexOf('{'), resultText.lastIndexOf('}') + 1);
    const parsed = JSON.parse(jsonStr);

    return Array.isArray(parsed.questions) ? parsed.questions : [];
  } catch (e) {
    console.error("Failed to parse structured JSON from Local LLM for questions:", e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to communicate with the local LLM at ${options.url}. Is the server running and CORS configured correctly? Details: ${errorMessage}`);
  }
};
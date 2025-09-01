import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateContentStream,
  generateContent,
  generateFacts,
  generateQuestions,
  improvePrompt
} from '../services/geminiService';
import type { LlmOptions } from '../types';
import { ModelProvider } from '../types';

describe('LLM Service (Local Integration)', () => {
  let mockFetch: vi.MockedFunction<typeof fetch>;
  let mockLlmOptions: LlmOptions;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = global.fetch as vi.MockedFunction<typeof fetch>;

    mockLlmOptions = {
      provider: ModelProvider.LOCAL,
      url: 'http://localhost:11434/v1/chat/completions'
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateContentStream', () => {
    it('should successfully stream content from local LLM', async () => {
      const mockResponse = {
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ value: new TextEncoder().encode('{"choices":[{"delta":{"content":"Hello"}}]}'), done: false })
              .mockResolvedValueOnce({ value: new TextEncoder().encode('{"choices":[{"delta":{"content":" world"}}]}'), done: false })
              .mockResolvedValueOnce({ value: new TextEncoder().encode('{"choices":[{"delta":{"content":"!"}}]}'), done: false })
              .mockResolvedValueOnce({ done: true })
          })
        }
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const chunks: string[] = [];
      const onChunk = (chunk: string) => chunks.push(chunk);

      const result = await generateContentStream(
        'Search' as any,
        'Test prompt',
        mockLlmOptions,
        onChunk
      );

      expect(mockFetch).toHaveBeenCalledWith(mockLlmOptions.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen3:4b',
          messages: [{ role: 'user', content: 'Test prompt' }],
          temperature: 0.5,
          stream: true
        })
      });

      expect(result).toBe('Hello world!');
      expect(chunks).toEqual(['Hello', ' world', '!']);
    });

    it('should handle streaming errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const onChunk = vi.fn();

      await expect(generateContentStream(
        'Search' as any,
        'Test prompt',
        mockLlmOptions,
        onChunk
      )).rejects.toThrow('Network error');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(onChunk).not.toHaveBeenCalled();
    });

    it('should throw error when URL is not provided', async () => {
      const optionsWithoutUrl = { ...mockLlmOptions, url: undefined };

      await expect(generateContentStream(
        'Search' as any,
        'Test prompt',
        optionsWithoutUrl as any,
        vi.fn()
      )).rejects.toThrow('Local LLM URL is not provided.');
    });

    it('should handle malformed streaming response', async () => {
      const mockResponse = {
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ value: new TextEncoder().encode('invalid json'), done: false })
              .mockResolvedValueOnce({ done: true })
          })
        }
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const onChunk = vi.fn();

      // Should handle the error gracefully without throwing
      const result = await generateContentStream(
        'Search' as any,
        'Test prompt',
        mockLlmOptions,
        onChunk
      );

      expect(result).toBe('');
    });
  });

  describe('generateContent', () => {
    it('should generate content successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Generated content from LLM'
            }
          }]
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await generateContent(
        'Search' as any,
        'Test prompt',
        mockLlmOptions
      );

      expect(result).toBe('Generated content from LLM');
      expect(mockFetch).toHaveBeenCalledWith(mockLlmOptions.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen3:4b',
          messages: [{ role: 'user', content: 'Test prompt' }],
          temperature: 0.5,
          stream: false
        })
      });
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Internal Server Error'
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      await expect(generateContent(
        'Search' as any,
        'Test prompt',
        mockLlmOptions
      )).rejects.toThrow('Internal Server Error');
    });

    it('should use custom model and temperature', async () => {
      const customOptions = {
        ...mockLlmOptions,
        model: 'custom-model',
        temperature: 0.8
      };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Response from custom model'
            }
          }]
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      await generateContent('Search' as any, 'Test prompt', customOptions);

      expect(mockFetch).toHaveBeenCalledWith(mockLlmOptions.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'custom-model',
          messages: [{ role: 'user', content: 'Test prompt' }],
          temperature: 0.8,
          stream: false
        })
      });
    });
  });

  describe('generateFacts', () => {
    it('should generate stylized facts from report', async () => {
      const mockReport = 'Machine learning is a powerful technology that can solve complex problems.';

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify([
                {
                  fact: 'Machine learning solves complex problems',
                  description: 'ML is powerful technology'
                }
              ])
            }
          }]
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await generateFacts(mockReport, mockLlmOptions);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        fact: 'Machine learning solves complex problems',
        description: 'ML is powerful technology'
      });
    });

    it('should handle malformed fact response', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'invalid json response'
            }
          }]
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await generateFacts('Test report', mockLlmOptions);

      expect(result).toEqual([]);
    });

    it('should handle empty fact generation', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: '[]'
            }
          }]
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await generateFacts('Test report', mockLlmOptions);

      expect(result).toEqual([]);
    });
  });

  describe('generateQuestions', () => {
    it('should generate research questions from report', async () => {
      const mockReport = 'This paper discusses machine learning applications in healthcare.';

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify([
                'How can ML improve healthcare outcomes?',
                'What are the ethical considerations?',
                'How to ensure data privacy?'
              ])
            }
          }]
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await generateQuestions(mockReport, mockLlmOptions);

      expect(result).toHaveLength(3);
      expect(result).toEqual([
        'How can ML improve healthcare outcomes?',
        'What are the ethical considerations?',
        'How to ensure data privacy?'
      ]);
    });

    it('should handle malformed question response', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'invalid json response'
            }
          }]
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await generateQuestions('Test report', mockLlmOptions);

      expect(result).toEqual([]);
    });

    it('should handle non-array question response', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: '"single question string"'
            }
          }]
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await generateQuestions('Test report', mockLlmOptions);

      expect(result).toEqual([]);
    });
  });

  describe('improvePrompt', () => {
    it('should improve prompt successfully', async () => {
      const mockPrompt = 'bad prompt';
      const taskDescription = 'Write a summary';
      const improvementInstruction = 'Make it clearer';

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Improved and clearer prompt'
            }
          }]
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await improvePrompt(
        mockPrompt,
        taskDescription,
        improvementInstruction,
        mockLlmOptions
      );

      expect(result).toBe('Improved and clearer prompt');
    });

    it('should construct proper improvement prompt', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Improved prompt'
            }
          }]
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      await improvePrompt('bad prompt', 'task desc', 'improve', mockLlmOptions);

      const expectedBody = JSON.stringify({
        model: 'qwen3:4b',
        messages: [{
          role: 'user',
          content: expect.stringContaining('You are a world-class prompt engineer')
        }],
        temperature: 0.5,
        stream: false
      });

      expect(mockFetch).toHaveBeenCalledWith(
        mockLlmOptions.url,
        expect.objectContaining({
          body: expectedBody
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts', async () => {
      mockFetch.mockImplementation(() => new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 100)
      ));

      await expect(generateContent(
        'Search' as any,
        'Test prompt',
        mockLlmOptions
      )).rejects.toThrow();
    });

    it('should handle malformed JSON responses', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: undefined // Invalid content
            }
          }]
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      await expect(generateContent(
        'Search' as any,
        'Test prompt',
        mockLlmOptions
      )).rejects.toThrow();
    });

    it('should handle missing choices in response', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({})
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      await expect(generateContent(
        'Search' as any,
        'Test prompt',
        mockLlmOptions
      )).rejects.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should use default model when not specified', async () => {
      const optionsWithoutModel = { ...mockLlmOptions, model: undefined };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Default model response'
            }
          }]
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      await generateContent('Search' as any, 'Test prompt', optionsWithoutModel as any);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(requestBody.model).toBe('qwen3:4b');
    });

    it('should use default temperature when not specified', async () => {
      const optionsWithoutTemp = { ...mockLlmOptions, temperature: undefined };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Default temp response'
            }
          }]
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      await generateContent('Search' as any, 'Test prompt', optionsWithoutTemp as any);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(requestBody.temperature).toBe(0.5);
    });
  });
});

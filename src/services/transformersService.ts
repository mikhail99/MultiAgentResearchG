import { AgentName, LlmOptions } from '../types';

// Define proper types for pipeline results
interface TextGenerationResult {
  generated_text: string;
}

class TransformersService {
  private worker: Worker | null = null;
  private isWorkerReady = false;
  private pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map();
  private requestId = 0;

  constructor() {
    this.initializeWorker();
  }

  private initializeWorker(): void {
    try {
      // Create a worker for handling Transformers.js operations
      this.worker = new Worker(new URL('./transformersWorker.js', import.meta.url), { type: 'module' });
      
      // Listen for messages from the worker
      this.worker.addEventListener('message', (event) => {
        const { type, payload } = event.data;
        
        switch (type) {
          case 'LOADING_COMPLETE':
            this.isWorkerReady = true;
            console.log('✅ Transformers.js worker ready');
            break;
            
          case 'GENERATION_UPDATE':
            // Handle streaming updates - these are sent directly to the callback
            break;
            
          case 'GENERATION_COMPLETE':
            // Handle completion - this would be for non-streaming requests
            break;
            
          case 'ERROR':
            console.error('❌ Transformers.js worker error:', payload.message);
            break;
            
          case 'LOADING_PROGRESS':
            console.log('🔄 Model loading progress:', payload);
            break;
            
          default:
            // Handle request responses
            const requestId = type;
            if (this.pendingRequests.has(requestId)) {
              const { resolve, reject } = this.pendingRequests.get(requestId)!;
              this.pendingRequests.delete(requestId);
              
              if (payload.error) {
                reject(new Error(payload.error));
              } else {
                resolve(payload.result);
              }
            }
        }
      });
      
      // Initialize the worker
      this.worker.postMessage({ type: 'INIT' });
    } catch (error) {
      console.error('❌ Failed to initialize Transformers.js worker:', error);
    }
  }

  async initialize(): Promise<void> {
    // Worker initialization is handled in the constructor
    // We just wait for the worker to be ready
    return new Promise((resolve) => {
      if (this.isWorkerReady) {
        resolve();
        return;
      }
      
      const checkReady = () => {
        if (this.isWorkerReady) {
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      
      checkReady();
    });
  }

  async generateText(prompt: string, options: {
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  } = {}): Promise<string> {
    await this.initialize();

    if (!this.worker) {
      throw new Error('Transformers.js worker not initialized');
    }

    const { temperature = 0.5, maxTokens = 1000 } = options;

    return new Promise((resolve, reject) => {
      const requestId = `request_${++this.requestId}`;
      this.pendingRequests.set(requestId, { resolve, reject });
      
      this.worker!.postMessage({
        type: 'GENERATE',
        payload: {
          prompt,
          options: { temperature, maxTokens }
        }
      });
      
      // Set a timeout for the request
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Transformers.js generation timeout'));
        }
      }, 30000); // 30 second timeout
    });
  }

  async generateTextStream(
    prompt: string,
    onChunk: (chunk: string) => void,
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<string> {
    await this.initialize();

    if (!this.worker) {
      throw new Error('Transformers.js worker not initialized');
    }

    const { temperature = 0.5, maxTokens = 1000 } = options;

    return new Promise((resolve, reject) => {
      let accumulatedText = '';
      
      // Create a temporary handler for streaming updates
      const handleMessage = (event: MessageEvent) => {
        const { type, payload } = event.data;
        
        switch (type) {
          case 'GENERATION_UPDATE':
            onChunk(payload.text);
            accumulatedText += payload.text;
            break;
            
          case 'GENERATION_COMPLETE':
            this.worker!.removeEventListener('message', handleMessage);
            resolve(accumulatedText);
            break;
            
          case 'ERROR':
            this.worker!.removeEventListener('message', handleMessage);
            reject(new Error(payload.message));
            break;
        }
      };
      
      this.worker.addEventListener('message', handleMessage);
      
      // Send the generation request
      this.worker.postMessage({
        type: 'GENERATE',
        payload: {
          prompt,
          options: { temperature, maxTokens },
          stream: true
        }
      });
      
      // Set a timeout for the request
      setTimeout(() => {
        this.worker!.removeEventListener('message', handleMessage);
        reject(new Error('Transformers.js streaming timeout'));
      }, 30000); // 30 second timeout
    });
  }

  async generateStructuredResponse<T>(
    prompt: string,
    schema: any,
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<T> {
    await this.initialize();

    if (!this.worker) {
      throw new Error('Transformers.js worker not initialized');
    }

    const { temperature = 0.5, maxTokens = 1000 } = options;

    // Create a prompt that instructs the model to return JSON
    const jsonPrompt = `${prompt}

IMPORTANT: Respond with ONLY a valid JSON object that conforms to this schema: ${JSON.stringify(schema)}
No additional text, no markdown, no explanations. Just the JSON object.`;

    try {
      const result = await this.generateText(jsonPrompt, { temperature, maxTokens });

      // Enhanced JSON extraction with better error handling
      try {
        // First, try to parse the entire response as JSON
        return JSON.parse(result.trim());
      } catch (parseError) {
        // If that fails, try to extract JSON using a more robust approach
        const jsonMatch = result.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[1]);
        }
        throw new Error('No valid JSON found in response');
      }
    } catch (error) {
      console.error('❌ Transformers.js structured generation error:', error);
      throw new Error(`Transformers.js structured generation failed: ${error}`);
    }
  }

  // Add a cleanup/dispose method to free up resources
  dispose(): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'DISPOSE' });
      this.worker.terminate();
      this.worker = null;
    }
    this.isWorkerReady = false;
    this.pendingRequests.clear();
    console.log('🧹 Transformers.js worker disposed');
  }
}

// Singleton instance
export const transformersService = new TransformersService();
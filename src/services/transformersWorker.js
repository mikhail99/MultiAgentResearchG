import {
  AutoTokenizer,
  AutoModelForCausalLM,
  TextStreamer,
  env
} from '@huggingface/transformers';

// Set environment variables for Transformers.js
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = true;

// Model configuration
const MODEL_ID = 'onnx-community/Qwen3-0.6B-ONNX';
let tokenizer = null;
let model = null;
let isModelLoaded = false;

// Handle messages from the main thread
self.addEventListener('message', async (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'INIT':
      try {
        self.postMessage({ type: 'LOADING_START', payload: { message: 'Initializing model...' } });
        
        // Initialize tokenizer and model
        tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);
        model = await AutoModelForCausalLM.from_pretrained(MODEL_ID, {
          dtype: "q4f16",
          device: "webgpu",
          progress_callback: (progress) => {
            self.postMessage({ type: 'LOADING_PROGRESS', payload: progress });
          }
        });
        
        isModelLoaded = true;
        self.postMessage({ type: 'LOADING_COMPLETE', payload: { message: 'Model loaded successfully' } });
      } catch (error) {
        console.error('Error loading model:', error);
        // Try fallback to CPU
        try {
          self.postMessage({ type: 'LOADING_START', payload: { message: 'Falling back to CPU...' } });
          tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);
          model = await AutoModelForCausalLM.from_pretrained(MODEL_ID, {
            dtype: "q4",
            device: "wasm", // This should be "cpu" instead
            progress_callback: (progress) => {
              self.postMessage({ type: 'LOADING_PROGRESS', payload: progress });
            }
          });
          isModelLoaded = true;
          self.postMessage({ type: 'LOADING_COMPLETE', payload: { message: 'Model loaded successfully (CPU)' } });
        } catch (fallbackError) {
          self.postMessage({ type: 'ERROR', payload: { message: `Failed to load model: ${error.message}`, error: fallbackError.message } });
        }
      }
      break;

    case 'GENERATE':
      if (!isModelLoaded) {
        self.postMessage({ type: 'ERROR', payload: { message: 'Model not loaded' } });
        return;
      }

      try {
        const { prompt, options = {}, stream = false } = payload;
        const { temperature = 0.7, maxTokens = 512 } = options;

        // Format messages for chat template
        const messages = [
          { role: "user", content: prompt }
        ];

        // Apply chat template
        const inputs = tokenizer.apply_chat_template(messages, {
          add_generation_prompt: true,
          return_dict: true,
        });

        if (stream) {
          // Create a streamer for real-time output
          const streamer = new TextStreamer(tokenizer, {
            skip_prompt: true,
            skip_special_tokens: true,
            callback_function: (text) => {
              self.postMessage({ type: 'GENERATION_UPDATE', payload: { text } });
            }
          });

          // Generate text with streaming
          self.postMessage({ type: 'GENERATION_START' });
          
          await model.generate({
            ...inputs,
            max_new_tokens: maxTokens,
            temperature: temperature,
            do_sample: temperature > 0,
            streamer: streamer
          });

          self.postMessage({ type: 'GENERATION_COMPLETE' });
        } else {
          // Generate text without streaming
          self.postMessage({ type: 'GENERATION_START' });
          
          const result = await model.generate({
            ...inputs,
            max_new_tokens: maxTokens,
            temperature: temperature,
            do_sample: temperature > 0
          });

          const decoded = tokenizer.batch_decode(result.sequences, {
            skip_special_tokens: true,
          });

          self.postMessage({ type: 'GENERATION_COMPLETE', payload: { text: decoded[0] } });
        }
      } catch (error) {
        self.postMessage({ type: 'ERROR', payload: { message: `Generation failed: ${error.message}` } });
      }
      break;

    case 'DISPOSE':
      // Clean up resources
      tokenizer = null;
      model = null;
      isModelLoaded = false;
      self.postMessage({ type: 'DISPOSED' });
      break;

    default:
      self.postMessage({ type: 'ERROR', payload: { message: `Unknown message type: ${type}` } });
  }
});
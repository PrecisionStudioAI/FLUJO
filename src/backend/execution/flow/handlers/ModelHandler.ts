import { createLogger } from '@/utils/logger';
import { 
  ModelCallInput, 
  ModelCallResult, 
  ToolCallProcessingInput, 
  ToolCallProcessingResult 
} from '../types/modelHandler';
import { Result, ExecutionError } from '../errors';
import { createModelError, createToolError } from '../errorFactory';
import { 
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionMessageToolCall
} from 'openai/resources/chat/completions/completions';
import OpenAI from 'openai';
import { modelService } from '@/backend/services/model';
import { mcpService } from '@/backend/services/mcp';

const log = createLogger('backend/flow/execution/handlers/ModelHandler');

export class ModelHandler {
  /**
   * Call model with tool support - pure function that doesn't modify inputs
   */
  static async callModel(input: ModelCallInput): Promise<Result<ModelCallResult>> {
    const { modelId, prompt, messages, tools, iteration, maxIterations } = input;
    
    log.info(`callModel - Iteration ${iteration}/${maxIterations}`, {
      modelId,
      messagesCount: messages.length,
      toolsCount: tools?.length || 0
    });
    
    // Add verbose logging of the entire input
    log.verbose('callModel input', JSON.stringify(input));
    
    // Check iteration limit
    if (maxIterations > 0 && iteration > maxIterations) {
      const result: Result<ModelCallResult> = {
        success: true,
        value: {
          content: "Maximum tool call iterations reached. Some tool calls may not have been processed.",
          messages: [...messages]
        }
      };
      
      // Add verbose logging of the result
      log.verbose('callModel max iterations reached result', JSON.stringify(result));
      
      return result;
    }
    
    // Call the model API
    const response = await this.generateCompletion(modelId, prompt, messages, tools);
    
    if (!response.success) {
      // Add verbose logging of the error response
      log.verbose('callModel error response', JSON.stringify(response));
      
      return response;
    }
    
    const modelResponse = response.value;
    const content = modelResponse.content || '';
    const newMessages = [...messages];
    
    // Check for tool calls
    const hasToolCalls = this.hasToolCalls(modelResponse);
    
    if (hasToolCalls && tools && tools.length > 0) {
      // Process tool calls
      const toolCallsResult = await this.processToolCalls({
        toolCalls: modelResponse.fullResponse?.choices?.[0]?.message?.tool_calls || []
      });
      
      if (!toolCallsResult.success) {
        return toolCallsResult;
      }
      
      // Add assistant message with tool calls
      const assistantMessage: ChatCompletionMessageParam = {
        role: 'assistant',
        content,
        tool_calls: modelResponse.fullResponse?.choices?.[0]?.message?.tool_calls
      };
      newMessages.push(assistantMessage);
      
      // Add tool call messages
      const { toolCallMessages, processedToolCalls } = toolCallsResult.value;
      toolCallMessages.forEach(message => newMessages.push(message));
      
      // Recursively call the model with updated messages
      return this.callModel({
        modelId,
        prompt,
        messages: newMessages,
        tools,
        iteration: iteration + 1,
        maxIterations
      });
    } else {
      // No tool calls, just add the assistant message
      const assistantMessage: ChatCompletionMessageParam = {
        role: 'assistant',
        content
      };
      newMessages.push(assistantMessage);
      
      // Map tool calls to the correct format if they exist
      const toolCalls = modelResponse.fullResponse?.choices?.[0]?.message?.tool_calls?.map(toolCall => {
        try {
          return {
            name: toolCall.function.name,
            args: JSON.parse(toolCall.function.arguments),
            id: toolCall.id,
            result: '' // Empty result since these haven't been processed
          };
        } catch (e) {
          return {
            name: toolCall.function.name,
            args: {},
            id: toolCall.id,
            result: ''
          };
        }
      });
      
      // Return the final result
      const result: Result<ModelCallResult> = {
        success: true,
        value: {
          content,
          messages: newMessages,
          fullResponse: modelResponse.fullResponse,
          toolCalls
        }
      };
      
      // Add verbose logging of the final result
      log.verbose('callModel final result', JSON.stringify(result));
      
      return result;
    }
  }
  
  /**
   * Generate completion using model service - pure function
   */
  private static async generateCompletion(
    modelId: string,
    prompt: string,
    messages: ChatCompletionMessageParam[],
    tools?: ChatCompletionTool[]
  ): Promise<Result<ModelCallResult>> {
    // Add verbose logging of the input parameters
    log.verbose('generateCompletion input', JSON.stringify({
      modelId,
      prompt,
      messages,
      tools
    }));
    try {
      // Get the model
      const model = await modelService.getModel(modelId);
      if (!model) {
        return {
          success: false,
          error: createModelError(
            'model_not_found',
            `Model not found: ${modelId}`,
            modelId
          )
        };
      }

      // Extract model settings
      const temperature = model.temperature ? parseFloat(model.temperature) : 0.0;

      // Resolve and decrypt the API key
      const decryptedApiKey = await modelService.resolveAndDecryptApiKey(model.encryptedApiKey);
      if (!decryptedApiKey) {
        return {
          success: false,
          error: createModelError(
            'api_key_error',
            'Failed to resolve or decrypt API key',
            modelId
          )
        };
      }

      // Initialize the OpenAI client
      const openai = new OpenAI({
        apiKey: decryptedApiKey,
        baseURL: model.baseUrl
      });
      
      // Create the request parameters
      const requestParams: OpenAI.Chat.ChatCompletionCreateParams = {
        model: model.name,
        messages: [
          {
            role: "system",
            content: prompt
          },
          ...messages
        ],
        temperature
      };
      
      // Add tools if available
      if (tools && tools.length > 0) {
        requestParams.tools = tools;
      }
      
      // Make the API request using the OpenAI client
      const chatCompletion = await openai.chat.completions.create(requestParams);

      // Create a standardized response with OpenAI-compatible structure
      const result: Result<ModelCallResult> = {
        success: true,
        value: {
          content: chatCompletion.choices[0]?.message?.content || '',
          messages: [...messages],
          fullResponse: chatCompletion
        }
      };
      
      // Add verbose logging of the successful result
      log.verbose('generateCompletion success result', JSON.stringify(result));
      
      return result;
    } catch (error) {
      // Handle API errors
      if (error instanceof OpenAI.APIError) {
        const errorResult: Result<ModelCallResult> = {
          success: false,
          error: createModelError(
            'api_error',
            error.message,
            modelId,
            undefined,
            {
              status: error.status,
              type: error.type,
              code: error.code,
              param: error.param
            }
          )
        };
        
        // Add verbose logging of the API error
        log.verbose('generateCompletion API error', JSON.stringify(errorResult));
        
        return errorResult;
      }
      
      // Handle other errors
      const errorResult: Result<ModelCallResult> = {
        success: false,
        error: createModelError(
          'unknown_error',
          error instanceof Error ? error.message : String(error),
          modelId
        )
      };
      
      // Add verbose logging of the unknown error
      log.verbose('generateCompletion unknown error', JSON.stringify(errorResult));
      
      return errorResult;
    }
  }
  
  /**
   * Process tool calls - pure function
   */
  private static async processToolCalls(
    input: ToolCallProcessingInput
  ): Promise<Result<ToolCallProcessingResult>> {
    const { toolCalls } = input;
    
    // Add verbose logging of the input
    log.verbose('processToolCalls input', JSON.stringify(input));
    
    if (!toolCalls || toolCalls.length === 0) {
      const emptyResult: Result<ToolCallProcessingResult> = {
        success: true,
        value: {
          toolCallMessages: [],
          processedToolCalls: []
        }
      };
      
      // Add verbose logging of the empty result
      log.verbose('processToolCalls empty result', JSON.stringify(emptyResult));
      
      return emptyResult;
    }
    
    try {
      // Array to collect new messages with tool results
      const toolCallMessages: ChatCompletionMessageParam[] = [];
      const processedToolCalls: Array<{
        name: string;
        args: Record<string, unknown>;
        id: string;
        result: string;
      }> = [];
      
      // Process each tool call
      for (const toolCall of toolCalls) {
        const { id, function: { name, arguments: argsString } } = toolCall;
        
        try {
          // Parse the arguments
          const args = JSON.parse(argsString);
          
          // Extract server and tool names from the formatted name
          // Format is "-_-_-serverName-_-_-toolName"
          const parts = name.split('-_-_-');
          if (parts.length !== 3) {
            throw new Error(`Invalid tool name format: ${name}`);
          }
          
          const serverName = parts[1];
          const toolName = parts[2];
          
          // Call the tool via MCP service
          const result = await mcpService.callTool(
            serverName,
            toolName,
            args
          );
          
          // Format the result
          const resultContent = result.success
            ? JSON.stringify(result.data)
            : `Error: ${result.error}`;
          
          // Add tool result message
          toolCallMessages.push({
            role: "tool",
            tool_call_id: id,
            content: resultContent
          });
          
          // Add to processed tool calls
          processedToolCalls.push({
            name,
            args,
            id,
            result: resultContent
          });
        } catch (error) {
          // Add error message for this specific tool call
          toolCallMessages.push({
            role: "tool",
            tool_call_id: id,
            content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
          
          // Add to processed tool calls with error
          processedToolCalls.push({
            name,
            args: {},
            id,
            result: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }
      
      const result: Result<ToolCallProcessingResult> = {
        success: true,
        value: {
          toolCallMessages,
          processedToolCalls
        }
      };
      
      // Add verbose logging of the successful result
      log.verbose('processToolCalls success result', JSON.stringify(result));
      
      return result;
    } catch (error) {
      const errorResult: Result<ToolCallProcessingResult> = {
        success: false,
        error: createToolError(
          'tool_processing_failed',
          error instanceof Error ? error.message : String(error),
          'unknown'
        )
      };
      
      // Add verbose logging of the error result
      log.verbose('processToolCalls error result', JSON.stringify(errorResult));
      
      return errorResult;
    }
  }
  
  /**
   * Check if response has tool calls - pure function
   */
  private static hasToolCalls(response: ModelCallResult): boolean {
    return !!(
      response.fullResponse?.choices?.[0]?.message?.tool_calls &&
      response.fullResponse.choices[0].message.tool_calls.length > 0
    );
  }
}

/**
 * 智能体对话组件 - API 模式
 * 使用 Bisheng API 进行对话，保持 Electron 风格
 * 集成会话管理和自动启动功能
 */

import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, AlertCircle, StopCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { BishengWorkflow, BishengMessage } from '../../shared/types';
import { useAgentSessionStore } from '../store/agentSessionStore';

interface AgentChatProps {
  workflow: BishengWorkflow;
}

const AgentChat: React.FC<AgentChatProps> = ({ workflow }) => {
  // 会话管理 Store
  const {
    getSession,
    updateSession,
    addMessage: addMessageToStore,
    updateMessage: updateMessageInStore,
    updateMessageType,
    setActiveWorkflow
  } = useAgentSessionStore();

  // 本地状态
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null); // 保存清理函数

  // 从 Store 获取当前会话
  const session = getSession(workflow.id, workflow.name);
  const messages = session.messages;
  const sessionId = session.sessionId;
  const messageId = session.messageId;
  const inputNodeId = session.inputNodeId;

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 工作流变化时，切换会话并自动启动
  useEffect(() => {
    console.log('[AgentChat] Workflow changed:', workflow.id, workflow.name);

    // 清理之前的事件监听器
    if (cleanupRef.current) {
      console.log('[AgentChat] Cleaning up previous event listeners');
      cleanupRef.current();
      cleanupRef.current = null;
    }

    // 设置为活跃会话
    setActiveWorkflow(workflow.id);

    // 获取会话状态
    const currentSession = getSession(workflow.id, workflow.name);

    // 如果是新会话（没有消息且未自动启动），则自动启动
    if (currentSession.messages.length === 0 && !currentSession.isAutoStarted) {
      console.log('[AgentChat] New session detected, auto-starting workflow');
      autoStartWorkflow();
    }

    setError(null);

    // 组件卸载时清理
    return () => {
      if (cleanupRef.current) {
        console.log('[AgentChat] Component unmounting, cleaning up');
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [workflow.id]);

  /**
   * 自动启动工作流（获取欢迎语和引导问题）
   */
  const autoStartWorkflow = async () => {
    console.log('[AUTO-START] Starting workflow automatically');
    setIsProcessing(true);
    setError(null);

    // 创建助手消息占位符
    const assistantMessageId = `msg-${Date.now()}-assistant`;
    const assistantMessage: BishengMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      type: 'stream',
    };

    // 添加到 Store
    addMessageToStore(workflow.id, assistantMessage);

    // 标记为已自动启动
    updateSession(workflow.id, { isAutoStarted: true });

    // 清理之前的事件监听器
    if (cleanupRef.current) {
      console.log('[AUTO-START] Cleaning up previous listeners');
      cleanupRef.current();
      cleanupRef.current = null;
    }

    let assistantContent = '';

    try {
      console.log('[AUTO-START] Invoking workflow without user input');

      // 调用工作流，不传递用户输入（首次启动）
      const { streamId } = await window.electronAPI.bisheng.invokeWorkflow(
        workflow.id,
        { user_input: '' }, // 空输入
        true,
        undefined, // 无 sessionId
        undefined, // 无 messageId
        undefined  // 无 inputNodeId
      );

      console.log('[AUTO-START] Workflow invoked, streamId:', streamId);

      // 注册事件监听器
      const handleStreamChunk = (e: { streamId: string; chunk: string }) => {
        if (e.streamId !== streamId) return;

        try {
          const lines = e.chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;

            const jsonStr = line.substring(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;

            const eventData = JSON.parse(jsonStr);
            console.log('[AUTO-START] SSE event:', eventData.event || eventData.data?.event);

            // 处理不同类型的事件
            const event = eventData.data?.event || eventData.event;
            const outputSchema = eventData.data?.output_schema || eventData.output_schema;

            // 保存 session_id
            if (eventData.session_id) {
              console.log('[AUTO-START] Setting session_id:', eventData.session_id);
              updateSession(workflow.id, { sessionId: eventData.session_id });
            }

            // 处理 input 事件（保存 message_id 和 node_id）
            if (event === 'input') {
              if (eventData.data?.message_id || eventData.message_id) {
                const msgId = String(eventData.data?.message_id || eventData.message_id);
                console.log('[AUTO-START] Setting message_id:', msgId);
                updateSession(workflow.id, { messageId: msgId });
              }

              if (eventData.data?.node_id || eventData.node_id) {
                const nodeId = eventData.data?.node_id || eventData.node_id;
                console.log('[AUTO-START] Setting input node_id:', nodeId);
                updateSession(workflow.id, { inputNodeId: nodeId });
              }
            }

            // 处理欢迎语和引导问题
            if (event === 'guide_word' || event === 'guide_question') {
              const message = outputSchema?.message || '';
              if (message) {
                assistantContent += message + '\n';
                updateMessageInStore(workflow.id, assistantMessageId, assistantContent.trim());
              }
            }

            // 处理流式消息
            if (event === 'stream_msg') {
              const status = eventData.data?.status || eventData.status;
              const message = outputSchema?.message || '';

              if (status === 'stream' && message) {
                assistantContent += message;
                updateMessageInStore(workflow.id, assistantMessageId, assistantContent);
              } else if (status === 'end' && message) {
                assistantContent = message;
                updateMessageInStore(workflow.id, assistantMessageId, assistantContent);
              }
            }

            // 处理普通输出
            if (event === 'output_msg') {
              const message = outputSchema?.message || '';
              if (message) {
                assistantContent += message + '\n';
                updateMessageInStore(workflow.id, assistantMessageId, assistantContent.trim());
              }
            }
          }
        } catch (err) {
          console.error('[AUTO-START] Error parsing SSE chunk:', err);
        }
      };

      const handleStreamEnd = (e: { streamId: string; success: boolean; error?: string }) => {
        if (e.streamId !== streamId) return;

        console.log('[AUTO-START] Stream ended:', e.success);

        if (e.success) {
          // 更新消息类型为 text
          updateMessageType(workflow.id, assistantMessageId, 'text');
        } else {
          setError(e.error || '自动启动失败');
          updateMessageType(workflow.id, assistantMessageId, 'error');
        }

        setIsProcessing(false);

        // 清理监听器
        if (cleanupRef.current) {
          cleanupRef.current();
          cleanupRef.current = null;
        }
      };

      // 注册监听器（返回清理函数）
      const offChunk = window.electronAPI.bisheng.onStreamChunk(handleStreamChunk);
      const offEnd = window.electronAPI.bisheng.onStreamEnd(handleStreamEnd);

      // 保存清理函数到 ref
      cleanupRef.current = () => {
        console.log('[AUTO-START Cleanup] Removing event listeners');
        offChunk();
        offEnd();
      };

    } catch (error) {
      console.error('[AUTO-START] Error:', error);
      setError(error instanceof Error ? error.message : '自动启动失败');
      updateMessageType(workflow.id, assistantMessageId, 'error');
      setIsProcessing(false);
    }
  };

  /**
   * 发送消息到 Bisheng 工作流
   * 处理流式响应并更新 UI
   */
  const handleSendMessage = async () => {
    if (!inputText.trim() || isProcessing) return;

    // 添加用户消息
    const userMessage: BishengMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputText,
      timestamp: Date.now(),
      type: 'text',
    };

    // 添加到 Store
    addMessageToStore(workflow.id, userMessage);

    const currentInput = inputText;
    setInputText('');
    setIsProcessing(true);
    setError(null);

    // 创建助手消息占位符
    const assistantMessageId = `msg-${Date.now()}-assistant`;
    const assistantMessage: BishengMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      type: 'stream',
    };

    // 添加到 Store
    addMessageToStore(workflow.id, assistantMessage);

    // 清理之前的事件监听器
    if (cleanupRef.current) {
      console.log('[handleSendMessage] Cleaning up previous listeners');
      cleanupRef.current();
      cleanupRef.current = null;
    }

    let assistantContent = '';
    let buffer = ''; // SSE 数据缓冲区
    let hasReceivedData = false; // 标记是否收到数据
    let timeoutId: NodeJS.Timeout | null = null; // 超时定时器

    try {
      const hasSession = sessionId && inputNodeId;
      console.log(hasSession ? '[CONTINUE]' : '[FIRST]', 'Invoking workflow', {
        workflowId: workflow.id,
        sessionId,
        messageId,
        inputNodeId,
        input: currentInput
      });

      // 调用工作流获取 streamId
      const { streamId } = await window.electronAPI.bisheng.invokeWorkflow(
        workflow.id,
        { user_input: currentInput }, // 用户输入
        true,
        sessionId || undefined,
        messageId || undefined,
        inputNodeId || undefined // 传递输入节点 ID
      );

      console.log('[DEBUG] Workflow invoked, streamId:', streamId);
      console.log('[DEBUG] Now registering event listeners...');

      // 设置超时：如果 30 秒内没有收到数据，显示错误
      timeoutId = setTimeout(() => {
        if (!hasReceivedData) {
          console.error('[TIMEOUT] No data received within 30 seconds');
          setError('工作流响应超时，请重试');
          setIsProcessing(false);
          if (cleanupRef.current) {
            cleanupRef.current();
            cleanupRef.current = null;
          }
        }
      }, 30000);

      // 现在注册事件监听器（使用已知的 streamId）
      const offStart = window.electronAPI.bisheng.onStreamStart(({ streamId: id }: { streamId: string }) => {
        console.log('[DEBUG] Stream start event received:', id);
        if (id === streamId) {
          console.log('Stream started:', streamId);
        }
      });

      // 监听流数据块
      const offChunk = window.electronAPI.bisheng.onStreamChunk(({ streamId: id, chunk }: { streamId: string; chunk: string }) => {
        console.log('[DEBUG] Stream chunk event received:', { streamId: id, chunkLength: chunk.length });
        if (id !== streamId) {
          console.log('[DEBUG] Ignoring chunk for different streamId:', { expected: streamId, received: id });
          return;
        }

        // 收到数据，清除超时
        if (!hasReceivedData) {
          hasReceivedData = true;
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          console.log('[DEBUG] First data received, timeout cleared');
        }

        // 打印原始数据（前 200 字符）
        console.log('[DEBUG] Raw chunk data:', chunk.substring(0, 200));

        // 累积数据并按行处理
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留最后一个不完整的行

        console.log('[DEBUG] Processing', lines.length, 'lines');

        for (const line of lines) {
          if (!line.startsWith('data: ')) {
            console.log('[DEBUG] Skipping non-data line:', line.substring(0, 50));
            continue;
          }

          try {
            const event = JSON.parse(line.substring(6));
            console.log('SSE event:', event.data?.event || event.event, event);

            // 更新 session_id（从第一个事件中获取）
            if (event.session_id && !sessionId) {
              console.log('Setting session_id:', event.session_id);
              updateSession(workflow.id, { sessionId: event.session_id });
            }

            // 处理事件数据
            const eventData = event.data || event;

            // 从 input 事件中提取 message_id 和 node_id
            if (eventData.event === 'input') {
              const updates: Partial<{ sessionId: string; messageId: string; inputNodeId: string }> = {};

              if (eventData.message_id) {
                console.log('Setting message_id:', eventData.message_id);
                updates.messageId = String(eventData.message_id);
              }

              if (eventData.node_id) {
                console.log('Setting input node_id:', eventData.node_id);
                updates.inputNodeId = eventData.node_id;
              }

              if (Object.keys(updates).length > 0) {
                updateSession(workflow.id, updates);
              }

              // 如果当前没有内容，显示提示信息
              if (!assistantContent.trim()) {
                assistantContent = '工作流已准备就绪，请继续输入...';
                updateMessageInStore(workflow.id, assistantMessageId, assistantContent);
                updateMessageType(workflow.id, assistantMessageId, 'text');
              }
            }

            // 处理 guide_word 事件（引导词）
            if (eventData.event === 'guide_word') {
              const msg = eventData.output_schema?.message;
              if (msg) {
                const content = Array.isArray(msg) ? msg.join('') : String(msg);
                if (content.trim()) {
                  assistantContent = content;
                  console.log('Guide word:', content);
                  updateMessageInStore(workflow.id, assistantMessageId, assistantContent);
                  updateMessageType(workflow.id, assistantMessageId, 'text');
                }
              }
            }

            // 处理 guide_question 事件（引导问题）
            if (eventData.event === 'guide_question') {
              const msg = eventData.output_schema?.message;
              if (msg) {
                const content = Array.isArray(msg) ? msg.join('') : String(msg);
                if (content.trim()) {
                  assistantContent = content;
                  console.log('Guide question:', content);
                  updateMessageInStore(workflow.id, assistantMessageId, assistantContent);
                  updateMessageType(workflow.id, assistantMessageId, 'text');
                }
              }
            }

            // 处理 stream_msg 事件
            if (eventData.event === 'stream_msg') {
              const msg = eventData.output_schema?.message;
              if (msg) {
                const content = Array.isArray(msg) ? msg.join('') : String(msg);

                if (eventData.status === 'end') {
                  // 最终完整内容，覆盖之前的流式输出
                  assistantContent = content;
                  console.log('Stream message (end):', content.substring(0, 50) + '...');
                  updateMessageInStore(workflow.id, assistantMessageId, assistantContent);
                  updateMessageType(workflow.id, assistantMessageId, 'text');
                } else if (eventData.status === 'stream') {
                  // 增量内容，累加
                  assistantContent += content;
                  console.log('Stream message (stream):', content);
                  updateMessageInStore(workflow.id, assistantMessageId, assistantContent);
                }
              }
            }

            // 处理 output_msg 事件
            if (eventData.event === 'output_msg') {
              const msg = eventData.output_schema?.message;
              if (msg) {
                const content = Array.isArray(msg) ? msg.join('') : String(msg);
                assistantContent = content;
                console.log('Output message:', content.substring(0, 50) + '...');
                updateMessageInStore(workflow.id, assistantMessageId, assistantContent);
                updateMessageType(workflow.id, assistantMessageId, 'text');
              }
            }

            // 处理 close 事件（工作流结束）
            if (eventData.event === 'close') {
              const errorMsg = eventData.output_schema?.message;
              if (errorMsg) {
                console.error('Workflow error:', errorMsg);
                setError(`工作流错误: ${JSON.stringify(errorMsg)}`);
              } else {
                console.log('Workflow completed successfully');
              }
            }

          } catch (e) {
            console.warn('Failed to parse SSE line:', line, e);
          }
        }
      });

      // 监听流结束事件
      const offEnd = window.electronAPI.bisheng.onStreamEnd(({ streamId: id, success, error: err }: { streamId: string; success: boolean; error?: string }) => {
        console.log('[DEBUG] Stream end event received:', { streamId: id, success, error: err });
        if (id !== streamId) {
          console.log('[DEBUG] Ignoring end event for different streamId:', { expected: streamId, received: id });
          return;
        }

        console.log('Stream ended:', { success, error: err });

        // 清除超时
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        // 清理当前流的事件监听器
        if (cleanupRef.current) {
          console.log('[Stream End] Cleaning up current stream listeners');
          cleanupRef.current();
          cleanupRef.current = null;
        }

        setIsProcessing(false);

        if (!success) {
          setError(err || '流式响应失败');
        }

        // 聚焦输入框
        inputRef.current?.focus();
      });

      // 保存清理函数到 ref
      cleanupRef.current = () => {
        console.log('[Cleanup] Removing event listeners');
        offChunk();
        offStart();
        offEnd();
      };

      console.log('[DEBUG] Event listeners registered, waiting for stream events...');

    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError(err?.message || '发送消息失败');
      setIsProcessing(false);
      inputRef.current?.focus();

      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    }
  };

  /**
   * 停止当前工作流
   */
  const handleStopWorkflow = async () => {
    if (!sessionId) {
      console.warn('[STOP] No sessionId available, cannot stop workflow');
      return;
    }

    try {
      console.log('[STOP] Stopping workflow', { workflowId: workflow.id, sessionId });

      // 调用停止接口
      await window.electronAPI.bisheng.stopWorkflow(workflow.id, sessionId);

      console.log('[STOP] Workflow stopped successfully');

      // 清理事件监听器
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      // 重置状态
      setIsProcessing(false);
      setError(null);

      // 聚焦输入框
      inputRef.current?.focus();

    } catch (error) {
      console.error('[STOP] Failed to stop workflow:', error);
      setError(error instanceof Error ? error.message : '停止工作流失败');
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* 工作流信息 */}
      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {workflow.name}
            </h3>
            {workflow.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{workflow.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Bot className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-sm text-gray-500 dark:text-gray-400">开始与智能体对话</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                输入你的问题或需求
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start space-x-3 ${
              message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}
          >
            {/* 头像 */}
            <div
              className={`p-2 rounded-lg flex-shrink-0 ${
                message.role === 'user'
                  ? 'bg-blue-100 dark:bg-blue-900/30'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              {message.role === 'user' ? (
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              ) : (
                <Bot className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              )}
            </div>

            {/* 消息内容 - 玻璃拟态效果 */}
            <div
              className={`flex-1 px-4 py-3 rounded-xl shadow-md transition-all duration-200 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white backdrop-blur-sm'
                  : 'glass text-gray-900 dark:text-gray-100'
              }`}
            >
              {message.type === 'stream' && message.content === '' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : message.role === 'user' ? (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}

        {error && (
          <div className="flex items-start space-x-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 - 玻璃拟态效果 */}
      <div className="px-6 py-4 border-t border-gray-200/50 dark:border-gray-700/50 glass">
        <div className="flex items-end space-x-3">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
            placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
            rows={3}
            className="flex-1 px-4 py-3 border border-gray-300/50 dark:border-gray-600/50 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          />

          {/* 停止按钮 - 仅在处理中显示 */}
          {isProcessing && (
            <button
              type="button"
              onClick={handleStopWorkflow}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl transition-all duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg"
            >
              <StopCircle className="w-5 h-5" />
              <span>停止</span>
            </button>
          )}

          {/* 发送按钮 - 仅在非处理中显示 */}
          {!isProcessing && (
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!inputText.trim()}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-600 dark:disabled:to-gray-700 text-white rounded-xl transition-all duration-200 disabled:cursor-not-allowed flex items-center space-x-2 shadow-md hover:shadow-lg"
            >
              <Send className="w-5 h-5" />
              <span>发送</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentChat;

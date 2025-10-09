import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Play, Square, RotateCcw, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { VoiceRecognitionTestResult, VoiceRecognitionModel } from '../../shared/types';
import { getBestRecordingFormat, playAudioData, isValidAudioData } from '../../utils/audio-utils';

interface VoiceRecognitionTestProps {
  onTestComplete: (results: VoiceRecognitionTestResult[]) => void;
  onClose: () => void;
}

export const VoiceRecognitionTest: React.FC<VoiceRecognitionTestProps> = ({ onTestComplete, onClose }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioData, setAudioData] = useState<ArrayBuffer | null>(null);
  const [testResults, setTestResults] = useState<VoiceRecognitionTestResult[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // 清理资源
  useEffect(() => {
    return () => {
      // 清理定时器
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // 停止录音
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.warn('Failed to stop media recorder:', e);
        }
      }
      
      // 停止所有音频轨道
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (e) {
            console.warn('Failed to stop track:', e);
          }
        });
      }
    };
  }, []);


  // 开始录音
  const startRecording = async () => {
    try {
      setError('');
      
      // 清理之前的流（如果有）
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // 保存流引用以便后续清理
      mediaStreamRef.current = stream;

      // 获取最佳录音格式
      const selectedMimeType = getBestRecordingFormat();
      console.log('Selected audio format:', selectedMimeType);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: selectedMimeType });
          const arrayBuffer = await audioBlob.arrayBuffer();
          setAudioData(arrayBuffer);
          
          // 停止所有音频轨道
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
          }
          
          console.log('Recording completed, size:', audioBlob.size, 'bytes');
        } catch (err) {
          setError(`处理录音数据失败: ${err instanceof Error ? err.message : '未知错误'}`);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('录音过程中发生错误');
        
        // 发生错误时也要清理流
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // 每100ms收集一次数据
      setIsRecording(true);
      setRecordingTime(0);

      // 开始计时
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 0.1);
      }, 100);

    } catch (err) {
      setError(`录音失败: ${err instanceof Error ? err.message : '未知错误'}`);
      
      // 失败时清理流
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
    }
  };

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // 播放录音 - 使用 Web Audio API 避免安全检查
  const playRecording = async () => {
    if (!audioData || isPlaying) return;

    console.log('=== 开始播放录音 (Web Audio API) ===');
    console.log('音频数据大小:', audioData.byteLength, 'bytes');

    let audioContext: AudioContext | null = null;
    let source: AudioBufferSourceNode | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      setError('');
      setIsPlaying(true);
      
      // 检查音频数据是否有效
      if (!isValidAudioData(audioData)) {
        console.error('音频数据无效');
        setError('录制的音频数据无效，请重新录制');
        return;
      }

      console.log('音频数据验证通过，开始播放...');

      // 创建 AudioContext
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('AudioContext 创建成功，状态:', audioContext.state);

      // 如果 AudioContext 被暂停，恢复它
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log('AudioContext 已恢复');
      }

      // 解码音频数据 - 使用 Promise 版本避免回调地狱
      console.log('开始解码音频数据...');
      
      let audioBuffer: AudioBuffer;
      
      // 直接跳过 Web Audio API，使用 HTML Audio 播放原始录音
      console.log('跳过 Web Audio API 解码，直接使用 HTML Audio 播放原始录音');
      throw new Error('使用 HTML Audio 播放真实录音');

      console.log('音频解码成功:', {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels
      });

      // 创建音频源
      source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      console.log('音频源创建成功，开始播放...');

      // 播放音频
      await new Promise<void>((resolve, reject) => {
        let resolved = false;
        
        // 设置播放超时
        timeoutId = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            console.error('播放超时');
            reject(new Error('播放超时 (10秒)'));
          }
        }, 10000);

        source!.onended = () => {
          if (!resolved) {
            resolved = true;
            console.log('音频播放结束');
            if (timeoutId) clearTimeout(timeoutId);
            resolve();
          }
        };

        try {
          source!.start(0);
          console.log('音频开始播放');
        } catch (err) {
          if (!resolved) {
            resolved = true;
            if (timeoutId) clearTimeout(timeoutId);
            reject(err);
          }
        }
      });
      
      console.log('=== 播放成功完成 ===');
    } catch (error) {
      console.error('=== Web Audio API 播放失败，尝试 HTML Audio 回退 ===', error);
      
      // 回退到 HTML Audio 元素
      try {
        await playWithHtmlAudio();
        console.log('=== HTML Audio 播放成功 ===');
      } catch (htmlError) {
        console.error('=== 所有播放方式都失败 ===', htmlError);
        setError(`播放失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    } finally {
      // 清理资源
      if (source) {
        try {
          source.disconnect();
          console.log('音频源已断开');
        } catch (e) {
          console.warn('Failed to disconnect source:', e);
        }
      }

      if (audioContext && audioContext.state !== 'closed') {
        try {
          await audioContext.close();
          console.log('AudioContext 已关闭');
        } catch (e) {
          console.warn('Failed to close AudioContext:', e);
        }
      }

      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      setIsPlaying(false);
      console.log('=== 播放函数结束 ===');
    }
  };

  // HTML Audio 回退播放方案 - 播放真实的录音
  const playWithHtmlAudio = async (): Promise<void> => {
    console.log('=== 使用 HTML Audio 播放真实录音 ===');
    
    // 使用原始录音数据创建 blob
    console.log('使用原始录音数据，大小:', audioData!.byteLength, 'bytes');
    const blob = new Blob([audioData!], { type: 'audio/webm;codecs=opus' });
    
    // 尝试不同的播放方式
    const tryPlayback = async (useObjectUrl: boolean): Promise<void> => {
      console.log(`尝试播放方式: ${useObjectUrl ? 'Object URL' : 'Data URL'}`);
      
      let audioSrc: string;
      
      if (useObjectUrl) {
        // 方式1: 使用 Object URL
        audioSrc = URL.createObjectURL(blob);
        console.log('创建 Object URL:', audioSrc);
      } else {
        // 方式2: 使用 Data URL
        const reader = new FileReader();
        audioSrc = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('FileReader 失败'));
          reader.readAsDataURL(blob);
        });
        console.log('创建 Data URL，长度:', audioSrc.length);
      }
      
      const audio = new Audio(audioSrc);
      let resolved = false;
      
      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          if (useObjectUrl) {
            URL.revokeObjectURL(audioSrc);
          }
          console.log('HTML Audio 清理完成');
        }
      };
      
      return new Promise<void>((resolvePlay, rejectPlay) => {
        // 设置事件监听器
        audio.onloadstart = () => console.log('HTML Audio: 开始加载');
        audio.oncanplay = () => console.log('HTML Audio: 可以播放');
        audio.onplay = () => console.log('HTML Audio: 开始播放');
        audio.onended = () => {
          if (!resolved) {
            resolved = true;
            console.log('HTML Audio: 播放结束');
            cleanup();
            resolvePlay();
          }
        };
        
        audio.onerror = (e) => {
          if (!resolved) {
            resolved = true;
            console.error('HTML Audio 播放错误:', e);
            console.error('Audio error details:', audio.error);
            cleanup();
            rejectPlay(new Error(`HTML Audio 播放失败: ${audio.error?.message || '未知错误'}`));
          }
        };
        
        // 设置超时
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            console.error('HTML Audio 播放超时');
            cleanup();
            rejectPlay(new Error('HTML Audio 播放超时 (10秒)'));
          }
        }, 10000);
        
        console.log('调用 HTML Audio play()...');
        audio.play().catch((playError) => {
          if (!resolved) {
            resolved = true;
            console.error('HTML Audio play() 失败:', playError);
            cleanup();
            rejectPlay(playError);
          }
        });
      });
    };
    
    // 先尝试 Object URL，失败后尝试 Data URL
    try {
      await tryPlayback(true);
    } catch (objectUrlError) {
      console.warn('Object URL 播放失败，尝试 Data URL:', objectUrlError);
      try {
        await tryPlayback(false);
      } catch (dataUrlError) {
        console.error('所有播放方式都失败了');
        throw new Error(`播放失败: Object URL(${objectUrlError.message}) Data URL(${dataUrlError.message})`);
      }
    }
  };

  // 测试所有模型
  const testAllModels = async () => {
    if (!audioData) {
      setError('请先录制音频');
      return;
    }

    setIsTesting(true);
    setError('');

    try {
      // 转换为 WAV 提高通用性
      let payload = audioData;
      try {
        const { convertToWav } = await import('../../utils/audio-utils');
        payload = await convertToWav(audioData);
      } catch (e) {
        console.warn('WAV conversion failed, sending original data');
      }

      // 调用主进程进行测试
      const results = await (window as any).electronAPI?.voice?.testAllModels?.(payload);
      
      if (results) {
        setTestResults(results);
        onTestComplete(results);
      } else {
        throw new Error('测试失败：无法获取结果');
      }
    } catch (err) {
      setError(`测试失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setIsTesting(false);
    }
  };

  // 重新录制
  const resetRecording = () => {
    setAudioData(null);
    setTestResults([]);
    setRecordingTime(0);
    setError('');
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  // 获取模型显示名称
  const getModelDisplayName = (model: VoiceRecognitionModel) => {
    switch (model) {
      case 'browser': return '浏览器原生';
      case 'whisper': return 'Whisper';
      case 'funasr': return 'FunASR';
      default: return model;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              语音识别模型测试
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="关闭"
              aria-label="关闭"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* 录音控制 */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                1. 录制测试音频
              </h3>
              
              <div className="flex items-center space-x-4 mb-4">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <Mic className="w-5 h-5" />
                    <span>开始录音</span>
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    <MicOff className="w-5 h-5" />
                    <span>停止录音</span>
                  </button>
                )}

                {audioData && (
                  <button
                    onClick={playRecording}
                    disabled={isPlaying}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isPlaying
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>播放中...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        <span>播放</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={resetRecording}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>重新录制</span>
                </button>
              </div>

              {/* 录音状态 */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {isRecording ? '录音中...' : '未录音'}
                  </span>
                </div>
                
                {isRecording && (
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                      {formatTime(recordingTime)}
                    </span>
                  </div>
                )}

                {audioData && (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600 dark:text-green-400">
                      录音完成 ({(audioData.byteLength / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 测试控制 */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                2. 测试所有模型
              </h3>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={testAllModels}
                  disabled={!audioData || isTesting}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md focus:outline-none focus:ring-2 ${
                    !audioData || isTesting
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
                  }`}
                >
                  {isTesting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>测试中...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      <span>开始测试</span>
                    </>
                  )}
                </button>

                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {audioData ? '准备就绪' : '请先录制音频'}
                </span>
              </div>
            </div>

            {/* 错误信息 */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                  <span className="text-red-700 dark:text-red-400">{error}</span>
                </div>
              </div>
            )}

            {/* 测试结果 */}
            {testResults.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  3. 测试结果对比
                </h3>
                
                <div className="space-y-4">
                  {testResults.map((result, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 ${
                        result.success
                          ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                          : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {result.success ? (
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                          )}
                          <span className="font-medium text-gray-900 dark:text-white">
                            {getModelDisplayName(result.model)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>延迟: {result.latency}ms</span>
                          <span>准确率: {(result.accuracy * 100).toFixed(1)}%</span>
                          <span>置信度: {(result.confidence * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        <strong>识别结果:</strong> {result.text || '无结果'}
                      </div>
                      
                      {result.error && (
                        <div className="text-sm text-red-600 dark:text-red-400">
                          <strong>错误:</strong> {result.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* 推荐选择 */}
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    推荐选择
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    根据测试结果，建议选择准确率最高且延迟较低的模型作为默认语音识别方案。
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


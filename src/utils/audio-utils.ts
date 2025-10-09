/**
 * 音频工具函数
 * 用于处理音频格式转换和兼容性问题
 */

/**
 * 检测浏览器支持的音频格式
 */
export function getSupportedAudioFormats(): string[] {
  const formats = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/wav',
    'audio/ogg;codecs=opus',
    'audio/ogg'
  ];

  return formats.filter(format => {
    try {
      return MediaRecorder.isTypeSupported(format);
    } catch {
      return false;
    }
  });
}

/**
 * 检测浏览器支持的播放格式
 */
export function getSupportedPlaybackFormats(): string[] {
  const audio = new Audio();
  const formats = [
    'audio/wav',
    'audio/mp3',
    'audio/mp4',
    'audio/webm',
    'audio/ogg'
  ];

  return formats.filter(format => {
    try {
      const canPlay = audio.canPlayType(format);
      return canPlay === 'probably' || canPlay === 'maybe';
    } catch {
      return false;
    }
  });
}

/**
 * 将 ArrayBuffer 转换为 WAV 格式
 * 添加超时和详细日志，避免卡死
 */
export async function convertToWav(audioData: ArrayBuffer): Promise<ArrayBuffer> {
  console.log('=== 开始 WAV 转换 ===');
  console.log('输入数据大小:', audioData.byteLength, 'bytes');
  
  let audioContext: AudioContext | null = null;
  try {
    // 添加超时机制，避免 decodeAudioData 卡死
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('WAV 转换超时 (5秒)'));
      }, 5000);
    });

    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    console.log('AudioContext 创建成功，状态:', audioContext.state);
    
    // 使用 Promise.race 添加超时
    const audioBuffer = await Promise.race([
      audioContext.decodeAudioData(audioData.slice(0)),
      timeoutPromise
    ]);
    
    console.log('音频解码成功:', {
      length: audioBuffer.length,
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels,
      duration: audioBuffer.duration
    });
    
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    const numberOfChannels = audioBuffer.numberOfChannels;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV 文件头
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);
    
    console.log('开始写入音频数据...');
    
    // 写入音频数据
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    console.log('=== WAV 转换完成 ===');
    console.log('输出数据大小:', arrayBuffer.byteLength, 'bytes');
    
    return arrayBuffer;
  } catch (error) {
    console.error('=== WAV 转换失败 ===', error);
    throw error;
  } finally {
    // 关键修复：确保 AudioContext 被关闭，防止资源泄漏
    if (audioContext && audioContext.state !== 'closed') {
      try {
        console.log('关闭 AudioContext...');
        await audioContext.close();
        console.log('AudioContext 已关闭');
      } catch (e) {
        console.warn('Failed to close AudioContext:', e);
      }
    }
  }
}

/**
 * 创建兼容的音频播放器
 */
export function createCompatibleAudioPlayer(audioData: ArrayBuffer): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    const supportedFormats = getSupportedPlaybackFormats();
    const createdUrls: string[] = [];
    let resolved = false;
    
    // 清理所有创建的 URL
    const cleanupUrls = () => {
      createdUrls.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          console.warn('Failed to revoke URL:', e);
        }
      });
      createdUrls.length = 0;
    };
    
    // 尝试 WAV 格式
    if (supportedFormats.includes('audio/wav')) {
      convertToWav(audioData)
        .then(wavData => {
          if (resolved) {
            return;
          }
          
          const audioBlob = new Blob([wavData], { type: 'audio/wav' });
          const audioUrl = URL.createObjectURL(audioBlob);
          createdUrls.push(audioUrl);
          const audio = new Audio(audioUrl);
          
          audio.oncanplaythrough = () => {
            if (!resolved) {
              resolved = true;
              // 只清理其他 URL，保留当前使用的
              const currentUrl = audioUrl;
              createdUrls.splice(createdUrls.indexOf(currentUrl), 1);
              cleanupUrls();
              resolve(audio);
            }
          };
          
          audio.onerror = () => {
            if (!resolved) {
              URL.revokeObjectURL(audioUrl);
              createdUrls.splice(createdUrls.indexOf(audioUrl), 1);
              tryOtherFormats();
            }
          };
          
          audio.load();
        })
        .catch((err) => {
          console.warn('WAV conversion failed, trying other formats:', err);
          if (!resolved) {
            tryOtherFormats();
          }
        });
    } else {
      tryOtherFormats();
    }
    
    function tryOtherFormats() {
      if (resolved) {
        return;
      }
      
      const formats = [
        { type: 'audio/webm;codecs=opus', data: audioData },
        { type: 'audio/webm', data: audioData },
        { type: 'audio/mp4', data: audioData }
      ];
      
      let formatIndex = 0;
      
      const tryNextFormat = () => {
        if (resolved || formatIndex >= formats.length) {
          if (!resolved) {
            cleanupUrls();
            reject(new Error('No supported audio format found'));
          }
          return;
        }
        
        const format = formats[formatIndex];
        formatIndex++;
        
        try {
          const audioBlob = new Blob([format.data], { type: format.type });
          const audioUrl = URL.createObjectURL(audioBlob);
          createdUrls.push(audioUrl);
          const audio = new Audio(audioUrl);
          
          audio.oncanplaythrough = () => {
            if (!resolved) {
              resolved = true;
              // 只清理其他 URL，保留当前使用的
              const currentUrl = audioUrl;
              createdUrls.splice(createdUrls.indexOf(currentUrl), 1);
              cleanupUrls();
              resolve(audio);
            }
          };
          
          audio.onerror = () => {
            if (!resolved) {
              URL.revokeObjectURL(audioUrl);
              createdUrls.splice(createdUrls.indexOf(audioUrl), 1);
              tryNextFormat();
            }
          };
          
          audio.load();
        } catch (err) {
          console.warn(`Failed to create audio with format ${format.type}:`, err);
          tryNextFormat();
        }
      };
      
      tryNextFormat();
    }
  });
}

/**
 * 播放音频数据
 */
export async function playAudioData(audioData: ArrayBuffer): Promise<void> {
  try {
    const audio = await createCompatibleAudioPlayer(audioData);
    
    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audio.src);
        resolve();
      };
      
      audio.onerror = (e) => {
        URL.revokeObjectURL(audio.src);
        reject(new Error('Audio playback failed'));
      };
      
      audio.play().catch(reject);
    });
  } catch (error) {
    throw new Error(`Failed to play audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 获取最佳的录音格式
 */
export function getBestRecordingFormat(): string {
  const supportedFormats = getSupportedAudioFormats();
  
  // 优先级顺序
  const preferredFormats = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg'
  ];
  
  for (const format of preferredFormats) {
    if (supportedFormats.includes(format)) {
      return format;
    }
  }
  
  // 如果没有找到支持的格式，返回默认值
  return 'audio/webm';
}

/**
 * 检查音频数据是否有效
 */
export function isValidAudioData(audioData: ArrayBuffer): boolean {
  if (!audioData || audioData.byteLength === 0) {
    return false;
  }
  
  // 检查最小文件大小（至少要有一些音频数据）
  if (audioData.byteLength < 100) {
    return false;
  }
  
  return true;
}

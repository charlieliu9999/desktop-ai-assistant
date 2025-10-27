/**
 * 渲染进程工具函数
 * 提供前端特定的工具函数
 */

// DOM操作工具
export const domUtils = {
  // 获取元素
  getElementById: (id: string): HTMLElement | null => {
    return document.getElementById(id);
  },

  // 查询选择器
  querySelector: <T extends Element = Element>(selector: string): T | null => {
    return document.querySelector<T>(selector);
  },

  // 查询所有选择器
  querySelectorAll: <T extends Element = Element>(selector: string): NodeListOf<T> => {
    return document.querySelectorAll<T>(selector);
  },

  // 添加类名
  addClass: (element: Element, className: string): void => {
    element.classList.add(className);
  },

  // 移除类名
  removeClass: (element: Element, className: string): void => {
    element.classList.remove(className);
  },

  // 切换类名
  toggleClass: (element: Element, className: string): void => {
    element.classList.toggle(className);
  },

  // 检查是否包含类名
  hasClass: (element: Element, className: string): boolean => {
    return element.classList.contains(className);
  },

  // 设置样式
  setStyle: (element: HTMLElement, property: string, value: string): void => {
    element.style.setProperty(property, value);
  },

  // 获取样式
  getStyle: (element: Element, property: string): string => {
    return window.getComputedStyle(element).getPropertyValue(property);
  },

  // 获取元素位置
  getPosition: (element: Element): { x: number; y: number; width: number; height: number } => {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    };
  },

  // 滚动到元素
  scrollToElement: (element: Element, behavior: ScrollBehavior = 'smooth'): void => {
    element.scrollIntoView({ behavior, block: 'center' });
  },

  // 检查元素是否在视口中
  isInViewport: (element: Element): boolean => {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }
};

// 事件工具
export const eventUtils = {
  // 添加事件监听器
  addEventListener: <K extends keyof WindowEventMap>(
    target: EventTarget,
    type: K,
    listener: (event: WindowEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void => {
    target.addEventListener(type, listener as EventListener, options);
  },

  // 移除事件监听器
  removeEventListener: <K extends keyof WindowEventMap>(
    target: EventTarget,
    type: K,
    listener: (event: WindowEventMap[K]) => void,
    options?: boolean | EventListenerOptions
  ): void => {
    target.removeEventListener(type, listener as EventListener, options);
  },

  // 阻止默认行为
  preventDefault: (event: Event): void => {
    event.preventDefault();
  },

  // 阻止事件冒泡
  stopPropagation: (event: Event): void => {
    event.stopPropagation();
  },

  // 阻止默认行为和事件冒泡
  stopEvent: (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();
  },

  // 创建自定义事件
  createCustomEvent: <T = any>(type: string, detail?: T): CustomEvent<T | undefined> => {
    return new CustomEvent(type, { detail });
  },

  // 触发自定义事件
  dispatchCustomEvent: <T = any>(target: EventTarget, type: string, detail?: T): boolean => {
    const event = eventUtils.createCustomEvent(type, detail);
    return target.dispatchEvent(event);
  },

  // 节流函数
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void => {
    let timeoutId: NodeJS.Timeout | null = null;
    let lastExecTime = 0;
    
    return (...args: Parameters<T>) => {
      const currentTime = Date.now();
      
      if (currentTime - lastExecTime > delay) {
        func(...args);
        lastExecTime = currentTime;
      } else {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          func(...args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  },

  // 防抖函数
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void => {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }
};

// 键盘工具
export const keyboardUtils = {
  // 检查是否按下特定键
  isKeyPressed: (event: KeyboardEvent, key: string): boolean => {
    return event.key === key || event.code === key;
  },

  // 检查是否按下组合键
  isComboPressed: (
    event: KeyboardEvent,
    combo: {
      key: string;
      ctrl?: boolean;
      alt?: boolean;
      shift?: boolean;
      meta?: boolean;
    }
  ): boolean => {
    return (
      keyboardUtils.isKeyPressed(event, combo.key) &&
      event.ctrlKey === (combo.ctrl || false) &&
      event.altKey === (combo.alt || false) &&
      event.shiftKey === (combo.shift || false) &&
      event.metaKey === (combo.meta || false)
    );
  },

  // 获取按键描述
  getKeyDescription: (event: KeyboardEvent): string => {
    const parts: string[] = [];
    
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (event.metaKey) parts.push('Meta');
    
    parts.push(event.key);
    
    return parts.join('+');
  },

  // 常用快捷键检查
  shortcuts: {
    isCopy: (event: KeyboardEvent): boolean => {
      return keyboardUtils.isComboPressed(event, { key: 'c', ctrl: true });
    },
    isPaste: (event: KeyboardEvent): boolean => {
      return keyboardUtils.isComboPressed(event, { key: 'v', ctrl: true });
    },
    isCut: (event: KeyboardEvent): boolean => {
      return keyboardUtils.isComboPressed(event, { key: 'x', ctrl: true });
    },
    isSelectAll: (event: KeyboardEvent): boolean => {
      return keyboardUtils.isComboPressed(event, { key: 'a', ctrl: true });
    },
    isUndo: (event: KeyboardEvent): boolean => {
      return keyboardUtils.isComboPressed(event, { key: 'z', ctrl: true });
    },
    isRedo: (event: KeyboardEvent): boolean => {
      return keyboardUtils.isComboPressed(event, { key: 'y', ctrl: true }) ||
             keyboardUtils.isComboPressed(event, { key: 'z', ctrl: true, shift: true });
    },
    isSave: (event: KeyboardEvent): boolean => {
      return keyboardUtils.isComboPressed(event, { key: 's', ctrl: true });
    },
    isRefresh: (event: KeyboardEvent): boolean => {
      return keyboardUtils.isKeyPressed(event, 'F5') ||
             keyboardUtils.isComboPressed(event, { key: 'r', ctrl: true });
    }
  }
};

// 动画工具
export const animationUtils = {
  // 淡入动画
  fadeIn: (element: HTMLElement, duration: number = 300): Promise<void> => {
    return new Promise((resolve) => {
      element.style.opacity = '0';
      element.style.transition = `opacity ${duration}ms ease-in-out`;
      
      requestAnimationFrame(() => {
        element.style.opacity = '1';
        setTimeout(resolve, duration);
      });
    });
  },

  // 淡出动画
  fadeOut: (element: HTMLElement, duration: number = 300): Promise<void> => {
    return new Promise((resolve) => {
      element.style.opacity = '1';
      element.style.transition = `opacity ${duration}ms ease-in-out`;
      
      requestAnimationFrame(() => {
        element.style.opacity = '0';
        setTimeout(resolve, duration);
      });
    });
  },

  // 滑入动画
  slideIn: (element: HTMLElement, direction: 'up' | 'down' | 'left' | 'right' = 'down', duration: number = 300): Promise<void> => {
    return new Promise((resolve) => {
      const transforms = {
        up: 'translateY(100%)',
        down: 'translateY(-100%)',
        left: 'translateX(100%)',
        right: 'translateX(-100%)'
      };
      
      element.style.transform = transforms[direction];
      element.style.transition = `transform ${duration}ms ease-in-out`;
      
      requestAnimationFrame(() => {
        element.style.transform = 'translate(0, 0)';
        setTimeout(resolve, duration);
      });
    });
  },

  // 滑出动画
  slideOut: (element: HTMLElement, direction: 'up' | 'down' | 'left' | 'right' = 'up', duration: number = 300): Promise<void> => {
    return new Promise((resolve) => {
      const transforms = {
        up: 'translateY(-100%)',
        down: 'translateY(100%)',
        left: 'translateX(-100%)',
        right: 'translateX(100%)'
      };
      
      element.style.transform = 'translate(0, 0)';
      element.style.transition = `transform ${duration}ms ease-in-out`;
      
      requestAnimationFrame(() => {
        element.style.transform = transforms[direction];
        setTimeout(resolve, duration);
      });
    });
  },

  // 缩放动画
  scale: (element: HTMLElement, from: number, to: number, duration: number = 300): Promise<void> => {
    return new Promise((resolve) => {
      element.style.transform = `scale(${from})`;
      element.style.transition = `transform ${duration}ms ease-in-out`;
      
      requestAnimationFrame(() => {
        element.style.transform = `scale(${to})`;
        setTimeout(resolve, duration);
      });
    });
  },

  // 弹跳动画
  bounce: (element: HTMLElement, intensity: number = 0.1, duration: number = 600): Promise<void> => {
    return new Promise((resolve) => {
      const keyframes = [
        { transform: 'scale(1)', offset: 0 },
        { transform: `scale(${1 + intensity})`, offset: 0.3 },
        { transform: `scale(${1 - intensity * 0.5})`, offset: 0.6 },
        { transform: 'scale(1)', offset: 1 }
      ];
      
      const animation = element.animate(keyframes, {
        duration,
        easing: 'ease-in-out'
      });
      
      animation.addEventListener('finish', () => resolve());
    });
  }
};

// 存储工具
export const storageUtils = {
  // 本地存储
  local: {
    set: (key: string, value: any): void => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error('Failed to set localStorage:', error);
      }
    },
    
    get: <T = any>(key: string, defaultValue?: T): T | null => {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue || null;
      } catch (error) {
        console.error('Failed to get localStorage:', error);
        return defaultValue || null;
      }
    },
    
    remove: (key: string): void => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error('Failed to remove localStorage:', error);
      }
    },
    
    clear: (): void => {
      try {
        localStorage.clear();
      } catch (error) {
        console.error('Failed to clear localStorage:', error);
      }
    }
  },

  // 会话存储
  session: {
    set: (key: string, value: any): void => {
      try {
        sessionStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error('Failed to set sessionStorage:', error);
      }
    },
    
    get: <T = any>(key: string, defaultValue?: T): T | null => {
      try {
        const item = sessionStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue || null;
      } catch (error) {
        console.error('Failed to get sessionStorage:', error);
        return defaultValue || null;
      }
    },
    
    remove: (key: string): void => {
      try {
        sessionStorage.removeItem(key);
      } catch (error) {
        console.error('Failed to remove sessionStorage:', error);
      }
    },
    
    clear: (): void => {
      try {
        sessionStorage.clear();
      } catch (error) {
        console.error('Failed to clear sessionStorage:', error);
      }
    }
  }
};

// 格式化工具
export const formatUtils = {
  // 格式化时间
  formatTime: (timestamp: number, format: 'full' | 'date' | 'time' | 'relative' = 'full'): string => {
    const date = new Date(timestamp);
    
    switch (format) {
      case 'full':
        return date.toLocaleString();
      case 'date':
        return date.toLocaleDateString();
      case 'time':
        return date.toLocaleTimeString();
      case 'relative':
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}天前`;
        if (hours > 0) return `${hours}小时前`;
        if (minutes > 0) return `${minutes}分钟前`;
        return '刚刚';
      default:
        return date.toLocaleString();
    }
  },

  // 格式化文件大小
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // 格式化数字
  formatNumber: (num: number, decimals: number = 0): string => {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  },

  // 格式化百分比
  formatPercentage: (value: number, total: number, decimals: number = 1): string => {
    const percentage = (value / total) * 100;
    return `${percentage.toFixed(decimals)}%`;
  },

  // 截断文本
  truncateText: (text: string, maxLength: number, suffix: string = '...'): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
  },

  // 高亮文本
  highlightText: (text: string, query: string, className: string = 'highlight'): string => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, `<span class="${className}">$1</span>`);
  }
};

// 验证工具
export const validationUtils = {
  // 验证邮箱
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // 验证URL
  isValidUrl: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  // 验证手机号
  isValidPhone: (phone: string): boolean => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  },

  // 验证身份证号
  isValidIdCard: (idCard: string): boolean => {
    const idCardRegex = /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/;
    return idCardRegex.test(idCard);
  },

  // 验证密码强度
  getPasswordStrength: (password: string): 'weak' | 'medium' | 'strong' => {
    let score = 0;
    
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^\w\s]/.test(password)) score++;
    
    if (score < 3) return 'weak';
    if (score < 5) return 'medium';
    return 'strong';
  }
};

// 导出所有工具
export default {
  domUtils,
  eventUtils,
  keyboardUtils,
  animationUtils,
  storageUtils,
  formatUtils,
  validationUtils
};

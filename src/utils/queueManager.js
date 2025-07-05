import Queue from './queue.js';

/**
 * QueueManager API 佇列管理器
 * 專門處理 JWT token 過期時的 API 重試機制
 */
class QueueManager {
  constructor() {
    // API 任務佇列
    this.apiQueue = new Queue();
    // 佇列狀態：'running', 'paused', 'stopped'
    this.status = 'stopped';
    // 處理中標記
    this.isProcessing = false;
  }

  /**
   * 將 API 任務加入佇列
   * @param {Object} apiTask - API 任務物件
   * @param {Function} apiTask.request - API 請求函數
   * @param {Function} apiTask.resolve - Promise resolve 函數
   * @param {Function} apiTask.reject - Promise reject 函數
   * @param {Object} apiTask.config - 請求配置
   */
  enqueue(apiTask) {
    this.apiQueue.enqueue(apiTask);
  }

  /**
   * 開始處理佇列
   */
  start() {
    this.status = 'running';
    this.processQueue();
  }

  /**
   * 暫停處理佇列
   */
  pause() {
    this.status = 'paused';
  }

  /**
   * 停止並清空佇列
   */
  stop() {
    this.status = 'stopped';
    this.clear();
  }

  /**
   * 清空佇列
   */
  clear() {
    // 拒絕所有待處理的請求
    while (!this.apiQueue.isEmpty()) {
      const task = this.apiQueue.dequeue();
      if (task && task.reject) {
        task.reject(new Error('API queue cleared'));
      }
    }
  }

  /**
   * 處理佇列中的 API 任務
   */
  async processQueue() {
    if (this.isProcessing || this.status !== 'running') {
      return;
    }

    this.isProcessing = true;

    while (!this.apiQueue.isEmpty() && this.status === 'running') {
      const task = this.apiQueue.dequeue();

      if (task) {
        try {
          const result = await task.request();
          task.resolve(result);
        } catch (error) {
          task.reject(error);
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * 獲取佇列狀態
   * @returns {Object} 佇列狀態資訊
   */
  getStatus() {
    return {
      status: this.status,
      queueSize: this.apiQueue.size(),
      isEmpty: this.apiQueue.isEmpty(),
      isProcessing: this.isProcessing
    };
  }

  /**
   * 檢查佇列是否為空
   * @returns {boolean}
   */
  isEmpty() {
    return this.apiQueue.isEmpty();
  }

  /**
   * 獲取佇列大小
   * @returns {number}
   */
  size() {
    return this.apiQueue.size();
  }
}

// 導出 QueueManager 類別
export default QueueManager;

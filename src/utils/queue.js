/**
 * Queue 佇列資料結構
 * 實作先進先出 (FIFO) 的資料結構
 */
class Queue {
  constructor() {
    this.items = [];
  }

  /**
   * 將元素加入佇列尾部
   * @param {*} element - 要加入的元素
   */
  enqueue(element) {
    this.items.push(element);
  }

  /**
   * 從佇列前端移除並返回元素
   * @returns {*} 移除的元素，如果佇列為空則返回 undefined
   */
  dequeue() {
    if (this.isEmpty()) {
      return undefined;
    }
    return this.items.shift();
  }

  /**
   * 查看佇列前端的元素，但不移除它
   * @returns {*} 前端元素，如果佇列為空則返回 undefined
   */
  front() {
    if (this.isEmpty()) {
      return undefined;
    }
    return this.items[0];
  }

  /**
   * 查看佇列尾部的元素，但不移除它
   * @returns {*} 尾部元素，如果佇列為空則返回 undefined
   */
  rear() {
    if (this.isEmpty()) {
      return undefined;
    }
    return this.items[this.items.length - 1];
  }

  /**
   * 檢查佇列是否為空
   * @returns {boolean} 如果佇列為空返回 true，否則返回 false
   */
  isEmpty() {
    return this.items.length === 0;
  }

  /**
   * 獲取佇列的大小
   * @returns {number} 佇列中元素的數量
   */
  size() {
    return this.items.length;
  }

  /**
   * 清空佇列
   */
  clear() {
    this.items = [];
  }

  /**
   * 獲取佇列的所有元素（不修改原佇列）
   * @returns {Array} 佇列的副本
   */
  toArray() {
    return [...this.items];
  }

  /**
   * 檢查佇列中是否包含指定元素
   * @param {*} element - 要檢查的元素
   * @returns {boolean} 如果包含該元素返回 true，否則返回 false
   */
  contains(element) {
    return this.items.includes(element);
  }

  /**
   * 獲取指定元素在佇列中的位置
   * @param {*} element - 要查找的元素
   * @returns {number} 元素的索引位置，如果不存在返回 -1
   */
  indexOf(element) {
    return this.items.indexOf(element);
  }

  /**
   * 將佇列轉換為字串表示
   * @returns {string} 佇列的字串表示
   */
  toString() {
    return `Queue: [${this.items.join(', ')}]`;
  }

  /**
   * 迭代器支援 - 讓佇列可以被 for...of 迴圈使用
   */
  [Symbol.iterator]() {
    let index = 0;
    const items = this.items;

    return {
      next() {
        if (index < items.length) {
          return { value: items[index++], done: false };
        } else {
          return { done: true };
        }
      }
    };
  }
}

// 導出 Queue 類別
export default Queue;

// 也可以作為 CommonJS 模組導出
// module.exports = Queue;

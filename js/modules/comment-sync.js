/**
 * 评论同步模块
 * 负责在主页显示留言板的最新评论
 */

class CommentSync {
  constructor() {
    this.apiBaseUrl = window.API_CONFIG?.baseUrl || 'https://blog.hanverse.pub/.netlify/functions';
    this.cache = new Map(); // 添加缓存机制
    this.cacheTimestamp = 0;
    this.CACHE_DURATION = 300000; // 缓存5分钟
  }

  /**
   * 获取最新评论
   * @param {number} limit 获取评论数量，默认3条
   * @returns {Promise<Array>} 评论数组
   */
  async getLatestComments(limit = 3, forceRefresh = false) {
    try {
      const cacheKey = `comments_${limit}`;
      const now = Date.now();
      
      // 检查缓存（非强制刷新且缓存未过期）
      if (!forceRefresh && this.cache.has(cacheKey) && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
        console.log('使用缓存的评论数据');
        return this.cache.get(cacheKey);
      }
      
      let apiUrl = `${this.apiBaseUrl}/get-comments?page=1&limit=${limit}`;
      const headers = {};
      
      if (forceRefresh) {
        apiUrl += `&_t=${Date.now()}`;
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        headers['Pragma'] = 'no-cache';
        headers['Expires'] = '0';
      }
      
      console.log('正在获取评论，API地址:', apiUrl);
      
      const response = await fetch(apiUrl, { headers });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API返回的原始数据:', data);
      
      if (!data || !Array.isArray(data.comments)) {
        console.warn('API返回的数据格式不正确:', data);
        return [];
      }
      
      const comments = data.comments || [];
      
      // 存储到缓存
      this.cache.set(cacheKey, comments);
      this.cacheTimestamp = now;
      
      console.log('成功获取评论数量:', comments.length);
      return comments;
    } catch (error) {
      console.error('获取最新评论失败:', error);
      console.error('错误详情:', {
        message: error.message,
        stack: error.stack,
        apiUrl: `${this.apiBaseUrl}/get-comments?page=1&limit=${limit}`
      });
      return [];
    }
  }

  /**
   * 格式化评论时间
   * @param {string} dateString 时间字符串
   * @returns {string} 格式化后的时间
   */
  formatCommentTime(dateString) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      
      if (diffInMinutes < 1) return '刚刚';
      if (diffInMinutes < 60) return `${diffInMinutes}分钟前`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}小时前`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}天前`;
      
      // 超过7天显示具体日期
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '最近';
    }
  }

  /**
   * 截取评论内容
   * @param {string} content 评论内容
   * @param {number} maxLength 最大长度
   * @returns {string} 截取后的内容
   */
  truncateContent(content, maxLength = 50) {
    // 确保content是字符串类型
    if (!content || typeof content !== 'string') {
      return '内容加载中...';
    }
    
    if (content.length <= maxLength) {
      return this.escapeHtml(content);
    }
    return this.escapeHtml(content.substring(0, maxLength)) + '...';
  }

  /**
   * HTML转义函数
   * @param {string} text 需要转义的文本
   * @returns {string} 转义后的文本
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 渲染最新评论到主页
   * @param {Array} comments 评论数组
   * @param {string} containerId 容器ID
   */
  renderCommentsToHomepage(comments, containerId = 'latest-comments-container') {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn('未找到最新评论容器');
      return;
    }

    if (comments.length === 0) {
      container.innerHTML = '<div class="text-muted text-center">暂无评论</div>';
      return;
    }

    const commentsHtml = comments.map(comment => {
      try {
        // 验证评论数据的完整性
        if (!comment || !comment.username || !comment.createdAt) {
          console.warn('评论数据不完整:', comment);
          return '';
        }
        
        const timeAgo = this.formatCommentTime(comment.createdAt);
        const shortContent = this.truncateContent(comment.content);
        const safeUsername = this.escapeHtml(comment.username);
        
        return `
          <div class="mb-3">
            <div style="font-weight: bold;">${safeUsername}</div>
            <p class="mb-1" style="font-size: 0.9rem;">${shortContent}</p>
            <small style="opacity: 0.7; color: #666;">
              ${timeAgo} · 
              <span style="color: #999;">来自留言板</span>
            </small>
          </div>
        `;
      } catch (error) {
        console.error('渲染评论时出错:', error, comment);
        return '';
      }
    }).filter(html => html !== '').join('');

    container.innerHTML = commentsHtml;
  }

  /**
   * 初始化主页评论显示
   */
  async initHomepageComments(forceRefresh = false) {
    try {
      console.log('开始初始化主页评论, forceRefresh:', forceRefresh);
      const comments = await this.getLatestComments(3, forceRefresh);
      console.log('获取到的评论数据:', comments);
      
      if (!comments || comments.length === 0) {
        console.log('没有获取到评论数据，显示默认消息');
      }
      
      this.renderCommentsToHomepage(comments);
      console.log('评论渲染完成');
    } catch (error) {
      console.error('初始化主页评论失败:', error);
      // 显示错误信息给用户
      const container = document.getElementById('latest-comments-container');
      if (container) {
        container.innerHTML = '<div class="text-muted text-center">评论加载失败，请稍后重试</div>';
      }
    }
  }

  /**
   * 刷新主页评论
   */
  async refreshHomepageComments() {
    // 清除缓存，确保获取最新数据
    this.cache.clear();
    this.cacheTimestamp = 0;
    console.log('已清除评论缓存，开始强制刷新');
    await this.initHomepageComments(true);
  }
}

// 创建全局实例
window.CommentSync = new CommentSync();

// 如果在主页，自动初始化
if (window.location.pathname === '/' || window.location.pathname.includes('index.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      const commentUpdateTime = localStorage.getItem('commentUpdated');
      if (commentUpdateTime) {
        localStorage.removeItem('commentUpdated');
        window.CommentSync.initHomepageComments(true);
      } else {
        window.CommentSync.initHomepageComments();
      }
    }, 500);
  });
  
  // 监听localStorage变化，当其他页面发表评论时自动刷新
  window.addEventListener('storage', (e) => {
    if (e.key === 'commentUpdated' && e.newValue) {
      setTimeout(() => {
        window.CommentSync.refreshHomepageComments();
      }, 1000);
    }
  });
}

// 导出模块（如果支持ES6模块）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CommentSync;
}
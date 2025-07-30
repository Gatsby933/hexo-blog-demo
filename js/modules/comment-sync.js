/**
 * 评论同步模块
 * 负责在主页显示留言板的最新评论
 */

class CommentSync {
  constructor() {
    this.apiBaseUrl = window.API_CONFIG?.baseUrl || 'https://clever-mermaid-713c96.netlify.app/.netlify/functions';
  }

  /**
   * 获取最新评论
   * @param {number} limit 获取评论数量，默认3条
   * @returns {Promise<Array>} 评论数组
   */
  async getLatestComments(limit = 3, forceRefresh = false) {
    try {
      let apiUrl = `${this.apiBaseUrl}/get-comments?page=1&limit=${limit}`;
      if (forceRefresh) {
        apiUrl += `&_t=${Date.now()}`;
      }
      console.log('获取最新评论API URL:', apiUrl, forceRefresh ? '(强制刷新)' : '');
      
      const headers = {};
      if (forceRefresh) {
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        headers['Pragma'] = 'no-cache';
        headers['Expires'] = '0';
      }
      
      const response = await fetch(apiUrl, { headers });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.comments || [];
    } catch (error) {
      console.error('获取最新评论失败:', error);
      return [];
    }
  }

  /**
   * 格式化评论时间，精确到分钟
   * @param {string} dateString 时间字符串
   * @returns {string} 格式化后的时间
   */
  formatCommentTime(dateString) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMs = now - date;
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      
      if (diffInMinutes < 1) {
        return '刚刚';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes}分钟前`;
      } else if (diffInHours < 24) {
        return `${diffInHours}小时前`;
      } else if (diffInDays === 1) {
        return '1天前';
      } else if (diffInDays < 7) {
        return `${diffInDays}天前`;
      } else {
        // 超过7天显示具体日期和时间，精确到分钟
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
      }
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
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength) + '...';
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
      const timeAgo = this.formatCommentTime(comment.createdAt);
      const shortContent = this.truncateContent(comment.content);
      
      return `
        <div class="mb-3">
          <div style="font-weight: bold;">@${comment.username}</div>
          <p class="mb-1" style="font-size: 0.9rem;">${shortContent}</p>
          <small style="opacity: 0.7; color: #666;">
            ${timeAgo} · 
            <span style="color: #999;">来自留言板</span>
          </small>
        </div>
      `;
    }).join('');

    container.innerHTML = commentsHtml;
  }

  /**
   * 初始化主页评论显示
   */
  async initHomepageComments(forceRefresh = false) {
    try {
      const comments = await this.getLatestComments(3, forceRefresh);
      this.renderCommentsToHomepage(comments);
    } catch (error) {
      console.error('初始化主页评论失败:', error);
    }
  }

  /**
   * 刷新主页评论
   */
  async refreshHomepageComments() {
    await this.initHomepageComments(true);
  }
}

// 创建全局实例
window.CommentSync = new CommentSync();

// 如果在主页，自动初始化
if (window.location.pathname === '/' || window.location.pathname.includes('index.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    // 延迟初始化，确保API配置已加载
    setTimeout(() => {
      // 检查是否有新评论需要刷新
      const hasNewComment = localStorage.getItem('commentUpdated');
      if (hasNewComment) {
        // 清除标记并强制刷新
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
      console.log('检测到评论更新，刷新主页评论');
      setTimeout(() => {
        window.CommentSync.refreshHomepageComments();
      }, 1000); // 延迟1秒确保数据已保存
    }
  });
}

// 导出模块（如果支持ES6模块）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CommentSync;
}
/**
 * 统一的响应处理工具
 * 减少代码重复，提供一致的响应格式
 */
const { addCorsHeaders } = require('./cors');

/**
 * 创建标准化的成功响应
 * @param {Object} data - 响应数据
 * @param {number} statusCode - HTTP状态码，默认200
 * @param {Object} headers - 额外的响应头
 * @param {Object} event - 请求事件对象
 * @returns {Object} 格式化的响应对象
 */
function createSuccessResponse(data, statusCode = 200, headers = {}, event) {
  return addCorsHeaders({
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(data)
  }, event);
}

/**
 * 创建标准化的错误响应
 * @param {string} message - 错误消息
 * @param {number} statusCode - HTTP状态码，默认500
 * @param {Error} error - 原始错误对象（可选）
 * @param {Object} event - 请求事件对象
 * @returns {Object} 格式化的错误响应对象
 */
function createErrorResponse(message, statusCode = 500, error = null, event) {
  const errorData = {
    message,
    ...(process.env.NODE_ENV === 'development' && error && {
      error: error.message,
      stack: error.stack
    })
  };

  return addCorsHeaders({
    statusCode,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(errorData)
  }, event);
}

/**
 * 验证HTTP方法
 * @param {string} method - 当前请求方法
 * @param {string|Array} allowedMethods - 允许的方法
 * @param {Object} event - 请求事件对象
 * @returns {Object|null} 如果方法不允许返回错误响应，否则返回null
 */
function validateHttpMethod(method, allowedMethods, event) {
  const allowed = Array.isArray(allowedMethods) ? allowedMethods : [allowedMethods];
  if (!allowed.includes(method)) {
    return createErrorResponse('方法不允许', 405, null, event);
  }
  return null;
}

/**
 * 验证必需的字段
 * @param {Object} data - 要验证的数据对象
 * @param {Array} requiredFields - 必需字段数组
 * @param {Object} event - 请求事件对象
 * @returns {Object|null} 如果验证失败返回错误响应，否则返回null
 */
function validateRequiredFields(data, requiredFields, event) {
  const missingFields = requiredFields.filter(field => !data[field]);
  if (missingFields.length > 0) {
    return createErrorResponse(
      `缺少必需字段: ${missingFields.join(', ')}`,
      400,
      null,
      event
    );
  }
  return null;
}

/**
 * 通用的异步处理器包装器
 * @param {Function} handler - 处理函数
 * @returns {Function} 包装后的处理函数
 */
function asyncHandler(handler) {
  return async (event, context) => {
    try {
      return await handler(event, context);
    } catch (error) {
      console.error('处理请求时发生错误:', error);
      return createErrorResponse('服务器内部错误', 500, error, event);
    }
  };
}

module.exports = {
  createSuccessResponse,
  createErrorResponse,
  validateHttpMethod,
  validateRequiredFields,
  asyncHandler
};
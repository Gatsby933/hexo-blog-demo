const { connectToDatabase } = require('./utils/mongodb');
const { handleOptions } = require('./utils/cors');
const { createSuccessResponse, createErrorResponse, validateHttpMethod, asyncHandler } = require('./utils/response');
const crypto = require('crypto');

exports.handler = asyncHandler(async (event, context) => {
  // 处理OPTIONS请求
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions(event);
  }

  // 验证HTTP方法
  const methodError = validateHttpMethod(event.httpMethod, 'GET', event);
  if (methodError) return methodError;

  // 获取查询参数
  const queryParams = event.queryStringParameters || {};
  const page = Math.max(1, parseInt(queryParams.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(queryParams.limit) || 10)); // 限制每页最多50条
  const skip = (page - 1) * limit;
  const isForceRefresh = !!queryParams._t;

  // 连接数据库
  const { db } = await connectToDatabase();
  const comments = db.collection('comments');

  // 优化查询性能
  const [totalComments, commentsList] = await Promise.all([
    // 使用估算计数提高性能
    comments.estimatedDocumentCount(),
    comments
      .find({}, {
        projection: {
          _id: 0,
          username: 1,
          content: 1,
          createdAt: 1,
          avatar: 1
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()
  ]);

  // 格式化评论数据并优化头像URL
  const formattedComments = commentsList.map(comment => {
    let avatarUrl = comment.avatar || '/images/avatar.svg';
    
    // 头像URL处理 - 保持相对路径，让前端根据当前域名解析
    // 不再强制转换为完整URL，以支持本地开发和线上环境
    
    return {
      ...comment,
      avatar: avatarUrl,
      createdAt: comment.createdAt.toISOString()
    };
  });

  // 缓存控制
  const cacheControl = isForceRefresh ? 
    'no-cache, no-store, must-revalidate' : 
    'public, max-age=300';
  
  // ETag生成
  const etag = `"${crypto.createHash('md5')
    .update(JSON.stringify(formattedComments) + totalComments)
    .digest('hex')}"`;
  
  // 检查客户端缓存
  if (event.headers['if-none-match'] === etag && !isForceRefresh) {
    return {
      statusCode: 304,
      headers: {
        'Cache-Control': cacheControl,
        'ETag': etag
      }
    };
  }

  // 构建响应数据
  const responseData = {
    comments: formattedComments,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalComments / limit),
      totalComments,
      hasNextPage: page < Math.ceil(totalComments / limit),
      hasPrevPage: page > 1
    }
  };

  // 响应头
  const headers = {
    'Cache-Control': cacheControl,
    'ETag': etag,
    'Last-Modified': formattedComments.length > 0 ? 
      new Date(formattedComments[0].createdAt).toUTCString() : 
      new Date().toUTCString(),
    ...(isForceRefresh && { 'Pragma': 'no-cache', 'Expires': '0' })
  };

  return createSuccessResponse(responseData, 200, headers, event);
});
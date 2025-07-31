const { connectToDatabase } = require('./utils/mongodb');
const { handleOptions } = require('./utils/cors');
const { createSuccessResponse, createErrorResponse, validateHttpMethod, asyncHandler } = require('./utils/response');

exports.handler = asyncHandler(async (event, context) => {
  // 处理OPTIONS请求
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions(event);
  }

  // 验证HTTP方法
  const methodError = validateHttpMethod(event.httpMethod, 'GET', event);
  if (methodError) return methodError;

  // 连接数据库
  const { db } = await connectToDatabase();
  const comments = db.collection('comments');

  // 获取所有评论
  const allComments = await comments.find({}, {
    projection: {
      replies: 1
    }
  }).toArray();

  // 计算总数：主评论数 + 所有回复数
  let totalCount = allComments.length; // 主评论数
  
  // 累加所有回复数
  allComments.forEach(comment => {
    if (comment.replies && Array.isArray(comment.replies)) {
      totalCount += comment.replies.length;
    }
  });

  // 返回总数
  const responseData = {
    totalCount
  };

  // 设置缓存头
  const headers = {
    'Cache-Control': 'public, max-age=300', // 缓存5分钟
  };

  return createSuccessResponse(responseData, 200, headers, event);
});
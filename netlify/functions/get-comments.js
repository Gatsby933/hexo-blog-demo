const { connectToDatabase } = require('./utils/mongodb');
const { addCorsHeaders, handleOptions } = require('./utils/cors');

exports.handler = async (event, context) => {
  // 处理OPTIONS请求
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions(event);
  }

  // 只允许GET请求
  if (event.httpMethod !== 'GET') {
    return addCorsHeaders({
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: '方法不允许' })
    }, event);
  }

  try {
    // 获取查询参数
    const queryParams = event.queryStringParameters || {};
    const page = parseInt(queryParams.page) || 1;
    const limit = parseInt(queryParams.limit) || 10;
    const skip = (page - 1) * limit;

    // 连接数据库
    const { db } = await connectToDatabase();
    const comments = db.collection('comments');

    // 获取评论总数
    const totalComments = await comments.countDocuments();

    // 获取评论列表（按创建时间倒序排列，最新的在前）
    const commentsList = await comments
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // 格式化日期，保留完整的时间信息
    const formattedComments = commentsList.map(comment => ({
      ...comment,
      createdAt: comment.createdAt.toISOString() // 保留完整的ISO时间格式
    }));

    // 检查是否为强制刷新请求
    const isForceRefresh = event.queryStringParameters && event.queryStringParameters._t;
    const cacheControl = isForceRefresh ? 
      'no-cache, no-store, must-revalidate' : 
      'public, max-age=300, s-maxage=600';
    
    return addCorsHeaders({
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': cacheControl,
        'ETag': `"comments-${totalComments}-${page}"`, // 基于评论数量和页码生成ETag
        'Last-Modified': formattedComments.length > 0 ? new Date(formattedComments[0].createdAt).toUTCString() : new Date().toUTCString(),
        ...(isForceRefresh && { 'Pragma': 'no-cache', 'Expires': '0' })
      },
      body: JSON.stringify({
        comments: formattedComments,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalComments / limit),
          totalComments,
          hasNextPage: page < Math.ceil(totalComments / limit),
          hasPrevPage: page > 1
        }
      })
    }, event);

  } catch (error) {
    console.error('获取评论错误:', error.message);
    console.error('错误堆栈:', error.stack);
    return addCorsHeaders({
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        message: '服务器错误',
        error: process.env.NODE_ENV === 'development' ? error.message : '内部服务器错误'
      })
    }, event);
  }
};
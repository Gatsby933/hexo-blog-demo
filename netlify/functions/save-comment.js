const { connectToDatabase } = require('./utils/mongodb');
const { addCorsHeaders, handleOptions } = require('./utils/cors');

exports.handler = async (event, context) => {
  // 处理OPTIONS请求
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions(event);
  }

  // 只允许POST请求
  if (event.httpMethod !== 'POST') {
    return addCorsHeaders({
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: '方法不允许' })
    }, event);
  }

  try {
    const { username, avatar, content, createdAt } = JSON.parse(event.body);

    // 验证输入
    if (!username || !content) {
      return addCorsHeaders({
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: '用户名和评论内容都是必需的' })
      }, event);
    }

    // 连接数据库
    const { db } = await connectToDatabase();
    const comments = db.collection('comments');

    // 创建新评论
    const newComment = {
      username,
      avatar: avatar || './images/avatar.svg',
      content,
      createdAt: createdAt ? new Date(createdAt) : new Date(), // 使用前端传递的时间戳，如果没有则使用当前时间
      likes: 0,
      likedBy: []
    };

    const result = await comments.insertOne(newComment);

    return addCorsHeaders({
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate', // 禁止缓存POST请求
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      body: JSON.stringify({
        message: '评论保存成功',
        comment: {
          _id: result.insertedId,
          ...newComment
        }
      })
    }, event);

  } catch (error) {
    console.error('保存评论错误:', error.message);
    console.error('错误堆栈:', error.stack);
    
    // 确保返回JSON格式的错误响应
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
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
      body: JSON.stringify({ message: '方法不允许' })
    });
  }

  try {
    const { username, avatar, content } = JSON.parse(event.body);

    // 验证输入
    if (!username || !content) {
      return addCorsHeaders({
        statusCode: 400,
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
      createdAt: new Date(),
      likes: 0,
      likedBy: []
    };

    const result = await comments.insertOne(newComment);

    return addCorsHeaders({
      statusCode: 201,
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
    return addCorsHeaders({
      statusCode: 500,
      body: JSON.stringify({ 
        message: '服务器错误',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }, event);
  }
};
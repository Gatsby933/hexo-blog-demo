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
    console.log('开始创建数据库索引...');
    
    // 连接数据库
    const { db } = await connectToDatabase();
    const comments = db.collection('comments');
    
    // 创建索引以提高查询性能
    const indexes = [
      // 按创建时间倒序索引（用于评论列表查询）
      { createdAt: -1 },
      // 复合索引：用户名和创建时间（用于用户评论查询）
      { username: 1, createdAt: -1 },
      // 用户名索引（用于用户相关查询）
      { username: 1 }
    ];
    
    const results = [];
    for (const index of indexes) {
      try {
        const result = await comments.createIndex(index);
        results.push({ index, result, status: 'success' });
        console.log('索引创建成功:', index, result);
      } catch (error) {
        if (error.code === 85) {
          // 索引已存在
          results.push({ index, status: 'exists', message: '索引已存在' });
          console.log('索引已存在:', index);
        } else {
          results.push({ index, status: 'error', error: error.message });
          console.error('索引创建失败:', index, error.message);
        }
      }
    }
    
    return addCorsHeaders({
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: '索引创建完成',
        results
      })
    }, event);
    
  } catch (error) {
    console.error('创建索引错误:', error.message);
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
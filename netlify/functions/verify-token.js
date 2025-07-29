const { connectToDatabase, ObjectId } = require('./utils/mongodb');
const { verifyToken, getTokenFromHeader } = require('./utils/auth');
const { handleOptions, addCorsHeaders } = require('./utils/cors');

exports.handler = async (event, context) => {
  // 处理预检请求
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions(event);
  }
  // 只允许GET请求
  if (event.httpMethod !== 'GET') {
    return addCorsHeaders({
      statusCode: 405,
      body: JSON.stringify({ message: '方法不允许' })
    }, event);
  }

  try {
    // 从请求头获取令牌
    const token = getTokenFromHeader(event);
    if (!token) {
      return addCorsHeaders({
      statusCode: 401,
      body: JSON.stringify({ message: '未提供认证令牌' })
    }, event);
    }

    // 验证令牌
    const { valid, decoded, error } = verifyToken(token);
    console.log('令牌验证结果:', { valid, decoded, error });
    if (!valid) {
      return addCorsHeaders({
      statusCode: 401,
      body: JSON.stringify({ message: '无效的令牌', error })
    }, event);
    }

    // 连接数据库
    const { db } = await connectToDatabase();
    const users = db.collection('users');

    // 查找用户
    console.log('查找用户ID:', decoded.userId);
    const user = await users.findOne({ _id: new ObjectId(decoded.userId) });
    if (!user) {
      return addCorsHeaders({
      statusCode: 401,
      body: JSON.stringify({ message: '用户不存在' })
    }, event);
    }

    // 返回用户信息
    return addCorsHeaders({
      statusCode: 200,
      body: JSON.stringify({
        message: '令牌有效',
        user: {
          id: user._id,  // 使用id而不是_id，与login.js保持一致
          username: user.username,
          email: user.email
        }
      })
    }, event);
  } catch (error) {
    console.error('验证令牌时出错：', error);
    return addCorsHeaders({
      statusCode: 500,
      body: JSON.stringify({
        message: '服务器内部错误',
        error: error.message
      })
    }, event);
  }
};
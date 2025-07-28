const { connectToDatabase } = require('./utils/mongodb');
const { verifyToken, getTokenFromHeader } = require('./utils/auth');

exports.handler = async (event, context) => {
  // 只允许GET请求
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: '方法不允许' })
    };
  }

  try {
    // 从请求头获取令牌
    const token = getTokenFromHeader(event);
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: '未提供认证令牌' })
      };
    }

    // 验证令牌
    const { valid, decoded, error } = verifyToken(token);
    if (!valid) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: '无效的令牌', error })
      };
    }

    // 连接数据库
    const { db } = await connectToDatabase();
    const users = db.collection('users');

    // 查找用户
    const user = await users.findOne({ _id: decoded.userId });
    if (!user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: '用户不存在' })
      };
    }

    // 返回用户信息
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: '令牌有效',
        user: {
          id: user._id,
          username: user.username
        }
      })
    };

  } catch (error) {
    console.error('验证令牌错误:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: '服务器错误' })
    };
  }
};
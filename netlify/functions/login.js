const { connectToDatabase } = require('./utils/mongodb');
const { verifyPassword, generateToken } = require('./utils/auth');
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
    }, event);
  }

  try {
    const { username, password } = JSON.parse(event.body);

    // 验证输入
    if (!username || !password) {
      return addCorsHeaders({
        statusCode: 400,
        body: JSON.stringify({ message: '用户名和密码都是必需的' })
      }, event);
    }

    // 连接数据库
    const { db } = await connectToDatabase();
    const users = db.collection('users');

    // 查找用户
    const user = await users.findOne({ username });
    if (!user) {
      return addCorsHeaders({
      statusCode: 401,
      body: JSON.stringify({ message: '用户名或密码错误' })
    }, event);
    }

    // 验证密码
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return addCorsHeaders({
        statusCode: 401,
        body: JSON.stringify({ message: '用户名或密码错误' })
      }, event);
    }

    // 生成JWT令牌
    const token = generateToken(user);

    // 返回用户信息和令牌
    return addCorsHeaders({
      statusCode: 200,
      body: JSON.stringify({
        message: '登录成功',
        token,
        user: {
          id: user._id,
          username: user.username
        }
      })
    }, event);

  } catch (error) {
    console.error('登录错误:', error);
    return addCorsHeaders({
      statusCode: 500,
      body: JSON.stringify({ message: '服务器错误' })
    }, event);
  }
};
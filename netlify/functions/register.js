const { connectToDatabase } = require('./utils/mongodb');
const { hashPassword } = require('./utils/auth');
const { addCorsHeaders, handleOptions } = require('./utils/cors');

exports.handler = async (event, context) => {
  // 处理OPTIONS请求
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  // 只允许POST请求
  if (event.httpMethod !== 'POST') {
    return addCorsHeaders({
      statusCode: 405,
      body: JSON.stringify({ message: '方法不允许' })
    });
  }

  try {
    const { username, password } = JSON.parse(event.body);

    // 验证输入
    if (!username || !password) {
      return addCorsHeaders({
        statusCode: 400,
        body: JSON.stringify({ message: '用户名和密码都是必需的' })
      });
    }

    // 连接数据库
    const { db } = await connectToDatabase();
    const users = db.collection('users');

    // 检查用户名是否已存在
    const existingUser = await users.findOne({ username });
    if (existingUser) {
      return addCorsHeaders({
      statusCode: 409,
      body: JSON.stringify({ message: '用户名已存在' })
    });
    }

    // 加密密码
    const hashedPassword = await hashPassword(password);

    // 创建新用户
    const result = await users.insertOne({
      username,
      password: hashedPassword,
      createdAt: new Date()
    });

    return addCorsHeaders({
      statusCode: 201,
      body: JSON.stringify({
        message: '注册成功',
        user: {
          username: result.username,
          _id: result._id
        }
      })
    });

  } catch (error) {
    console.error('注册错误:', error.message);
    console.error('错误堆栈:', error.stack);
    return addCorsHeaders({
      statusCode: 500,
      body: JSON.stringify({ 
        message: '服务器错误',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    });
  }
};
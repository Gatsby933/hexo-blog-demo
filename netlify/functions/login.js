const { connectToDatabase } = require('./utils/mongodb');
const { verifyPassword, generateToken } = require('./utils/auth');
const { handleOptions } = require('./utils/cors');
const { createSuccessResponse, createErrorResponse, validateHttpMethod, validateRequiredFields, asyncHandler } = require('./utils/response');

exports.handler = asyncHandler(async (event, context) => {
  // 处理OPTIONS请求
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions(event);
  }

  // 验证HTTP方法
  const methodError = validateHttpMethod(event.httpMethod, 'POST', event);
  if (methodError) return methodError;

  // 解析请求体
  const { username, password } = JSON.parse(event.body);

  // 验证必需字段
  const validationError = validateRequiredFields(
    { username, password },
    ['username', 'password'],
    event
  );
  if (validationError) return validationError;

  // 连接数据库
  const { db } = await connectToDatabase();
  const users = db.collection('users');

  // 查找用户
  const user = await users.findOne({ username: username.trim() });
  if (!user) {
    return createErrorResponse('用户名或密码错误', 401, null, event);
  }

  // 验证密码
  const isValidPassword = await verifyPassword(password, user.password);
  if (!isValidPassword) {
    return createErrorResponse('用户名或密码错误', 401, null, event);
  }

  // 生成JWT令牌
  const token = generateToken(user);

  // 返回用户信息和令牌
  return createSuccessResponse({
    message: '登录成功',
    token,
    user: {
      id: user._id,
      username: user.username,
      avatar: user.avatar || null
    }
  }, 200, {}, event);
});
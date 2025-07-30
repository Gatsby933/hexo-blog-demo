const { connectToDatabase } = require('./utils/mongodb');
const { hashPassword, validateUsername } = require('./utils/auth');
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

  // 验证用户名格式
  if (!validateUsername(username)) {
    return createErrorResponse('用户名只能包含字母、数字和下划线，长度为3-20个字符', 400, null, event);
  }

  // 验证密码长度
  if (password.length < 6) {
    return createErrorResponse('密码长度不能少于6个字符', 400, null, event);
  }

  // 连接数据库
  const { db } = await connectToDatabase();
  const users = db.collection('users');

  // 检查用户名是否已存在
  const existingUser = await users.findOne({ username: username.trim() });
  if (existingUser) {
    return createErrorResponse('用户名已存在', 409, null, event);
  }

  // 加密密码
  const hashedPassword = await hashPassword(password);

  // 创建新用户
  const result = await users.insertOne({
    username: username.trim(),
    password: hashedPassword,
    createdAt: new Date()
  });

  return createSuccessResponse({
    message: '注册成功',
    user: {
      username: username.trim(),
      _id: result.insertedId
    }
  }, 201, {}, event);
});
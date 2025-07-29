const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// 生成JWT令牌
const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// 验证JWT令牌
const verifyToken = (token) => {
  try {
    console.log('验证令牌:', token.substring(0, 10) + '...');
    console.log('使用密钥:', process.env.JWT_SECRET);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('令牌解码成功:', decoded);
    return { valid: true, decoded };
  } catch (error) {
    console.error('令牌验证失败:', error.message);
    return { valid: false, error: error.message };
  }
};

// 从请求头获取令牌
const getTokenFromHeader = (headers) => {
  const authHeader = headers.authorization || headers.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

// 哈希密码
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// 验证密码
const verifyPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// 验证用户名格式
const validateUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

module.exports = {
  generateToken,
  verifyToken,
  getTokenFromHeader,
  hashPassword,
  verifyPassword,
  validateUsername
};
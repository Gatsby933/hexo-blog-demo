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

// 从请求头中获取令牌
const getTokenFromHeader = (event) => {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
};

// 密码加密
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// 密码验证
const verifyPassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

module.exports = {
  generateToken,
  verifyToken,
  getTokenFromHeader,
  hashPassword,
  verifyPassword
};
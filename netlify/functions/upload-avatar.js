const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const { addCorsHeaders, handleOptions } = require('./utils/cors');
const { saveBase64Avatar, deleteOldAvatar } = require('./save-avatar');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'hexo_blog';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

exports.handler = async (event, context) => {
  // 处理 OPTIONS 请求
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions(event);
  }

  // 只允许 POST 请求
  if (event.httpMethod !== 'POST') {
    return addCorsHeaders({
      statusCode: 405,
      body: JSON.stringify({ message: '方法不被允许' })
    }, event);
  }

  try {
    // 验证请求体
    if (!event.body) {
      return addCorsHeaders({
        statusCode: 400,
        body: JSON.stringify({ message: '请求体不能为空' })
      }, event);
    }

    const { avatar } = JSON.parse(event.body);
    
    if (!avatar) {
      return addCorsHeaders({
        statusCode: 400,
        body: JSON.stringify({ message: '头像数据不能为空' })
      }, event);
    }

    // 验证JWT令牌
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return addCorsHeaders({
        statusCode: 401,
        body: JSON.stringify({ message: '未提供有效的认证令牌' })
      }, event);
    }

    const token = authHeader.substring(7);
    let decoded;
    
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return addCorsHeaders({
        statusCode: 401,
        body: JSON.stringify({ message: '无效的认证令牌' })
      }, event);
    }

    // 连接数据库
    const client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 60000,
      connectTimeoutMS: 60000,
      socketTimeoutMS: 60000
    });
    
    try {
      await client.connect();
      const db = client.db(DB_NAME);
      const users = db.collection('users');

      // 获取当前用户信息（用于删除旧头像）
      const currentUser = await users.findOne({ _id: new ObjectId(decoded.userId) });
      if (!currentUser) {
        return addCorsHeaders({
          statusCode: 404,
          body: JSON.stringify({ message: '用户不存在' })
        }, event);
      }

      // 保存头像数据到用户表
      let avatarData;
      try {
        avatarData = await saveBase64Avatar(avatar, decoded.userId);
      } catch (avatarError) {
        return addCorsHeaders({
          statusCode: 400,
          body: JSON.stringify({ message: avatarError.message })
        }, event);
      }

      // 获取更新后的用户信息
      const updatedUser = await users.findOne({ _id: new ObjectId(decoded.userId) });

      return addCorsHeaders({
        statusCode: 200,
        body: JSON.stringify({
          message: '头像更新成功',
          user: {
            id: updatedUser._id,
            username: updatedUser.username,
            avatar: updatedUser.avatar
          }
        })
      }, event);
    } finally {
       await client.close();
     }

  } catch (error) {
    console.error('头像上传错误:', error);
    return addCorsHeaders({
      statusCode: 500,
      body: JSON.stringify({ message: '服务器错误' })
    }, event);
  }
};
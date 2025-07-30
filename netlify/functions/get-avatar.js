const { connectToDatabase } = require('./utils/mongodb');
const { handleOptions } = require('./utils/cors');
const { createErrorResponse, validateHttpMethod, asyncHandler } = require('./utils/response');

// 支持的图片MIME类型
const MIME_TYPES = {
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp'
};

exports.handler = asyncHandler(async (event, context) => {
  // 处理 OPTIONS 请求
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions(event);
  }

  // 验证HTTP方法
  const methodError = validateHttpMethod(event.httpMethod, 'GET', event);
  if (methodError) return methodError;

  // 从路径中提取头像ID
  const pathParts = event.path.split('/');
  const avatarId = pathParts[pathParts.length - 1];
  
  if (!avatarId) {
    return createErrorResponse('缺少头像ID', 400, null, event);
  }

  // 验证头像ID格式（安全检查）
  if (!/^[a-f0-9]+_[a-f0-9]+$/i.test(avatarId)) {
    return createErrorResponse('无效的头像ID格式', 400, null, event);
  }

  // 连接数据库并查找头像数据
  const { db } = await connectToDatabase();
  const avatars = db.collection('avatars');
  
  const avatar = await avatars.findOne({ _id: avatarId });
  
  if (!avatar) {
    return createErrorResponse('头像不存在', 404, null, event);
  }

  // 解析base64数据
  const matches = avatar.data.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    return createErrorResponse('头像数据格式错误', 500, null, event);
  }

  const imageType = matches[1];
  const imageData = matches[2];
  const mimeType = MIME_TYPES[imageType.toLowerCase()] || 'application/octet-stream';

  // 返回头像内容
  return {
    statusCode: 200,
    headers: {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=31536000', // 缓存1年
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, OPTIONS'
    },
    body: imageData,
    isBase64Encoded: true
  };
});
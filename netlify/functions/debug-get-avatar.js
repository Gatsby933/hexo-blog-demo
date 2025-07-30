const { connectToDatabase } = require('./utils/mongodb');
const { handleOptions } = require('./utils/cors');
const { createErrorResponse, createSuccessResponse, validateHttpMethod, asyncHandler } = require('./utils/response');

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

  // 调试信息收集
  const debugInfo = {
    timestamp: new Date().toISOString(),
    eventPath: event.path,
    eventRawUrl: event.rawUrl,
    eventQueryStringParameters: event.queryStringParameters,
    eventHeaders: event.headers,
    pathParts: event.path ? event.path.split('/') : [],
    pathPartsLength: event.path ? event.path.split('/').length : 0
  };

  // 从路径中提取头像ID
  const pathParts = event.path.split('/');
  const avatarId = pathParts[pathParts.length - 1];
  
  debugInfo.extractedAvatarId = avatarId;
  debugInfo.lastPathPart = pathParts[pathParts.length - 1];
  debugInfo.secondLastPathPart = pathParts[pathParts.length - 2];
  
  if (!avatarId) {
    debugInfo.error = '缺少头像ID';
    return createSuccessResponse(debugInfo, 200, {}, event);
  }

  // 验证头像ID格式（安全检查）
  const isValidFormat = /^[a-f0-9]+_[a-f0-9]+$/i.test(avatarId);
  debugInfo.idFormatValid = isValidFormat;
  
  if (!isValidFormat) {
    debugInfo.error = '无效的头像ID格式';
    const parts = avatarId.split('_');
    debugInfo.idParts = {
      userIdPart: parts[0],
      hashPart: parts[1],
      userIdLength: parts[0] ? parts[0].length : 0,
      hashLength: parts[1] ? parts[1].length : 0
    };
    return createSuccessResponse(debugInfo, 200, {}, event);
  }

  try {
    // 连接数据库并查找头像数据
    const { db } = await connectToDatabase();
    const avatars = db.collection('avatars');
    
    debugInfo.databaseConnected = true;
    
    const avatar = await avatars.findOne({ _id: avatarId });
    
    debugInfo.avatarFound = !!avatar;
    
    if (!avatar) {
      debugInfo.error = '头像不存在';
      
      // 查找相似的头像ID
      const similarAvatars = await avatars.find({
        _id: { $regex: new RegExp(avatarId.split('_')[0], 'i') }
      }).limit(5).toArray();
      
      debugInfo.similarAvatars = similarAvatars.map(a => ({
        id: a._id,
        userId: a.userId,
        createdAt: a.createdAt
      }));
      
      return createSuccessResponse(debugInfo, 200, {}, event);
    }

    // 解析base64数据
    const matches = avatar.data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      debugInfo.error = '头像数据格式错误';
      debugInfo.avatarDataPreview = avatar.data ? avatar.data.substring(0, 100) : null;
      return createSuccessResponse(debugInfo, 200, {}, event);
    }

    const imageType = matches[1];
    const imageData = matches[2];
    const mimeType = MIME_TYPES[imageType.toLowerCase()] || 'application/octet-stream';

    debugInfo.success = true;
    debugInfo.avatarInfo = {
      id: avatar._id,
      userId: avatar.userId,
      imageType: avatar.imageType,
      detectedImageType: imageType,
      mimeType: mimeType,
      createdAt: avatar.createdAt,
      size: avatar.size,
      dataLength: avatar.data.length,
      base64DataLength: imageData.length
    };

    // 如果查询参数包含debug=true，返回调试信息而不是图片
    if (event.queryStringParameters && event.queryStringParameters.debug === 'true') {
      return createSuccessResponse(debugInfo, 200, {}, event);
    }

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
    
  } catch (dbError) {
    debugInfo.databaseError = dbError.message;
    debugInfo.error = '数据库连接或查询失败';
    return createSuccessResponse(debugInfo, 200, {}, event);
  }
});
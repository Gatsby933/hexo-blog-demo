const { connectToDatabase } = require('./utils/mongodb');
const { handleOptions } = require('./utils/cors');
const { createErrorResponse, createSuccessResponse, validateHttpMethod, asyncHandler } = require('./utils/response');

exports.handler = asyncHandler(async (event, context) => {
  // 处理 OPTIONS 请求
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions(event);
  }

  // 验证HTTP方法
  const methodError = validateHttpMethod(event.httpMethod, 'GET', event);
  if (methodError) return methodError;

  try {
    // 连接数据库
    const { db } = await connectToDatabase();
    const avatars = db.collection('avatars');
    
    // 从查询参数获取头像ID
    const avatarId = event.queryStringParameters?.id;
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      avatarId: avatarId,
      databaseConnected: true
    };
    
    if (avatarId) {
      // 查找特定头像
      const avatar = await avatars.findOne({ _id: avatarId });
      debugInfo.avatarFound = !!avatar;
      
      if (avatar) {
        debugInfo.avatarInfo = {
          id: avatar._id,
          userId: avatar.userId,
          imageType: avatar.imageType,
          createdAt: avatar.createdAt,
          size: avatar.size,
          dataLength: avatar.data ? avatar.data.length : 0,
          dataPreview: avatar.data ? avatar.data.substring(0, 50) + '...' : null
        };
      }
      
      // 验证头像ID格式
      const isValidFormat = /^[a-f0-9]+_[a-f0-9]+$/i.test(avatarId);
      debugInfo.idFormatValid = isValidFormat;
      
      if (!isValidFormat) {
        const parts = avatarId.split('_');
        debugInfo.idParts = {
          userIdPart: parts[0],
          hashPart: parts[1],
          userIdLength: parts[0] ? parts[0].length : 0,
          hashLength: parts[1] ? parts[1].length : 0
        };
      }
    } else {
      // 列出所有头像记录（限制数量）
      const allAvatars = await avatars.find({}).limit(10).toArray();
      debugInfo.totalAvatars = await avatars.countDocuments();
      debugInfo.sampleAvatars = allAvatars.map(avatar => ({
        id: avatar._id,
        userId: avatar.userId,
        imageType: avatar.imageType,
        createdAt: avatar.createdAt,
        size: avatar.size
      }));
    }
    
    return createSuccessResponse(debugInfo, 200, {}, event);
    
  } catch (error) {
    console.error('数据库调试错误:', error);
    return createErrorResponse('数据库调试失败: ' + error.message, 500, error, event);
  }
});
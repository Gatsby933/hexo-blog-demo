const crypto = require('crypto');
const { connectToDatabase } = require('./utils/mongodb');
const { addCorsHeaders, handleOptions } = require('./utils/cors');

// 压缩图片质量
function compressBase64Image(base64Data, quality = 0.7) {
  // 这里可以实现图片压缩逻辑
  // 为了简化，我们先直接返回原数据，但限制大小
  const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    throw new Error('无效的base64图片格式');
  }
  
  const imageData = matches[2];
  const buffer = Buffer.from(imageData, 'base64');
  
  // 如果图片过大，抛出错误要求用户压缩
  if (buffer.length > 500 * 1024) { // 500KB限制
    throw new Error('头像文件过大，请选择小于500KB的图片或使用图片压缩工具');
  }
  
  return base64Data;
}

// 将base64数据存储到数据库并返回URL
async function saveBase64Avatar(base64Data, userId) {
  try {
    // 压缩图片数据
    const compressedData = compressBase64Image(base64Data);
    
    // 解析base64数据
    const matches = compressedData.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      throw new Error('无效的base64图片格式');
    }
    
    const imageType = matches[1];
    
    // 验证图片类型
    const allowedTypes = ['jpeg', 'jpg', 'png', 'gif', 'webp'];
    if (!allowedTypes.includes(imageType.toLowerCase())) {
      throw new Error('不支持的图片格式');
    }
    
    // 生成唯一ID
    const timestamp = Date.now();
    const hash = crypto.createHash('md5').update(userId + timestamp).digest('hex').substring(0, 8);
    const avatarId = `${userId}_${hash}`;
    
    // 连接数据库并保存头像数据
    const { db } = await connectToDatabase();
    const avatars = db.collection('avatars');
    
    await avatars.insertOne({
      _id: avatarId,
      userId: userId,
      data: compressedData,
      imageType: imageType,
      createdAt: new Date(),
      size: Buffer.from(matches[2], 'base64').length
    });
    
    // 返回头像URL
    return `/api/avatar/${avatarId}`;
    
  } catch (error) {
    console.error('保存头像数据错误:', error);
    throw error;
  }
}

// 删除旧的头像数据
async function deleteOldAvatar(avatarUrl) {
  try {
    if (avatarUrl && avatarUrl.startsWith('/api/avatar/')) {
      const avatarId = avatarUrl.split('/').pop();
      
      const { db } = await connectToDatabase();
      const avatars = db.collection('avatars');
      
      const result = await avatars.deleteOne({ _id: avatarId });
      if (result.deletedCount > 0) {
        console.log('已删除旧头像数据:', avatarId);
      }
    }
  } catch (error) {
    console.error('删除旧头像数据错误:', error);
  }
}

module.exports = {
  saveBase64Avatar,
  deleteOldAvatar
};

// 如果直接调用此文件，提供HTTP接口
exports.handler = async (event, context) => {
  // 处理 OPTIONS 请求
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions(event);
  }

  return addCorsHeaders({
    statusCode: 405,
    body: JSON.stringify({ message: '此接口仅供内部调用' })
  }, event);
};
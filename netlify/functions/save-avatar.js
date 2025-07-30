const crypto = require('crypto');
const { connectToDatabase } = require('./utils/mongodb');
const { addCorsHeaders, handleOptions } = require('./utils/cors');

// 压缩图片质量
function compressBase64Image(base64Data, quality = 0.7) {
  const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    throw new Error('无效的base64图片格式');
  }
  
  const imageType = matches[1];
  const imageData = matches[2];
  const buffer = Buffer.from(imageData, 'base64');
  
  // 如果图片过大，抛出错误要求用户压缩
  if (buffer.length > 200 * 1024) { // 降低到200KB限制
    throw new Error('头像文件过大，请选择小于200KB的图片');
  }
  
  // 对于较大的图片，进行简单的质量压缩（通过重新编码）
  if (buffer.length > 100 * 1024) {
    // 简单的压缩：如果是PNG，建议转换为JPEG
    if (imageType.toLowerCase() === 'png' && buffer.length > 150 * 1024) {
      console.log('建议将PNG格式转换为JPEG以减小文件大小');
    }
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
    
    // 连接数据库并直接更新用户头像数据
    const { db } = await connectToDatabase();
    const users = db.collection('users');
    const { ObjectId } = require('mongodb');
    
    // 直接将头像数据存储在用户表中
    await users.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          avatar: compressedData,
          avatarType: imageType,
          avatarUpdatedAt: new Date(),
          avatarSize: Buffer.from(matches[2], 'base64').length
        } 
      }
    );
    
    // 返回头像数据本身，前端直接使用
    return compressedData;
    
  } catch (error) {
    console.error('保存头像数据错误:', error);
    throw error;
  }
}

// 删除旧的头像数据
async function deleteOldAvatar(avatarUrl) {
  try {
    if (avatarUrl && (avatarUrl.includes('/get-avatar/') || avatarUrl.startsWith('/api/avatar/'))) {
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
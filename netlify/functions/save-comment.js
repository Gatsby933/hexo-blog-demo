const { connectToDatabase } = require('./utils/mongodb');
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
  const { username, avatar, content, createdAt, parentCommentId, replyToUser } = JSON.parse(event.body);

  // 验证必需字段
  const validationError = validateRequiredFields(
    { username, content },
    ['username', 'content'],
    event
  );
  if (validationError) return validationError;

  // 内容长度验证
  if (content.length > 1000) {
    return createErrorResponse('评论内容不能超过1000个字符', 400, null, event);
  }

  // 连接数据库
  const { db } = await connectToDatabase();
  const comments = db.collection('comments');

  // 如果是回复评论，添加到父评论的replies数组中
  if (parentCommentId) {
    try {
      const { ObjectId } = require('mongodb');
      
      console.log('处理回复评论，parentCommentId:', parentCommentId);
      
      const replyData = {
        _id: new ObjectId(), // 使用MongoDB ObjectId生成唯一ID
        username: username.trim(),
        avatar: avatar || '/images/avatar.svg',
        content: content.trim(),
        createdAt: createdAt ? new Date(createdAt) : new Date(),
        likes: 0,
        likedBy: [],
        replyToUser: replyToUser ? replyToUser.trim() : ''
      };

      console.log('创建回复数据:', replyData);

      // 更新父评论，添加回复到replies数组
      let parentId;
      try {
        // 尝试转换为ObjectId，如果失败则直接使用字符串
        parentId = ObjectId.isValid(parentCommentId) ? new ObjectId(parentCommentId) : parentCommentId;
        console.log('转换后的parentId:', parentId);
      } catch (error) {
        console.log('ObjectId转换失败，使用原始ID:', parentCommentId);
        parentId = parentCommentId;
      }

      // 首先确保父评论存在replies字段
      const initResult = await comments.updateOne(
        { _id: parentId, replies: { $exists: false } },
        { $set: { replies: [] } }
      );
      console.log('初始化replies字段结果:', initResult);

      // 然后添加回复到replies数组
       const updateResult = await comments.updateOne(
         { _id: parentId },
         { $push: { replies: replyData } }
       );
       console.log('添加回复结果:', updateResult);

       if (updateResult.matchedCount === 0) {
         return createErrorResponse('父评论不存在', 404, null, event);
       }
     } catch (replyError) {
       console.error('处理回复时发生错误:', replyError);
       throw replyError;
     }

    // 响应头
    const headers = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };

    return createSuccessResponse({
      message: '回复保存成功',
      comment: replyData
    }, 201, headers, event);
  } else {
    // 创建新的主评论
    const newComment = {
      username: username.trim(),
      avatar: avatar || '/images/avatar.svg',
      content: content.trim(),
      createdAt: createdAt ? new Date(createdAt) : new Date(),
      likes: 0,
      likedBy: [],
      replies: [] // 初始化replies数组
    };

    const result = await comments.insertOne(newComment);

    // 响应头
    const headers = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };

    return createSuccessResponse({
      message: '评论保存成功',
      comment: {
        _id: result.insertedId,
        ...newComment
      }
    }, 201, headers, event);
  }
});
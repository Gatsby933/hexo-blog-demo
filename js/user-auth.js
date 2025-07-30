/**
 * 用户认证管理模块
 * 包含用户登录、注册、令牌验证和界面更新等功能
 */

// API请求工具函数
const apiRequest = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
  
  try {
    const response = await fetch(`${window.API_CONFIG.baseUrl}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      mode: 'cors',
      signal: controller.signal,
      ...options
    });
    
    clearTimeout(timeoutId);
    
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('解析响应失败:', jsonError);
      throw new Error('服务器响应格式错误');
    }
    
    if (!response.ok) {
      throw new Error(data.message || '请求失败');
    }
    
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接');
    }
    throw error;
  }
};

// 用户管理对象
const UserManager = {
  // 注册新用户
  async saveUser(username, password) {
    try {
      return await apiRequest('/register', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
    } catch (error) {
      throw new Error('注册失败：' + error.message);
    }
  },
  
  // 验证用户登录
  async verifyUser(username, password) {
    try {
      if (!username || !password) {
        throw new Error('用户名和密码不能为空');
      }

      const data = await apiRequest('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      // 验证响应数据格式
      if (!data || !data.user || !data.user.username || !data.token) {
        throw new Error('服务器返回的数据格式不正确');
      }

      return data;
    } catch (error) {
      console.error('登录错误：', error);
      throw new Error('登录失败：' + error.message);
    }
  },
  
  // 获取当前登录用户
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('currentUser');
      if (!userStr) return null;
      
      const user = JSON.parse(userStr);
      if (!user?.username) {
        localStorage.removeItem('currentUser');
        return null;
      }
      
      // 检查并修复头像URL格式，确保使用相对路径
      if (user.avatar && user.avatar.includes('blog.hanverse.pub/.netlify/functions/')) {
        user.avatar = user.avatar.replace(/https?:\/\/[^/]*/, '');
        // 更新localStorage中的数据
        localStorage.setItem('currentUser', JSON.stringify(user));
        console.log('已修复localStorage中的头像URL格式为相对路径');
      }
      
      return user;
    } catch (error) {
      console.error('获取用户数据失败：', error);
      localStorage.removeItem('currentUser');
      localStorage.removeItem('token');
      return null;
    }
  },
  
  // 获取令牌
  getToken() {
    try {
      return localStorage.getItem('token') || null;
    } catch (error) {
      console.error('获取token失败：', error);
      return null;
    }
  },
  
  // 设置当前登录用户
  setCurrentUser(data) {
    try {
      if (data === null) {
        // 检查调用栈，看是否是从logout函数调用的
        const stack = new Error().stack;
        if (stack?.includes('logout')) {
          localStorage.removeItem('token');
          localStorage.removeItem('currentUser');
        }
        return;
      }
      
      // 处理两种数据格式：{token, user} 或直接的用户对象
      if (data?.token && data?.user?.username) {
        localStorage.setItem('token', data.token);
        // 处理头像URL，确保保存相对路径
        const userData = { ...data.user };
        if (userData.avatar && userData.avatar.includes('blog.hanverse.pub/.netlify/functions/')) {
          userData.avatar = userData.avatar.replace(/https?:\/\/[^/]*/, '');
        }
        localStorage.setItem('currentUser', JSON.stringify(userData));
      } else if (data?.username) {
        const existingToken = localStorage.getItem('token');
        if (existingToken) {
          // 处理头像URL，确保保存相对路径
          const userData = { ...data };
          if (userData.avatar && userData.avatar.includes('blog.hanverse.pub/.netlify/functions/')) {
            userData.avatar = userData.avatar.replace(/https?:\/\/[^/]*/, '');
          }
          localStorage.setItem('currentUser', JSON.stringify(userData));
        }
      }
    } catch (error) {
      console.error('保存用户数据失败：', error);
    }
  },
  
  // 验证令牌
  async verifyToken() {
    const token = this.getToken();
    if (!token) {
      console.log('没有找到令牌，用户未登录');
      return null;
    }

    try {
      const data = await apiRequest('/verify-token', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (data?.user?.username && data?.user?.id) {
        console.log('令牌验证成功，用户数据:', data.user);
        return data.user;
      } else {
        console.error('令牌验证返回的用户数据无效:', data);
        this.logout();
        return null;
      }
    } catch (error) {
      console.error('令牌验证失败:', error.message);
      
      // 网络错误时保持当前登录状态
      if (error.message.includes('超时') || error.message.includes('网络')) {
        console.warn('网络问题，保持当前登录状态');
        return this.getCurrentUser();
      }
      
      this.logout();
      return null;
    }
  },
  
  // 退出登录
  logout() {
    console.log('执行退出登录操作');
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    this.setCurrentUser(null);
    console.log('退出登录完成');
  }
};

// 登录注册功能初始化
function initAuthModals() {
  // 获取DOM元素
  const settingsBtn = document.getElementById('settingsBtn');
  const loginModalElement = document.getElementById('loginModal');
  const registerModalElement = document.getElementById('registerModal');
  const showRegisterBtn = document.getElementById('showRegisterBtn');
  const showLoginBtn = document.getElementById('showLoginBtn');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  
  // 检查必要的DOM元素是否存在
  if (!loginModalElement || !registerModalElement || !loginForm || !registerForm) {
    console.warn('认证相关元素不存在，无法初始化认证功能');
    return;
  }
  
  // 创建模态框对象
  const loginModal = new bootstrap.Modal(loginModalElement);
  const registerModal = new bootstrap.Modal(registerModalElement);
  
  // 检查登录状态并更新界面
  function updateAuthUI() {
      try {
        console.log('开始更新认证UI...');
        // 检查settingsBtn元素是否存在
        if (!settingsBtn) {
          console.warn('settingsBtn元素不存在，无法更新UI');
          return;
        }
        
        // 首先检查localStorage中的数据作为备份
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('currentUser');
        
        let currentUser = UserManager.getCurrentUser();
        let token = UserManager.getToken();
        
        // 如果内存中的数据不完整，尝试从localStorage恢复
        if ((!currentUser || !token) && storedToken && storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser && parsedUser.username) {
              console.log('从localStorage恢复用户数据:', parsedUser.username);
              currentUser = parsedUser;
              token = storedToken;
            }
          } catch (parseError) {
            console.error('解析localStorage用户数据失败:', parseError);
          }
        }
        
        console.log('当前用户数据:', currentUser);
        console.log('当前令牌:', token ? token.substring(0, 10) + '...' : 'null');
      
      const settingsDropdown = document.getElementById('settingsDropdown');
      const loginOption = document.getElementById('loginOption');
      const logoutBtn = document.getElementById('logoutBtn');
      const changeAvatarBtn = document.getElementById('changeAvatarBtn');
      const userInfoDisplay = document.getElementById('userInfoDisplay');
      
      console.log('UI元素状态:', {
        settingsDropdown: !!settingsDropdown,
        loginOption: !!loginOption,
        logoutBtn: !!logoutBtn,
        changeAvatarBtn: !!changeAvatarBtn,
        userInfoDisplay: !!userInfoDisplay
      });
      
      if (currentUser && typeof currentUser === 'object' && currentUser.username && token) {
        // 用户已登录
        console.log('用户已登录，更新UI为已登录状态:', currentUser.username);
        
        // 显示用户头像或默认图标
        if (currentUser.avatar) {
          // 处理头像URL，确保使用相对路径适配当前环境
          let avatarUrl = currentUser.avatar;
          // 使用相对路径，通过Cloudflare路由到正确的服务
          // 添加时间戳避免缓存问题
          avatarUrl = avatarUrl + '?t=' + Date.now();
          settingsBtn.innerHTML = `<img src="${avatarUrl}" alt="用户头像" onerror="console.error('头像加载失败:', this.src); this.src='./images/avatar.svg';">`;
        } else {
          settingsBtn.innerHTML = '<i class="fa fa-user"></i>';
        }
        settingsBtn.title = `当前用户：${currentUser.username}`;
        console.log('已更新设置按钮显示头像或用户图标');
        
        // 更新头像悬停提示
        const avatarTooltip = document.getElementById('avatarTooltip');
        if (avatarTooltip) {
          avatarTooltip.textContent = currentUser.username;
          console.log('已更新头像悬停提示:', currentUser.username);
        }
        
        // 更新设置下拉菜单
        if (settingsDropdown) {
          console.log('更新设置下拉菜单...');
          if (loginOption) {
            loginOption.style.display = 'none';
            console.log('隐藏登录选项');
          }
          if (logoutBtn) {
            logoutBtn.style.display = 'block';
            console.log('显示登出按钮');
          }
          if (changeAvatarBtn) {
            changeAvatarBtn.style.display = 'block';
            console.log('显示修改头像按钮');
          }
          if (userInfoDisplay) {
            userInfoDisplay.style.display = 'block';
            userInfoDisplay.textContent = `欢迎，${currentUser.username}`;
            console.log('显示用户信息:', userInfoDisplay.textContent);
          }
        } else {
          console.log('未找到设置下拉菜单元素');
        }
      } else {
        // 用户数据不完整或未登录，但不要立即清除登录状态
        console.log('用户数据不完整或未登录，检查localStorage状态');
        
        // 检查localStorage中是否还有有效的用户数据
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('currentUser');
        
        if (storedToken && storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser && parsedUser.username) {
              console.log('发现localStorage中有有效用户数据，恢复登录状态');
              // 恢复用户数据而不是清除
              if (parsedUser.avatar) {
              // 处理头像URL，确保使用相对路径适配当前环境
              let avatarUrl = parsedUser.avatar;
              // 使用相对路径，通过Cloudflare路由到正确的服务
              // 添加时间戳避免缓存问题
              avatarUrl = avatarUrl + '?t=' + Date.now();
              settingsBtn.innerHTML = `<img src="${avatarUrl}" alt="用户头像" onerror="console.error('头像加载失败:', this.src); this.src='./images/avatar.svg';">`;
            } else {
              settingsBtn.innerHTML = '<i class="fa fa-user"></i>';
            }
              settingsBtn.title = `当前用户：${parsedUser.username}`;
              console.log('已恢复用户头像显示');
              return; // 提前返回，不执行下面的清除逻辑
            }
          } catch (parseError) {
            console.error('解析localStorage用户数据失败:', parseError);
          }
        }
        
        // 确实没有有效的用户数据，但不清除内存中的登录状态，只重置UI
        console.log('确认用户未登录，重置UI（但保留内存状态）');
        // 注释掉这行，避免意外清除登录状态
        // UserManager.setCurrentUser(null);
        settingsBtn.innerHTML = '<i class="fa fa-cog"></i>';
        settingsBtn.title = '设置';
        console.log('已更新设置按钮为设置图标');
        
        // 隐藏头像悬停提示
        const avatarTooltip = document.getElementById('avatarTooltip');
        if (avatarTooltip) {
          console.log('已隐藏头像悬停提示');
        }
        
        // 更新设置下拉菜单
        if (settingsDropdown) {
          console.log('更新设置下拉菜单为未登录状态...');
          if (loginOption) {
            loginOption.style.display = 'block';
            console.log('显示登录选项');
          }
          if (logoutBtn) {
            logoutBtn.style.display = 'none';
            console.log('隐藏登出按钮');
          }
          if (changeAvatarBtn) {
            changeAvatarBtn.style.display = 'none';
            console.log('隐藏修改头像按钮');
          }
          if (userInfoDisplay) {
            userInfoDisplay.style.display = 'none';
            console.log('隐藏用户信息');
          }
        } else {
          console.log('未找到设置下拉菜单元素');
        }
      }
      console.log('认证UI更新完成');
    } catch (error) {
      console.error('更新UI失败：', error);
      console.error('错误堆栈:', error.stack);
      // 不要因为UI更新失败就清除登录状态，可能只是DOM元素暂时不可用
      console.log('UI更新失败，但保持用户登录状态');
      
      // 检查settingsBtn元素是否存在，如果存在则尝试基本的UI恢复
      if (settingsBtn) {
        try {
          const currentUser = UserManager.getCurrentUser();
          const token = UserManager.getToken();
          if (currentUser && typeof currentUser === 'object' && currentUser.username && token) {
            // 用户已登录，恢复基本的头像显示
            if (currentUser.avatar) {
              // 处理头像URL，确保使用相对路径适配当前环境
              let avatarUrl = currentUser.avatar;
              // 使用相对路径，通过Cloudflare路由到正确的服务
              // 添加时间戳避免缓存问题
              avatarUrl = avatarUrl + '?t=' + Date.now();
              settingsBtn.innerHTML = `<img src="${avatarUrl}" alt="用户头像" onerror="console.error('头像加载失败:', this.src); this.src='./images/avatar.svg';">`;
            } else {
              settingsBtn.innerHTML = '<i class="fa fa-user"></i>';
            }
            settingsBtn.title = `当前用户：${currentUser.username}`;
            console.log('已恢复基本的用户头像显示');
          } else {
            // 确实没有用户登录
            settingsBtn.innerHTML = '<i class="fa fa-cog"></i>';
            settingsBtn.title = '设置';
          }
        } catch (recoveryError) {
          console.error('UI恢复也失败了:', recoveryError);
          // 最后的保险措施
          settingsBtn.innerHTML = '<i class="fa fa-cog"></i>';
          settingsBtn.title = '设置';
        }
      }
    }
  }
  
  // 初始化头像更换模态框和下拉菜单
  const avatarModalElement = document.getElementById('avatarModal');
  const avatarInput = document.getElementById('avatarInput');
  const avatarPreview = document.getElementById('avatarPreview');
  const previewContainer = document.getElementById('previewContainer');
  const confirmAvatarBtn = document.getElementById('confirmAvatarBtn');
  const cancelAvatarBtn = document.getElementById('cancelAvatarBtn');
  const changeAvatarBtn = document.getElementById('changeAvatarBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const settingsDropdown = document.getElementById('settingsDropdown');
  
  // 检查头像模态框元素是否存在
  let avatarModal = null;
  if (avatarModalElement) {
    avatarModal = new bootstrap.Modal(avatarModalElement);
  } else {
    console.warn('头像模态框元素不存在');
  }

  // 设置按钮点击事件
  if (settingsBtn) {
    settingsBtn.addEventListener('click', function(e) {
      try {
        const currentUser = UserManager.getCurrentUser();
        if (!currentUser || typeof currentUser !== 'object' || !currentUser.username) {
          // 未登录时显示登录模态框并阻止下拉菜单打开
          e.preventDefault();
          e.stopPropagation();
          loginModal.show();
          return false; // 阻止事件冒泡
        }
        // 已登录状态，让Bootstrap处理下拉菜单
        console.log('用户已登录，显示下拉菜单');
      } catch (error) {
        console.error('处理设置按钮点击事件失败：', error);
        e.preventDefault();
        e.stopPropagation();
        loginModal.show();
      }
    });
  }

  // 头像预览
  if (avatarInput && avatarPreview && previewContainer) {
    avatarInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          avatarPreview.src = e.target.result;
          previewContainer.classList.remove('d-none');
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // 更换头像按钮点击事件
  if (changeAvatarBtn && settingsDropdown && avatarInput && previewContainer && avatarModal) {
    changeAvatarBtn.addEventListener('click', function(e) {
      e.preventDefault();
      settingsDropdown.classList.remove('show');
      // 清理可能存在的模态框遮罩
      document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.remove();
      });
      // 重置头像上传状态
      avatarInput.value = '';
      previewContainer.classList.add('d-none');
      // 显示模态框
      setTimeout(() => {
        avatarModal.show();
      }, 100);
    });
  }

  // 确认更换头像
  if (confirmAvatarBtn && avatarInput && avatarModal) {
    confirmAvatarBtn.addEventListener('click', async function() {
      const file = avatarInput.files[0];
      if (!file) {
        alert('请先选择要上传的头像图片');
        return;
      }

    try {
      const token = UserManager.getToken();
      if (!token) {
        alert('请先登录');
        avatarModal.hide();
        const modalBackdrop = document.querySelector('.modal-backdrop');
        if (modalBackdrop) {
          modalBackdrop.remove();
        }
        return;
      }

      // 验证token - 增加超时和重试机制
      console.log('开始验证token用于头像更换...');
      let verifyResponse;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          console.log(`Token验证尝试 ${retryCount + 1}/${maxRetries}`);
          
          // 创建带超时的fetch请求
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时
          
          verifyResponse = await fetch(`${window.API_CONFIG.baseUrl}/verify-token`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            mode: 'cors',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          console.log('Token验证响应状态:', verifyResponse.status);
          
          if (verifyResponse.ok) {
            // 验证成功，解析响应数据
            const verifyData = await verifyResponse.json();
            console.log('Token验证成功，用户数据:', verifyData);
            break; // 成功则跳出重试循环
          } else if (verifyResponse.status === 401 || verifyResponse.status === 403) {
            // 认证失败，不需要重试
            console.error('Token认证失败，状态码:', verifyResponse.status);
            break;
          } else {
            // 其他错误，可能是网络问题，继续重试
            console.warn(`Token验证失败，状态码: ${verifyResponse.status}，准备重试...`);
            retryCount++;
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒后重试
            }
          }
        } catch (error) {
          console.error(`Token验证请求失败 (尝试 ${retryCount + 1}):`, error.message);
          retryCount++;
          if (retryCount < maxRetries) {
            console.log(`等待2秒后重试...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      if (!verifyResponse || !verifyResponse.ok) {
        // token验证失败或网络问题
        const errorMsg = verifyResponse ? 
          `验证失败 (状态码: ${verifyResponse.status})` : 
          '网络连接失败，请检查网络连接';
        
        console.error('Token验证最终失败:', errorMsg);
        
        if (verifyResponse && (verifyResponse.status === 401 || verifyResponse.status === 403)) {
          // 只有在明确的认证错误时才清除登录状态
          UserManager.setCurrentUser(null);
          updateAuthUI();
          alert('登录已过期，请重新登录');
        } else {
          // 网络错误或服务器错误，不清除登录状态
          alert(`头像更换失败：${errorMsg}，请稍后重试`);
        }
        
        // 先隐藏模态框
        avatarModal.hide();
        // 延迟清理模态框遮罩，确保模态框完全关闭
        setTimeout(() => {
          // 清理可能存在的模态框遮罩
          document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.remove();
          });
        }, 300);
        return;
      }

      // 预处理图片：压缩和优化
      const processImage = (file) => {
        return new Promise((resolve, reject) => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const img = new Image();
          
          img.onload = function() {
            // 设置最大尺寸
            const maxSize = 300;
            let { width, height } = img;
            
            // 计算新尺寸，保持宽高比
            if (width > height) {
              if (width > maxSize) {
                height = (height * maxSize) / width;
                width = maxSize;
              }
            } else {
              if (height > maxSize) {
                width = (width * maxSize) / height;
                height = maxSize;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // 绘制压缩后的图片
            ctx.drawImage(img, 0, 0, width, height);
            
            // 转换为base64，使用JPEG格式以减小文件大小
            const compressedData = canvas.toDataURL('image/jpeg', 0.8);
            resolve(compressedData);
          };
          
          img.onerror = reject;
          img.src = URL.createObjectURL(file);
        });
      };
      
      try {
        console.log('开始处理图片...');
        const avatarData = await processImage(file);
        console.log('图片处理完成，开始上传...');
        
        try {
          // 上传头像到服务器 - 增加超时和重试机制
          console.log('开始上传头像...');
          let uploadResponse;
          let uploadRetryCount = 0;
          const uploadMaxRetries = 3;
          
          while (uploadRetryCount < uploadMaxRetries) {
            try {
              console.log(`头像上传尝试 ${uploadRetryCount + 1}/${uploadMaxRetries}`);
              
              // 创建带超时的fetch请求
              const uploadController = new AbortController();
              const uploadTimeoutId = setTimeout(() => uploadController.abort(), 60000); // 60秒超时
              
              uploadResponse = await fetch(`${window.API_CONFIG.baseUrl}/upload-avatar`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
                },
                credentials: 'include',
                mode: 'cors',
                body: JSON.stringify({ avatar: avatarData }),
                signal: uploadController.signal
              });
              
              clearTimeout(uploadTimeoutId);
              console.log('头像上传响应状态:', uploadResponse.status);
              
              if (uploadResponse.ok) {
                // 上传成功，跳出重试循环
                break;
              } else if (uploadResponse.status === 401 || uploadResponse.status === 403) {
                // 认证失败，不需要重试
                console.error('头像上传认证失败，状态码:', uploadResponse.status);
                break;
              } else {
                // 其他错误，可能是网络问题，继续重试
                console.warn(`头像上传失败，状态码: ${uploadResponse.status}，准备重试...`);
                uploadRetryCount++;
                if (uploadRetryCount < uploadMaxRetries) {
                  await new Promise(resolve => setTimeout(resolve, 3000)); // 等待3秒后重试
                }
              }
            } catch (uploadError) {
              console.error(`头像上传请求失败 (尝试 ${uploadRetryCount + 1}):`, uploadError.message);
              uploadRetryCount++;
              if (uploadRetryCount < uploadMaxRetries) {
                console.log(`等待3秒后重试...`);
                await new Promise(resolve => setTimeout(resolve, 3000));
              }
            }
          }

          if (!uploadResponse || !uploadResponse.ok) {
            const uploadErrorMsg = uploadResponse ? 
              `上传失败 (状态码: ${uploadResponse.status})` : 
              '网络连接失败，请检查网络连接';
            
            console.error('头像上传最终失败:', uploadErrorMsg);
            
            if (uploadResponse && (uploadResponse.status === 401 || uploadResponse.status === 403)) {
              // 认证错误
              UserManager.setCurrentUser(null);
              updateAuthUI();
              alert('登录已过期，请重新登录');
            } else {
              // 网络错误或服务器错误
              alert(`头像上传失败：${uploadErrorMsg}，请稍后重试`);
            }
          } else {
            // 上传成功，处理响应
            // 在尝试解析JSON之前先克隆Response对象
            const uploadResponseClone = uploadResponse.clone();
            
            let uploadResult;
            try {
              uploadResult = await uploadResponse.json();
              console.log('头像上传成功，服务器响应:', uploadResult);
            } catch (jsonError) {
              console.error('解析头像上传响应失败:', jsonError);
              // 使用之前克隆的Response对象获取文本
              try {
                const textResponse = await uploadResponseClone.text();
                console.log('响应文本内容:', textResponse);
                if (textResponse.includes('TimeoutErr') || textResponse.includes('timed out')) {
                  alert('头像上传失败：数据库连接超时，请稍后再试');
                  return;
                }
              } catch (textError) {
                console.error('获取响应文本失败:', textError);
              }
              alert('头像上传失败：服务器响应格式错误');
              return;
            }
            
            // 更新本地用户信息
            const currentUser = UserManager.getCurrentUser();
            if (currentUser && uploadResult.user && uploadResult.user.avatar) {
              currentUser.avatar = uploadResult.user.avatar;
              UserManager.setCurrentUser(currentUser);
              console.log('头像更新成功，新头像数据:', currentUser.avatar.substring(0, 50) + '...');
              
              // 立即更新头像显示
              const settingsBtn = document.getElementById('settingsBtn');
              if (settingsBtn && currentUser.avatar) {
                // 处理头像URL，确保使用相对路径适配当前环境
                let avatarUrl = currentUser.avatar;
                // 使用相对路径，通过Cloudflare路由到正确的服务
                // 添加时间戳避免缓存问题
                avatarUrl = avatarUrl + '?t=' + Date.now();
                settingsBtn.innerHTML = `<img src="${avatarUrl}" alt="用户头像" onerror="console.error('头像加载失败:', this.src); this.src='./images/avatar.svg';">`;
                console.log('立即更新了设置按钮头像显示，URL:', avatarUrl);
              }
              
              // 更新UI显示新头像
              console.log('准备调用updateAuthUI，当前用户状态:', currentUser);
              updateAuthUI();
              console.log('updateAuthUI调用完成，检查用户状态:', UserManager.getCurrentUser());
              
              alert('头像更换成功！');
            } else {
              console.error('服务器返回的用户数据无效:', uploadResult);
              alert('头像上传成功，但更新本地数据失败，请刷新页面');
            }
          }
        } catch (uploadError) {
          console.error('头像上传过程发生错误:', uploadError);
          alert('头像上传失败，请检查网络连接后重试');
        }
        
        // 先隐藏模态框
        avatarModal.hide();
        // 延迟清理模态框遮罩，确保模态框完全关闭
        setTimeout(() => {
          // 清理可能存在的模态框遮罩
          document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.remove();
          });
          // 重置预览
          avatarInput.value = '';
          previewContainer.classList.add('d-none');
        }, 300);
      } catch (processError) {
        console.error('图片处理失败:', processError);
        alert('图片处理失败，请选择其他图片或重试');
      }
    } catch (error) {
      console.error('头像上传失败：', error);
      alert('头像上传失败，请重试');
    }
  });
  }

  // 取消头像更换按钮点击事件
  if (cancelAvatarBtn && avatarModal && avatarInput && previewContainer) {
    cancelAvatarBtn.addEventListener('click', function() {
      // 隐藏模态框
      avatarModal.hide();
      // 延迟清理模态框遮罩，确保模态框完全关闭
      setTimeout(() => {
        // 清理可能存在的模态框遮罩
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
          backdrop.remove();
        });
        // 重置预览
        avatarInput.value = '';
        previewContainer.classList.add('d-none');
      }, 300);
    });
  }
  
  // 退出登录按钮点击事件
  if (logoutBtn && settingsDropdown && loginModal) {
    logoutBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      try {
        const currentUser = UserManager.getCurrentUser();
        if (currentUser && typeof currentUser === 'object' && currentUser.username) {
          if (confirm(`${currentUser.username}，确定要退出登录吗？`)) {
            try {
              settingsDropdown.classList.remove('show');
              await UserManager.logout();
              updateAuthUI();
              alert('已退出登录');
            } catch (error) {
              console.error('退出登录失败：', error);
              alert('退出登录失败：' + (error.message || '未知错误'));
            }
          }
        } else {
          // 如果用户数据不完整，清除登录状态并显示登录框
          UserManager.setCurrentUser(null);
          loginModal.show();
        }
    } catch (error) {
      console.error('处理退出登录失败：', error);
      // 发生错误时清除登录状态
      UserManager.setCurrentUser(null);
      loginModal.show();
    }
  });
  }
  
  // 切换到注册模态框
  if (showRegisterBtn && loginModal && registerModal) {
    showRegisterBtn.addEventListener('click', function() {
      loginModal.hide();
      setTimeout(() => {
        registerModal.show();
      }, 300);
    });
  }

  // 登录表单提交
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    if (!username || !password) {
      alert('请填写用户名和密码');
      return;
    }
    
    try {
      submitBtn.textContent = '登录中...';
      submitBtn.disabled = true;
      
      const result = await UserManager.verifyUser(username, password);
      
      if (result?.user && result?.token) {
        UserManager.setCurrentUser(result);
        updateAuthUI();
        loginModal.hide();
        alert(`欢迎回来，${result.user.username}！`);
      } else {
        throw new Error('登录响应数据格式错误');
      }
    } catch (error) {
      console.error('登录失败:', error);
      alert(error.message || '登录失败，请重试');
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });

  // 注册表单提交
  registerForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    if (!username || !password || !confirmPassword) {
      alert('请填写所有字段');
      return;
    }
    
    if (password !== confirmPassword) {
      alert('两次输入的密码不一致');
      return;
    }
    
    if (password.length < 6) {
      alert('密码长度至少6位');
      return;
    }
    
    try {
      submitBtn.textContent = '注册中...';
      submitBtn.disabled = true;
      
      const result = await UserManager.saveUser(username, password);
      
      if (result?.success) {
        alert('注册成功！请登录');
        registerModal.hide();
        setTimeout(() => loginModal.show(), 300);
        registerForm.reset();
      } else {
        throw new Error(result?.message || '注册失败');
      }
    } catch (error) {
      console.error('注册失败:', error);
      alert(error.message || '注册失败，请重试');
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
  
  // 切换到登录模态框
  if (showLoginBtn && registerModal && loginModal) {
    showLoginBtn.addEventListener('click', function() {
      registerModal.hide();
      setTimeout(() => {
        loginModal.show();
      }, 300);
    });
  }
  
  // 不在初始化时立即更新界面，等待restoreUserAuth完成后再更新
  // updateAuthUI(); // 注释掉立即调用

  // 返回更新UI函数，以便外部调用
  return updateAuthUI;
}

// 恢复用户登录状态
async function restoreUserAuth() {
  try {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('currentUser');
    
    if (!storedToken) {
      return;
    }
    
    const user = await UserManager.verifyToken();
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('token', UserManager.getToken());
      
      setTimeout(() => {
        if (typeof window.updateAuthUI === 'function') {
          window.updateAuthUI();
        } else if (typeof updateAuthUI === 'function') {
          updateAuthUI();
        }
      }, 500);
    } else if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser?.username) {
          setTimeout(() => {
            const settingsBtn = document.getElementById('settingsBtn');
            if (settingsBtn) {
              if (parsedUser.avatar) {
            // 处理头像URL，确保使用相对路径适配当前环境
            let avatarUrl = parsedUser.avatar;
            // 使用相对路径，通过Cloudflare路由到正确的服务
            // 添加时间戳避免缓存问题
            avatarUrl = avatarUrl + '?t=' + Date.now();
            settingsBtn.innerHTML = `<img src="${avatarUrl}" alt="用户头像" onerror="console.error('头像加载失败:', this.src); this.src='./images/avatar.svg';">`;
          } else {
            settingsBtn.innerHTML = '<i class="fa fa-user"></i>';
          }
              settingsBtn.title = `当前用户：${parsedUser.username}`;
            }
          }, 500);
        }
      } catch (parseError) {
        console.error('解析localStorage用户数据失败:', parseError);
      }
    }
  } catch (error) {
    console.error('验证登录状态失败:', error);
  }
}

// 导出模块
window.UserAuth = {
  UserManager,
  initAuthModals,
  restoreUserAuth
};
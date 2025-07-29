/**
 * 用户认证管理模块
 * 包含用户登录、注册、令牌验证和界面更新等功能
 */

// 用户管理对象
const UserManager = {
  // 注册新用户
  async saveUser(username, password) {
    try {
      const response = await fetch(`${window.API_CONFIG.baseUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
        mode: 'cors'
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || '注册失败');
      }

      return data;
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

      const requestUrl = `${window.API_CONFIG.baseUrl}/login`;
      console.log(`发送登录请求到: ${requestUrl}`);
      
      const requestBody = JSON.stringify({ username, password });
      console.log('请求体:', { username, password: '******' });
      
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: requestBody,
        credentials: 'include',
        mode: 'cors'
      });

      console.log('登录响应状态:', response.status);
      let data;
      try {
        data = await response.json();
        console.log('登录响应数据:', { ...data, token: data.token ? data.token.substring(0, 10) + '...' : null });
      } catch (error) {
        console.error('解析响应数据失败：', error);
        throw new Error('登录失败：服务器响应格式错误');
      }

      if (!response.ok) {
        console.error('登录请求失败：', data);
        throw new Error(data?.message || '登录失败');
      }

      if (!data || typeof data !== 'object' || !data.user || typeof data.user !== 'object' || !data.user.username || !data.token) {
        console.error('无效的登录响应数据：', data);
        throw new Error('登录失败：服务器返回的数据格式不正确');
      }

      return data;
    } catch (error) {
      console.error('登录错误：', error);
      throw new Error('登录失败：' + (error.message || '服务器错误'));
    }
  },
  
  // 获取当前登录用户
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('currentUser');
      if (!userStr) return null;
      const user = JSON.parse(userStr);
      return user || null;
    } catch (error) {
      console.error('获取用户数据失败：', error);
      // 清除可能损坏的数据
      localStorage.removeItem('currentUser');
      localStorage.removeItem('token');
      return null;
    }
  },
  
  // 获取令牌
  getToken() {
    const token = localStorage.getItem('token');
    console.log('从localStorage获取令牌:', token ? token.substring(0, 10) + '...' : 'null');
    return token;
  },
  
  // 设置当前登录用户
  setCurrentUser(data) {
    try {
      console.log('设置当前用户，接收到的数据:', data);
      if (data === null) {
        // 处理登出情况
        console.log('清除用户数据');
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        return;
      }
      
      if (data && data.token && data.user && typeof data.user === 'object') {
        console.log('解析的令牌:', data.token ? data.token.substring(0, 10) + '...' : 'null');
        console.log('解析的用户数据:', data.user);
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        
        console.log('用户数据已保存到localStorage');
        console.log('保存的令牌:', localStorage.getItem('token').substring(0, 10) + '...');
        console.log('保存的用户数据:', localStorage.getItem('currentUser'));
      } else {
        console.error('无效的用户数据格式');
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
      }
    } catch (error) {
      console.error('保存用户数据失败：', error);
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
    }
  },
  
  // 验证令牌
  async verifyToken() {
    const token = this.getToken();
    if (!token) {
      console.log('没有找到令牌，用户未登录');
      return null;
    }

    console.log('开始验证令牌:', token.substring(0, 10) + '...');
    try {
      const url = `${window.API_CONFIG.baseUrl}/verify-token`;
      console.log('验证令牌请求URL:', url);
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      console.log('验证令牌请求头:', headers);
      
      const response = await fetch(url, {
        headers,
        credentials: 'include',
        mode: 'cors'
      });
      
      console.log('验证令牌响应状态:', response.status, response.statusText);
      let data;
      try {
        data = await response.json();
        console.log('验证令牌响应数据:', data);
      } catch (jsonError) {
        console.error('解析令牌验证响应失败:', jsonError);
        this.logout();
        return null;
      }
      
      if (!response.ok) {
        console.error('令牌验证失败:', data?.message, data?.error || '');
        this.logout();
        return null;
      }
      
      // 确保返回的用户数据有效
      if (!data.user || typeof data.user !== 'object' || !data.user.username) {
        console.error('令牌验证返回的用户数据无效:', data);
        this.logout();
        return null;
      }
      
      // 额外检查用户ID
      if (!data.user.id) {
        console.error('令牌验证返回的用户数据缺少ID:', data.user);
        this.logout();
        return null;
      }
      
      console.log('令牌验证成功，用户数据:', data.user);
      return data.user;
    } catch (error) {
      console.error('令牌验证请求失败:', error);
      this.logout();
      return null;
    }
  },
  
  // 退出登录
  logout() {
    console.log('执行退出登录操作');
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    console.log('已清除localStorage中的用户数据');
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
  if (!loginModalElement || !registerModalElement) {
    console.warn('登录或注册模态框元素不存在，无法初始化认证功能');
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
      
      const currentUser = UserManager.getCurrentUser();
      const token = UserManager.getToken();
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
        settingsBtn.innerHTML = '<i class="fa fa-user"></i>';
        settingsBtn.title = `当前用户：${currentUser.username}`;
        console.log('已更新设置按钮为用户图标');
        
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
        // 用户未登录，清除登录状态
        console.log('用户未登录，重置UI');
        UserManager.setCurrentUser(null);
        settingsBtn.innerHTML = '<i class="fa fa-cog"></i>';
        settingsBtn.title = '设置';
        console.log('已更新设置按钮为设置图标');
        
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
      // 发生错误时清除登录状态
      console.log('由于UI更新失败，执行登出操作');
      UserManager.setCurrentUser(null);
      
      // 检查settingsBtn元素是否存在
      if (settingsBtn) {
        console.log('重置设置按钮为默认状态');
        settingsBtn.innerHTML = '<i class="fa fa-cog"></i>';
        settingsBtn.title = '设置';
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

      // 验证token
      const verifyResponse = await fetch(`${window.API_CONFIG.baseUrl}/verify-token`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        mode: 'cors'
      });

      if (!verifyResponse.ok) {
        // token无效，清除登录状态
        UserManager.setCurrentUser(null);
        updateAuthUI();
        alert('登录已过期，请重新登录');
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

      // TODO: 实现头像上传到服务器的逻辑
      alert('头像更换成功！');
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
  if (loginForm && loginModal) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      console.log('登录表单提交');
      const usernameInput = this.querySelector('#loginUsername');
      const passwordInput = this.querySelector('#loginPassword');
      
      if (!usernameInput || !passwordInput) {
        alert('登录表单字段不完整');
        return;
      }
      
      const username = usernameInput.value;
      const password = passwordInput.value;
      
      console.log('用户名:', username);
      console.log('密码长度:', password ? password.length : 0);
      
      // 验证必填字段
      if (!username || !password) {
        console.log('用户名或密码为空');
        alert('请填写用户名和密码');
        return;
      }

      try {
        console.log('开始验证用户:', username);
        const data = await UserManager.verifyUser(username, password);
        console.log('验证用户响应数据:', data);
        
        if (data && typeof data === 'object' && data.user && typeof data.user === 'object' && data.user.username && data.token) {
          console.log('登录成功，设置当前用户:', data.user.username);
          console.log('令牌:', data.token.substring(0, 10) + '...');
          UserManager.setCurrentUser(data);
          
          // 验证数据是否正确保存到localStorage
          const savedToken = localStorage.getItem('token');
          const savedUser = localStorage.getItem('currentUser');
          console.log('保存到localStorage的令牌:', savedToken ? savedToken.substring(0, 10) + '...' : 'null');
          console.log('保存到localStorage的用户:', savedUser);
          
          console.log('更新UI...');
          updateAuthUI();
          console.log('隐藏登录模态框...');
          loginModal.hide();
          console.log('显示欢迎消息...');
          alert(`欢迎回来，${data.user.username}！`);
        } else {
          console.error('登录失败：无效的响应数据', data);
          throw new Error('登录失败：服务器返回的数据格式不正确');
        }
      } catch (error) {
        console.error('登录失败：', error);
        alert(error.message || '登录失败，请稍后重试');
      }
    });
  }

  // 注册表单提交
  if (registerForm && registerModal && loginModal) {
    registerForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const usernameInput = this.querySelector('#registerUsername');
      const passwordInput = this.querySelector('#registerPassword');
      
      if (!usernameInput || !passwordInput) {
        alert('注册表单字段不完整');
        return;
      }
      
      const username = usernameInput.value;
      const password = passwordInput.value;
      
      const confirmPasswordInput = this.querySelector('#confirmPassword');
      if (!confirmPasswordInput) {
        alert('注册表单字段不完整');
        return;
      }
      const confirmPassword = confirmPasswordInput.value;

      if (password !== confirmPassword) {
        alert('两次输入的密码不一致');
        return;
      }

      try {
        const user = await UserManager.saveUser(username, password);
        // 注册成功后需要登录
        registerModal.hide();
        alert('注册成功！请登录您的账号。');
        setTimeout(() => {
          loginModal.show();
        }, 300);
      } catch (error) {
        alert(error.message);
      }
    });
  }
  
  // 切换到登录模态框
  if (showLoginBtn && registerModal && loginModal) {
    showLoginBtn.addEventListener('click', function() {
      registerModal.hide();
      setTimeout(() => {
        loginModal.show();
      }, 300);
    });
  }
  
  // 初始化时更新界面
  updateAuthUI();

  // 返回更新UI函数，以便外部调用
  return updateAuthUI;
}

// 恢复用户登录状态
async function restoreUserAuth() {
  console.log('开始恢复用户登录状态...');
  try {
    // 检查localStorage中是否有token
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('currentUser');
    console.log('localStorage中的令牌:', storedToken ? storedToken.substring(0, 10) + '...' : 'null');
    console.log('localStorage中的用户数据:', storedUser);
    
    if (!storedToken) {
      console.log('没有找到存储的令牌，无需恢复登录状态');
      return;
    }
    
    // 验证令牌
    console.log('开始验证令牌有效性...');
    const user = await UserManager.verifyToken();
    if (user) {
      console.log('用户登录状态已恢复:', user.username);
      // 确保用户数据和令牌都存在于localStorage中
      const token = UserManager.getToken();
      if (token) {
        // 设置当前用户数据，触发UI更新
        console.log('重新设置当前用户数据...');
        // 构造正确的数据格式 {token, user}
        UserManager.setCurrentUser({token, user});
        
        // 等待DOM完全加载
        console.log('等待DOM完全加载...');
        setTimeout(() => {
          console.log('开始更新UI...');
          // 尝试获取并调用全局的updateAuthUI函数
          if (typeof window.updateAuthUI === 'function') {
            console.log('调用全局updateAuthUI函数');
            window.updateAuthUI();
          } else if (typeof updateAuthUI === 'function') {
            console.log('调用局部updateAuthUI函数');
            updateAuthUI();
          } else {
            console.log('updateAuthUI函数不存在，使用内联更新');
            // 如果全局函数不存在，使用内联更新
            const settingsBtn = document.getElementById('settingsBtn');
            if (settingsBtn) {
              console.log('更新设置按钮...');
              settingsBtn.innerHTML = '<i class="fa fa-user"></i>';
              settingsBtn.title = `当前用户：${user.username}`;
              
              // 更新设置下拉菜单
              const settingsDropdown = document.getElementById('settingsDropdown');
              const loginOption = document.getElementById('loginOption');
              const logoutBtn = document.getElementById('logoutBtn');
              const changeAvatarBtn = document.getElementById('changeAvatarBtn');
              const userInfoDisplay = document.getElementById('userInfoDisplay');
              
              if (settingsDropdown) {
                console.log('更新设置下拉菜单...');
                if (loginOption) loginOption.style.display = 'none';
                if (logoutBtn) logoutBtn.style.display = 'block';
                if (changeAvatarBtn) changeAvatarBtn.style.display = 'block';
                if (userInfoDisplay) {
                  userInfoDisplay.style.display = 'block';
                  userInfoDisplay.textContent = `欢迎，${user.username}`;
                }
              } else {
                console.log('未找到设置下拉菜单元素');
              }
            } else {
              console.log('未找到设置按钮元素');
            }
          }
          console.log('UI更新完成');
        }, 500); // 延迟500毫秒确保DOM已加载
      } else {
        console.error('令牌验证成功但获取令牌失败');
      }
    } else {
      console.log('令牌验证失败，用户未登录');
    }
  } catch (error) {
    console.error('验证登录状态失败:', error);
    UserManager.logout();
  }
}

// 导出模块
window.UserAuth = {
  UserManager,
  initAuthModals,
  restoreUserAuth
};
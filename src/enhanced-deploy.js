export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 检查是否已认证
    const isAuthenticated = await checkAuth(request, env);
    
    // 如果是登录请求
    if (url.pathname === '/login' && request.method === 'POST') {
      return handleLogin(request, env);
    }
    
    // 如果是登出请求
    if (url.pathname === '/logout') {
      return handleLogout();
    }
    
    // API 路由不需要认证
    if (url.pathname.startsWith('/api/')) {
      return handleAPI(request, env, url.pathname);
    }
    
    // 其他请求需要认证
    if (!isAuthenticated && url.pathname !== '/login') {
      return new Response(getLoginHTML(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
    
    // 返回主页面
    return new Response(getMainHTML(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
};

async function checkAuth(request, env) {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return false;
  
  const match = cookie.match(/auth_token=([^;]+)/);
  if (!match) return false;
  
  const token = match[1];
  const storedToken = await env.TIME_TRACKER_KV.get('auth_token');
  return token === storedToken;
}

async function handleLogin(request, env) {
  const formData = await request.formData();
  const username = formData.get('username');
  const password = formData.get('password');
  
  if (username === 'admin' && password === 'wearefamily114514') {
    const token = crypto.randomUUID();
    await env.TIME_TRACKER_KV.put('auth_token', token, { expirationTtl: 86400 });
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/',
        'Set-Cookie': `auth_token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`
      }
    });
  }
  
  return new Response(getLoginHTML(true), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

function handleLogout() {
  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/login',
      'Set-Cookie': 'auth_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
    }
  });
}

async function handleAPI(request, env, pathname) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    if (pathname === '/api/tasks' && request.method === 'GET') {
      const tasks = await env.TIME_TRACKER_KV.list({ prefix: 'task:' });
      const taskData = await Promise.all(
        tasks.keys.map(async (key) => {
          const data = await env.TIME_TRACKER_KV.get(key.name, 'json');
          return data;
        })
      );
      return new Response(JSON.stringify(taskData.filter(Boolean)), { headers });
    }

    if (pathname === '/api/tasks' && request.method === 'POST') {
      const task = await request.json();
      const taskId = `task:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await env.TIME_TRACKER_KV.put(taskId, JSON.stringify(task));
      return new Response(JSON.stringify({ success: true, id: taskId }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { 
      status: 404, 
      headers 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}

function getLoginHTML(error = false) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>登录 - 时间追踪器</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .glass {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
    </style>
</head>
<body class="flex items-center justify-center p-4">
    <div class="glass rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <h1 class="text-3xl font-bold text-white mb-8 text-center">时间追踪器</h1>
        <form method="POST" action="/login" class="space-y-6">
            ${error ? '<p class="text-red-300 text-sm text-center">用户名或密码错误</p>' : ''}
            <div>
                <label class="block text-white text-sm font-medium mb-2">用户名</label>
                <input type="text" name="username" required
                    class="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50">
            </div>
            <div>
                <label class="block text-white text-sm font-medium mb-2">密码</label>
                <input type="password" name="password" required
                    class="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50">
            </div>
            <button type="submit"
                class="w-full py-3 px-4 bg-white text-purple-700 rounded-lg font-semibold hover:bg-white/90 transition-all duration-200 transform hover:scale-105">
                登录
            </button>
        </form>
    </div>
</body>
</html>`;
}

function getMainHTML() {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>时间追踪器</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .glass {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .progress-ring {
            transform: rotate(-90deg);
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .pulse { animation: pulse 2s infinite; }
        @keyframes slideIn {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .slide-in { animation: slideIn 0.5s ease-out; }
    </style>
</head>
<body class="p-4 md:p-8">
    <div class="max-w-6xl mx-auto">
        <!-- 头部 -->
        <div class="glass rounded-2xl p-6 mb-6 flex justify-between items-center">
            <h1 class="text-3xl font-bold text-white">时间追踪器</h1>
            <button onclick="logout()" class="text-white/80 hover:text-white transition-colors">
                登出
            </button>
        </div>

        <!-- 统计卡片 -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="glass rounded-xl p-6 slide-in">
                <h3 class="text-white/80 text-sm mb-2">今日总时长</h3>
                <p class="text-3xl font-bold text-white" id="todayTotal">0h 0m</p>
            </div>
            <div class="glass rounded-xl p-6 slide-in" style="animation-delay: 0.1s">
                <h3 class="text-white/80 text-sm mb-2">本月项目数</h3>
                <p class="text-3xl font-bold text-white" id="monthProjects">0</p>
            </div>
            <div class="glass rounded-xl p-6 slide-in" style="animation-delay: 0.2s">
                <h3 class="text-white/80 text-sm mb-2">平均每日</h3>
                <p class="text-3xl font-bold text-white" id="dailyAverage">0h 0m</p>
            </div>
        </div>

        <!-- 主要内容区 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- 计时器区域 -->
            <div class="glass rounded-2xl p-8">
                <div class="text-center mb-8">
                    <div class="relative inline-block">
                        <svg width="200" height="200" class="transform -rotate-90">
                            <circle cx="100" cy="100" r="90" stroke="rgba(255,255,255,0.2)" stroke-width="12" fill="none"/>
                            <circle id="progressRing" cx="100" cy="100" r="90" stroke="white" stroke-width="12" fill="none"
                                stroke-dasharray="565.48" stroke-dashoffset="565.48" class="transition-all duration-1000"/>
                        </svg>
                        <div class="absolute inset-0 flex items-center justify-center">
                            <div>
                                <div class="text-5xl font-bold text-white" id="timer">00:00:00</div>
                                <div class="text-white/60 text-sm mt-2" id="progressPercent">0% of 8h</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="space-y-4">
                    <input type="text" id="projectName" placeholder="项目名称" 
                        class="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50">
                    
                    <div class="grid grid-cols-3 gap-3">
                        <button onclick="startTimer()" id="startBtn"
                            class="py-3 px-4 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                            开始
                        </button>
                        <button onclick="pauseTimer()" id="pauseBtn" disabled
                            class="py-3 px-4 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                            暂停
                        </button>
                        <button onclick="stopTimer()" id="stopBtn" disabled
                            class="py-3 px-4 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                            停止
                        </button>
                    </div>
                </div>

                <!-- 进度条 -->
                <div class="mt-6">
                    <div class="flex justify-between text-white/80 text-sm mb-2">
                        <span>今日进度</span>
                        <span id="todayProgress">0 / 8 小时</span>
                    </div>
                    <div class="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                        <div id="progressBar" class="h-full bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-1000" style="width: 0%"></div>
                    </div>
                </div>
            </div>

            <!-- 日历区域 -->
            <div class="glass rounded-2xl p-8">
                <div class="flex justify-between items-center mb-6">
                    <button onclick="previousMonth()" class="text-white hover:bg-white/20 p-2 rounded-lg transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                        </svg>
                    </button>
                    <h2 class="text-2xl font-bold text-white" id="currentMonth"></h2>
                    <button onclick="nextMonth()" class="text-white hover:bg-white/20 p-2 rounded-lg transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                        </svg>
                    </button>
                </div>
                
                <div class="grid grid-cols-7 gap-1 text-center">
                    <div class="text-white/60 text-sm py-2">日</div>
                    <div class="text-white/60 text-sm py-2">一</div>
                    <div class="text-white/60 text-sm py-2">二</div>
                    <div class="text-white/60 text-sm py-2">三</div>
                    <div class="text-white/60 text-sm py-2">四</div>
                    <div class="text-white/60 text-sm py-2">五</div>
                    <div class="text-white/60 text-sm py-2">六</div>
                </div>
                
                <div id="calendar" class="grid grid-cols-7 gap-1"></div>
            </div>
        </div>
    </div>

    <script>
        let startTime = null;
        let pausedTime = 0;
        let timerInterval = null;
        let currentProject = '';
        let isPaused = false;
        let currentDate = new Date();
        const API_URL = window.location.origin;
        const TARGET_HOURS = 8;

        // 初始化
        window.onload = function() {
            loadState();
            updateCalendar();
            updateStats();
            setInterval(updateStats, 60000);
        };

        function logout() {
            window.location.href = '/logout';
        }

        function loadState() {
            const savedState = localStorage.getItem('timerState');
            if (savedState) {
                const state = JSON.parse(savedState);
                if (state.isRunning) {
                    startTime = state.startTime;
                    pausedTime = state.pausedTime || 0;
                    currentProject = state.project;
                    isPaused = state.isPaused || false;
                    document.getElementById('projectName').value = currentProject;
                    
                    if (!isPaused) {
                        startTimerInterval();
                    } else {
                        updateTimerDisplay();
                    }
                    
                    updateButtonStates(true, isPaused);
                }
            }
        }

        function saveState() {
            const state = {
                isRunning: startTime !== null,
                startTime: startTime,
                pausedTime: pausedTime,
                project: currentProject,
                isPaused: isPaused
            };
            localStorage.setItem('timerState', JSON.stringify(state));
        }

        function startTimer() {
            const projectName = document.getElementById('projectName').value.trim();
            if (!projectName) {
                alert('请输入项目名称');
                return;
            }
            
            currentProject = projectName;
            startTime = Date.now();
            pausedTime = 0;
            isPaused = false;
            
            startTimerInterval();
            updateButtonStates(true, false);
            saveState();
        }

        function pauseTimer() {
            if (isPaused) {
                const pauseDuration = Date.now() - pauseStartTime;
                pausedTime += pauseDuration;
                isPaused = false;
                startTimerInterval();
                document.getElementById('pauseBtn').textContent = '暂停';
            } else {
                isPaused = true;
                pauseStartTime = Date.now();
                clearInterval(timerInterval);
                document.getElementById('pauseBtn').textContent = '继续';
            }
            saveState();
        }

        function stopTimer() {
            if (!startTime) return;
            
            const endTime = Date.now();
            let totalTime = endTime - startTime - pausedTime;
            
            if (isPaused) {
                totalTime -= (Date.now() - pauseStartTime);
            }
            
            saveTask(currentProject, startTime, endTime, totalTime);
            
            clearInterval(timerInterval);
            startTime = null;
            pausedTime = 0;
            isPaused = false;
            currentProject = '';
            
            document.getElementById('timer').textContent = '00:00:00';
            document.getElementById('projectName').value = '';
            updateButtonStates(false, false);
            updateProgressRing(0);
            
            localStorage.removeItem('timerState');
        }

        function startTimerInterval() {
            clearInterval(timerInterval);
            timerInterval = setInterval(updateTimerDisplay, 100);
        }

        function updateTimerDisplay() {
            if (!startTime) return;
            
            let elapsed = Date.now() - startTime - pausedTime;
            if (isPaused && pauseStartTime) {
                elapsed -= (Date.now() - pauseStartTime);
            }
            
            const hours = Math.floor(elapsed / 3600000);
            const minutes = Math.floor((elapsed % 3600000) / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            
            document.getElementById('timer').textContent = 
                String(hours).padStart(2, '0') + ':' + 
                String(minutes).padStart(2, '0') + ':' + 
                String(seconds).padStart(2, '0');
            
            updateDailyProgress();
        }

        function updateButtonStates(isRunning, isPaused) {
            document.getElementById('startBtn').disabled = isRunning;
            document.getElementById('pauseBtn').disabled = !isRunning;
            document.getElementById('stopBtn').disabled = !isRunning;
            document.getElementById('projectName').disabled = isRunning;
            
            if (isRunning && isPaused) {
                document.getElementById('pauseBtn').textContent = '继续';
            } else {
                document.getElementById('pauseBtn').textContent = '暂停';
            }
        }

        async function saveTask(project, start, end, duration) {
            const task = {
                project: project,
                startTime: start,
                endTime: end,
                duration: duration,
                date: new Date(start).toISOString().split('T')[0]
            };
            
            try {
                await fetch(API_URL + '/api/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(task)
                });
                updateCalendar();
                updateStats();
            } catch (error) {
                console.error('保存任务失败:', error);
            }
        }

        async function loadTasks() {
            try {
                const response = await fetch(API_URL + '/api/tasks');
                return await response.json();
            } catch (error) {
                console.error('加载任务失败:', error);
                return [];
            }
        }

        async function updateCalendar() {
            const tasks = await loadTasks();
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const today = new Date();
            
            document.getElementById('currentMonth').textContent = 
                currentDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
            
            const calendar = document.getElementById('calendar');
            calendar.innerHTML = '';
            
            // 空白日期
            for (let i = 0; i < firstDay; i++) {
                calendar.innerHTML += '<div></div>';
            }
            
            // 日期
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = new Date(year, month, day).toISOString().split('T')[0];
                const dayTasks = tasks.filter(t => t.date === dateStr);
                const totalHours = dayTasks.reduce((sum, t) => sum + t.duration, 0) / 3600000;
                const percentage = Math.min((totalHours / TARGET_HOURS) * 100, 100);
                
                const isToday = today.getFullYear() === year && 
                               today.getMonth() === month && 
                               today.getDate() === day;
                
                const dayClass = isToday ? 'ring-2 ring-white' : '';
                const bgColor = percentage > 0 ? getProgressColor(percentage) : 'bg-white/10';
                
                calendar.innerHTML += \`
                    <div class="relative p-2 rounded-lg \${bgColor} \${dayClass} hover:bg-white/20 transition-colors cursor-pointer group">
                        <div class="text-white font-medium">\${day}</div>
                        \${percentage > 0 ? \`<div class="text-xs text-white/80">\${percentage.toFixed(0)}%</div>\` : ''}
                        \${dayTasks.length > 0 ? \`
                            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                <div class="bg-gray-800 text-white text-xs rounded-lg p-2 whitespace-nowrap">
                                    \${dayTasks.map(t => \`\${t.project}: \${formatDuration(t.duration)}\`).join('<br>')}
                                </div>
                            </div>
                        \` : ''}
                    </div>
                \`;
            }
        }

        function getProgressColor(percentage) {
            if (percentage < 25) return 'bg-red-500/30';
            if (percentage < 50) return 'bg-yellow-500/30';
            if (percentage < 75) return 'bg-blue-500/30';
            return 'bg-green-500/30';
        }

        function previousMonth() {
            currentDate.setMonth(currentDate.getMonth() - 1);
            updateCalendar();
        }

        function nextMonth() {
            currentDate.setMonth(currentDate.getMonth() + 1);
            updateCalendar();
        }

        async function updateStats() {
            const tasks = await loadTasks();
            const today = new Date().toISOString().split('T')[0];
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            
            // 今日总时长
            const todayTasks = tasks.filter(t => t.date === today);
            const todayDuration = todayTasks.reduce((sum, t) => sum + t.duration, 0);
            document.getElementById('todayTotal').textContent = formatDuration(todayDuration);
            
            // 本月项目数
            const monthTasks = tasks.filter(t => {
                const taskDate = new Date(t.date);
                return taskDate.getMonth() === currentMonth && taskDate.getFullYear() === currentYear;
            });
            const uniqueProjects = new Set(monthTasks.map(t => t.project));
            document.getElementById('monthProjects').textContent = uniqueProjects.size;
            
            // 平均每日
            const daysWithTasks = new Set(tasks.map(t => t.date)).size;
            const totalDuration = tasks.reduce((sum, t) => sum + t.duration, 0);
            const avgDuration = daysWithTasks > 0 ? totalDuration / daysWithTasks : 0;
            document.getElementById('dailyAverage').textContent = formatDuration(avgDuration);
            
            updateDailyProgress();
        }

        async function updateDailyProgress() {
            const tasks = await loadTasks();
            const today = new Date().toISOString().split('T')[0];
            const todayTasks = tasks.filter(t => t.date === today);
            let todayDuration = todayTasks.reduce((sum, t) => sum + t.duration, 0);
            
            // 加上当前正在进行的任务时间
            if (startTime) {
                let elapsed = Date.now() - startTime - pausedTime;
                if (isPaused && pauseStartTime) {
                    elapsed -= (Date.now() - pauseStartTime);
                }
                todayDuration += elapsed;
            }
            
            const hours = todayDuration / 3600000;
            const percentage = Math.min((hours / TARGET_HOURS) * 100, 100);
            
            // 更新进度条
            document.getElementById('progressBar').style.width = percentage + '%';
            document.getElementById('todayProgress').textContent = 
                \`\${hours.toFixed(1)} / \${TARGET_HOURS} 小时\`;
            
            // 更新环形进度
            updateProgressRing(percentage);
            document.getElementById('progressPercent').textContent = 
                \`\${percentage.toFixed(0)}% of \${TARGET_HOURS}h\`;
            
            // 更新进度条颜色
            const progressBar = document.getElementById('progressBar');
            progressBar.className = 'h-full transition-all duration-1000 ' + getProgressBarColor(percentage);
        }

        function updateProgressRing(percentage) {
            const ring = document.getElementById('progressRing');
            const circumference = 2 * Math.PI * 90;
            const offset = circumference - (percentage / 100) * circumference;
            ring.style.strokeDashoffset = offset;
            
            // 更新环形颜色
            ring.style.stroke = getProgressRingColor(percentage);
        }

        function getProgressBarColor(percentage) {
            if (percentage < 25) return 'bg-gradient-to-r from-red-400 to-red-500';
            if (percentage < 50) return 'bg-gradient-to-r from-yellow-400 to-yellow-500';
            if (percentage < 75) return 'bg-gradient-to-r from-blue-400 to-blue-500';
            return 'bg-gradient-to-r from-green-400 to-green-500';
        }

        function getProgressRingColor(percentage) {
            if (percentage < 25) return '#ef4444';
            if (percentage < 50) return '#eab308';
            if (percentage < 75) return '#3b82f6';
            return '#22c55e';
        }

        function formatDuration(ms) {
            const hours = Math.floor(ms / 3600000);
            const minutes = Math.floor((ms % 3600000) / 60000);
            return \`\${hours}h \${minutes}m\`;
        }
    </script>
</body>
</html>`;
  
  return html;
}
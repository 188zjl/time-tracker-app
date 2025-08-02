// 增强版时间追踪应用 - 可直接在 Cloudflare Dashboard 使用
// 包含身份验证、现代UI、8小时目标追踪

// HTML 内容
const getHTMLContent = () => `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>项目时间追踪系统</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { font-family: 'Inter', sans-serif; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes shimmer { 100% { transform: translateX(100%); } }
        
        .fade-in { animation: fadeIn 0.5s ease-out; }
        .slide-in { animation: slideIn 0.3s ease-out; }
        .pulse { animation: pulse 2s infinite; }
        
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #555; }
        
        .progress-bar { position: relative; overflow: hidden; transition: all 0.3s ease; }
        .progress-bar::after {
            content: '';
            position: absolute;
            top: 0; left: 0; bottom: 0; right: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            transform: translateX(-100%);
            animation: shimmer 2s infinite;
        }
        
        .calendar-day { transition: all 0.2s ease; min-height: 100px; }
        .calendar-day:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1); z-index: 10; }
        
        .btn-primary { position: relative; overflow: hidden; transition: all 0.3s ease; }
        .btn-primary::before {
            content: '';
            position: absolute;
            top: 50%; left: 50%;
            width: 0; height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            transform: translate(-50%, -50%);
            transition: width 0.6s, height 0.6s;
        }
        .btn-primary:hover::before { width: 300px; height: 300px; }
        
        .loading-spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #3b82f6;
            border-radius: 50%;
            width: 40px; height: 40px;
            animation: spin 1s linear infinite;
        }
        
        .tooltip {
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            pointer-events: none;
            z-index: 1000;
            white-space: nowrap;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        .tooltip.show { opacity: 1; }
        
        .modal-backdrop { backdrop-filter: blur(5px); background: rgba(0, 0, 0, 0.5); }
    </style>
</head>
<body class="bg-gray-50">
    <!-- 登录界面 -->
    <div id="login-screen" class="fixed inset-0 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center z-50">
        <div class="bg-white rounded-2xl shadow-2xl p-8 w-96 fade-in">
            <h1 class="text-3xl font-bold text-gray-800 mb-2 text-center">项目时间追踪</h1>
            <p class="text-gray-600 text-center mb-8">请登录以继续</p>
            
            <form id="login-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">用户名</label>
                    <input type="text" id="username" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" placeholder="请输入用户名">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">密码</label>
                    <input type="password" id="password" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" placeholder="请输入密码">
                </div>
                
                <div id="login-error" class="text-red-500 text-sm hidden"></div>
                
                <button type="submit" class="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition duration-200 transform hover:scale-[1.02] btn-primary">
                    登录
                </button>
            </form>
        </div>
    </div>
    
    <!-- 主应用界面 -->
    <div id="app" class="hidden">
        <!-- 顶部导航栏 -->
        <nav class="bg-white shadow-md sticky top-0 z-40">
            <div class="container mx-auto px-4 py-4">
                <div class="flex justify-between items-center">
                    <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                        项目时间追踪系统
                    </h1>
                    <div class="flex items-center gap-4">
                        <span class="text-gray-600">欢迎, <span class="font-semibold">admin</span></span>
                        <button id="logout-btn" class="text-gray-500 hover:text-gray-700 transition">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
        
        <div class="container mx-auto px-4 py-8 max-w-7xl">
            <!-- 当前任务卡片 -->
            <div id="current-task-card" class="bg-white rounded-xl shadow-lg p-6 mb-8 hidden fade-in">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h2 class="text-xl font-semibold text-gray-800 mb-1">当前项目</h2>
                        <p id="task-name" class="text-lg text-gray-600"></p>
                    </div>
                    <div class="text-right">
                        <p class="text-sm text-gray-500 mb-1">已用时</p>
                        <p id="task-timer" class="text-3xl font-mono font-bold text-blue-600">00:00:00</p>
                    </div>
                </div>
                
                <!-- 8小时进度条 -->
                <div class="mb-4">
                    <div class="flex justify-between text-sm text-gray-600 mb-2">
                        <span>今日进度</span>
                        <span id="progress-text">0% (0/8小时)</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div id="progress-bar" class="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full progress-bar transition-all duration-300" style="width: 0%"></div>
                    </div>
                </div>
                
                <div class="flex gap-3">
                    <button id="pause-resume-btn" class="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 rounded-lg shadow-md transition duration-200 transform hover:scale-[1.02] btn-primary">
                        暂停
                    </button>
                    <button id="stop-btn" class="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-lg shadow-md transition duration-200 transform hover:scale-[1.02] btn-primary">
                        完成项目
                    </button>
                </div>
            </div>
            
            <!-- 开始新任务按钮 -->
            <div id="start-task-container" class="text-center mb-8">
                <button id="start-btn" class="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-4 px-8 rounded-lg shadow-lg transition duration-200 transform hover:scale-[1.02] btn-primary">
                    <svg class="w-6 h-6 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    开始新项目
                </button>
            </div>
            
            <!-- 统计信息 -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-sm">今日总时长</p>
                            <p id="today-total" class="text-2xl font-bold text-gray-800">0小时0分</p>
                        </div>
                        <div class="bg-blue-100 p-3 rounded-lg">
                            <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-sm">本月项目数</p>
                            <p id="month-projects" class="text-2xl font-bold text-gray-800">0个</p>
                        </div>
                        <div class="bg-purple-100 p-3 rounded-lg">
                            <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                            </svg>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-sm">平均每日</p>
                            <p id="daily-average" class="text-2xl font-bold text-gray-800">0小时</p>
                        </div>
                        <div class="bg-green-100 p-3 rounded-lg">
                            <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 日历视图 -->
            <div class="bg-white rounded-xl shadow-lg p-6">
                <div class="flex justify-between items-center mb-6">
                    <button id="prev-month" class="p-2 hover:bg-gray-100 rounded-lg transition">
                        <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                    </button>
                    <h2 id="calendar-month" class="text-2xl font-bold text-gray-800"></h2>
                    <button id="next-month" class="p-2 hover:bg-gray-100 rounded-lg transition">
                        <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </button>
                </div>
                
                <!-- 星期标题 -->
                <div class="grid grid-cols-7 gap-2 mb-4">
                    <div class="text-center text-sm font-semibold text-gray-600 py-2">日</div>
                    <div class="text-center text-sm font-semibold text-gray-600 py-2">一</div>
                    <div class="text-center text-sm font-semibold text-gray-600 py-2">二</div>
                    <div class="text-center text-sm font-semibold text-gray-600 py-2">三</div>
                    <div class="text-center text-sm font-semibold text-gray-600 py-2">四</div>
                    <div class="text-center text-sm font-semibold text-gray-600 py-2">五</div>
                    <div class="text-center text-sm font-semibold text-gray-600 py-2">六</div>
                </div>
                
                <!-- 日历网格 -->
                <div id="calendar-grid" class="grid grid-cols-7 gap-2">
                    <!-- 动态生成 -->
                </div>
            </div>
        </div>
        
        <!-- 任务输入模态框 -->
        <div id="task-modal" class="fixed inset-0 modal-backdrop flex items-center justify-center hidden z-50">
            <div class="bg-white rounded-xl shadow-2xl p-8 w-96 fade-in">
                <h3 class="text-2xl font-bold text-gray-800 mb-6">新建项目</h3>
                <input type="text" id="task-input" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition mb-6" placeholder="输入项目名称">
                <div class="flex justify-end gap-3">
                    <button id="cancel-task" class="px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition">取消</button>
                    <button id="confirm-task" class="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition btn-primary">确认</button>
                </div>
            </div>
        </div>
        
        <!-- 工具提示 -->
        <div id="tooltip" class="tooltip"></div>
        
        <!-- 加载状态 -->
        <div id="loading" class="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center hidden z-50">
            <div class="loading-spinner"></div>
        </div>
    </div>
    
    <script src="/app.js"></script>
</body>
</html>`;

// JavaScript 内容
const getJSContent = () => {
  const code = [];
  
  // 配置部分
  code.push(`
const API_BASE = window.location.origin;
const VALID_USERNAME = 'admin';
const VALID_PASSWORD = 'wearefamily114514';
const DAILY_TARGET_HOURS = 8;

let currentTask = null;
let timerInterval = null;
let isAuthenticated = false;

document.addEventListener('DOMContentLoaded', async () => {
    checkAuthentication();
    bindEvents();
});
  `);
  
  // 认证相关函数
  code.push(`
function checkAuthentication() {
    const authToken = localStorage.getItem('authToken');
    if (authToken === btoa(VALID_USERNAME + ':' + VALID_PASSWORD)) {
        isAuthenticated = true;
        showApp();
    } else {
        showLogin();
    }
}

function showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
}

async function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    
    await restoreCurrentTask();
    await loadCalendar();
    updateStatistics();
}

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    
    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
        localStorage.setItem('authToken', btoa(username + ':' + password));
        isAuthenticated = true;
        
        showLoading();
        
        setTimeout(() => {
            hideLoading();
            showApp();
        }, 500);
    } else {
        errorDiv.textContent = '用户名或密码错误';
        errorDiv.classList.remove('hidden');
        
        document.getElementById('login-form').classList.add('animate-pulse');
        setTimeout(() => {
            document.getElementById('login-form').classList.remove('animate-pulse');
        }, 500);
    }
}

function handleLogout() {
    localStorage.removeItem('authToken');
    isAuthenticated = false;
    currentTask = null;
    stopTimer();
    showLogin();
}
  `);
  
  // 事件绑定
  code.push(`
function bindEvents() {
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('start-btn').addEventListener('click', showTaskModal);
    document.getElementById('pause-resume-btn').addEventListener('click', togglePause);
    document.getElementById('stop-btn').addEventListener('click', stopTask);
    document.getElementById('confirm-task').addEventListener('click', startTask);
    document.getElementById('cancel-task').addEventListener('click', hideTaskModal);
    document.getElementById('task-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') startTask();
    });
    document.getElementById('prev-month').addEventListener('click', () => navigateMonth(-1));
    document.getElementById('next-month').addEventListener('click', () => navigateMonth(1));
    window.addEventListener('beforeunload', saveTaskState);
}
  `);
  
  // 任务管理函数
  code.push(`
function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function saveTaskState() {
    if (currentTask) {
        localStorage.setItem('currentTask', JSON.stringify(currentTask));
        localStorage.setItem('lastUpdate', new Date().toISOString());
    } else {
        localStorage.removeItem('currentTask');
        localStorage.removeItem('lastUpdate');
    }
}

async function restoreCurrentTask() {
    try {
        const response = await fetch(API_BASE + '/api/current');
        const serverTask = await response.json();
        
        if (serverTask) {
            currentTask = serverTask;
            updateUI();
            startTimer();
        } else {
            const localTask = localStorage.getItem('currentTask');
            if (localTask) {
                currentTask = JSON.parse(localTask);
                updateUI();
                startTimer();
            }
        }
    } catch (error) {
        const localTask = localStorage.getItem('currentTask');
        if (localTask) {
            currentTask = JSON.parse(localTask);
            updateUI();
            startTimer();
        }
    }
}

function showTaskModal() {
    document.getElementById('task-modal').classList.remove('hidden');
    document.getElementById('task-input').focus();
}

function hideTaskModal() {
    document.getElementById('task-modal').classList.add('hidden');
    document.getElementById('task-input').value = '';
}

async function startTask() {
    const taskName = document.getElementById('task-input').value.trim();
    
    if (!taskName) {
        alert('请输入项目名称');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(API_BASE + '/api/tasks/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: taskName })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '启动项目失败');
        }
        
        currentTask = await response.json();
        hideTaskModal();
        updateUI();
        startTimer();
        saveTaskState();
        updateStatistics();
    } catch (error) {
        alert(error.message);
    } finally {
        hideLoading();
    }
}

async function togglePause() {
    if (!currentTask) return;
    
    const action = currentTask.isPaused ? 'resume' : 'pause';
    showLoading();
    
    try {
        const response = await fetch(API_BASE + '/api/tasks/' + action, {
            method: 'POST'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || action + ' 失败');
        }
        
        currentTask = await response.json();
        updateUI();
        
        if (currentTask.isPaused) {
            stopTimer();
        } else {
            startTimer();
        }
        
        saveTaskState();
    } catch (error) {
        alert(error.message);
    } finally {
        hideLoading();
    }
}

async function stopTask() {
    if (!currentTask) return;
    
    showLoading();
    
    try {
        const response = await fetch(API_BASE + '/api/tasks/stop', {
            method: 'POST'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '停止项目失败');
        }
        
        currentTask = null;
        stopTimer();
        updateUI();
        saveTaskState();
        await loadCalendar();
        updateStatistics();
    } catch (error) {
        alert(error.message);
    } finally {
        hideLoading();
    }
}
  `);
  
  // 计时器和UI更新
  code.push(`
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
    updateTimer();
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimer() {
    if (!currentTask || currentTask.isPaused) return;
    
    const now = new Date();
    const startTime = new Date(currentTask.startTime);
    const elapsed = now - startTime - (currentTask.pausedDuration || 0);
    
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    const timeString = hours.toString().padStart(2, '0') + ':' + 
                      minutes.toString().padStart(2, '0') + ':' + 
                      seconds.toString().padStart(2, '0');
    document.getElementById('task-timer').textContent = timeString;
    
    updateProgressBar(elapsed);
    
    if (seconds % 10 === 0) {
        saveTaskState();
    }
}

function updateProgressBar(elapsed) {
    const hoursElapsed = elapsed / 3600000;
    const percentage = Math.min((hoursElapsed / DAILY_TARGET_HOURS) * 100, 100);
    
    document.getElementById('progress-bar').style.width = percentage + '%';
    document.getElementById('progress-text').textContent = 
        percentage.toFixed(1) + '% (' + hoursElapsed.toFixed(1) + '/' + DAILY_TARGET_HOURS + '小时)';
}

function updateUI() {
    const taskCard = document.getElementById('current-task-card');
    const startContainer = document.getElementById('start-task-container');
    const pauseResumeBtn = document.getElementById('pause-resume-btn');
    
    if (currentTask) {
        startContainer.classList.add('hidden');
        taskCard.classList.remove('hidden');
        
        document.getElementById('task-name').textContent = currentTask.name;
        pauseResumeBtn.textContent = currentTask.isPaused ? '恢复' : '暂停';
        pauseResumeBtn.className = currentTask.isPaused 
            ? 'flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg shadow-md transition duration-200 transform hover:scale-[1.02] btn-primary'
            : 'flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 rounded-lg shadow-md transition duration-200 transform hover:scale-[1.02] btn-primary';
        
        updateTimer();
    } else {
        startContainer.classList.remove('hidden');
        taskCard.classList.add('hidden');
    }
}
  `);
  
  // 统计和日历
  code.push(`
async function updateStatistics() {
    try {
        const response = await fetch(API_BASE + '/api/tasks');
        const tasks = await response.json();
        
        const today = new Date().toDateString();
        const todayTasks = tasks.filter(task => 
            new Date(task.startTime).toDateString() === today
        );
        
        const todayTotal = todayTasks.reduce((sum, task) => sum + (task.duration || 0), 0);
        const todayHours = Math.floor(todayTotal / 3600000);
        const todayMinutes = Math.floor((todayTotal % 3600000) / 60000);
        document.getElementById('today-total').textContent = todayHours + '小时' + todayMinutes + '分';
        
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthTasks = tasks.filter(task => {
            const taskDate =
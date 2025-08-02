// 时间追踪应用 - Cloudflare Workers 单文件版本
// 可以直接复制粘贴到 Cloudflare Dashboard

// HTML 内容
const HTML_CONTENT = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>时间追踪器</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .task-bar {
            transition: all 0.3s ease;
        }
        .task-bar:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .calendar-day {
            min-height: 80px;
        }
        .tooltip {
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 14px;
            pointer-events: none;
            z-index: 1000;
            white-space: nowrap;
        }
    </style>
</head>
<body class="bg-gray-50">
    <div class="container mx-auto px-4 py-8 max-w-6xl">
        <!-- 标题 -->
        <h1 class="text-3xl font-bold text-gray-800 mb-8 text-center">时间追踪器</h1>
        
        <!-- 当前任务状态 -->
        <div id="current-task-display" class="bg-white rounded-lg shadow-md p-6 mb-8 hidden">
            <h2 class="text-xl font-semibold text-gray-700 mb-2">当前任务</h2>
            <p id="task-name" class="text-lg text-gray-600"></p>
            <p id="task-timer" class="text-2xl font-mono text-blue-600 mt-2">00:00:00</p>
        </div>
        
        <!-- 控制按钮 -->
        <div class="flex justify-center gap-4 mb-8">
            <button id="start-btn" class="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-200 transform hover:scale-105">
                开始任务
            </button>
            <button id="pause-resume-btn" class="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-200 transform hover:scale-105 hidden">
                暂停
            </button>
            <button id="stop-btn" class="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-200 transform hover:scale-105 hidden">
                停止并记录
            </button>
        </div>
        
        <!-- 日历视图 -->
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex justify-between items-center mb-4">
                <button id="prev-month" class="text-gray-600 hover:text-gray-800">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                </button>
                <h2 id="calendar-month" class="text-xl font-semibold text-gray-800"></h2>
                <button id="next-month" class="text-gray-600 hover:text-gray-800">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </button>
            </div>
            
            <!-- 星期标题 -->
            <div class="grid grid-cols-7 gap-2 mb-2">
                <div class="text-center text-sm font-semibold text-gray-600">日</div>
                <div class="text-center text-sm font-semibold text-gray-600">一</div>
                <div class="text-center text-sm font-semibold text-gray-600">二</div>
                <div class="text-center text-sm font-semibold text-gray-600">三</div>
                <div class="text-center text-sm font-semibold text-gray-600">四</div>
                <div class="text-center text-sm font-semibold text-gray-600">五</div>
                <div class="text-center text-sm font-semibold text-gray-600">六</div>
            </div>
            
            <!-- 日历网格 -->
            <div id="calendar-grid" class="grid grid-cols-7 gap-2">
                <!-- 动态生成 -->
            </div>
        </div>
        
        <!-- 任务输入模态框 -->
        <div id="task-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden">
            <div class="bg-white rounded-lg p-6 w-96">
                <h3 class="text-xl font-semibold mb-4">新建任务</h3>
                <input type="text" id="task-input" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="输入任务名称">
                <div class="flex justify-end gap-2 mt-4">
                    <button id="cancel-task" class="px-4 py-2 text-gray-600 hover:text-gray-800">取消</button>
                    <button id="confirm-task" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">确认</button>
                </div>
            </div>
        </div>
        
        <!-- 工具提示 -->
        <div id="tooltip" class="tooltip hidden"></div>
    </div>
    
    <script>
        // API 基础 URL
        const API_BASE = window.location.origin;

        // 全局状态
        let currentTask = null;
        let timerInterval = null;

        // 初始化
        document.addEventListener('DOMContentLoaded', async () => {
            bindEvents();
            await restoreCurrentTask();
            await loadCalendar();
        });

        // 绑定事件
        function bindEvents() {
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

        // 保存任务状态到 localStorage
        function saveTaskState() {
            if (currentTask) {
                localStorage.setItem('currentTask', JSON.stringify(currentTask));
                localStorage.setItem('lastUpdate', new Date().toISOString());
            } else {
                localStorage.removeItem('currentTask');
                localStorage.removeItem('lastUpdate');
            }
        }

        // 恢复当前任务
        async function restoreCurrentTask() {
            try {
                const response = await fetch(\`\${API_BASE}/api/current\`);
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

        // 显示任务输入模态框
        function showTaskModal() {
            document.getElementById('task-modal').classList.remove('hidden');
            document.getElementById('task-input').focus();
        }

        // 隐藏任务输入模态框
        function hideTaskModal() {
            document.getElementById('task-modal').classList.add('hidden');
            document.getElementById('task-input').value = '';
        }

        // 开始新任务
        async function startTask() {
            const taskName = document.getElementById('task-input').value.trim();
            
            if (!taskName) {
                alert('请输入任务名称');
                return;
            }
            
            try {
                const response = await fetch(\`\${API_BASE}/api/tasks/start\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: taskName })
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || '启动任务失败');
                }
                
                currentTask = await response.json();
                hideTaskModal();
                updateUI();
                startTimer();
                saveTaskState();
            } catch (error) {
                alert(error.message);
            }
        }

        // 切换暂停/恢复
        async function togglePause() {
            if (!currentTask) return;
            
            const action = currentTask.isPaused ? 'resume' : 'pause';
            
            try {
                const response = await fetch(\`\${API_BASE}/api/tasks/\${action}\`, {
                    method: 'POST'
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || \`\${action} 失败\`);
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
            }
        }

        // 停止任务
        async function stopTask() {
            if (!currentTask) return;
            
            try {
                const response = await fetch(\`\${API_BASE}/api/tasks/stop\`, {
                    method: 'POST'
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || '停止任务失败');
                }
                
                currentTask = null;
                stopTimer();
                updateUI();
                saveTaskState();
                await loadCalendar();
            } catch (error) {
                alert(error.message);
            }
        }

        // 启动计时器
        function startTimer() {
            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(updateTimer, 1000);
            updateTimer();
        }

        // 停止计时器
        function stopTimer() {
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
        }

        // 更新计时器显示
        function updateTimer() {
            if (!currentTask || currentTask.isPaused) return;
            
            const now = new Date();
            const startTime = new Date(currentTask.startTime);
            const elapsed = now - startTime - (currentTask.pausedDuration || 0);
            
            const hours = Math.floor(elapsed / 3600000);
            const minutes = Math.floor((elapsed % 3600000) / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            
            const timeString = \`\${hours.toString().padStart(2, '0')}:\${minutes.toString().padStart(2, '0')}:\${seconds.toString().padStart(2, '0')}\`;
            document.getElementById('task-timer').textContent = timeString;
            
            if (seconds % 10 === 0) {
                saveTaskState();
            }
        }

        // 更新 UI
        function updateUI() {
            const startBtn = document.getElementById('start-btn');
            const pauseResumeBtn = document.getElementById('pause-resume-btn');
            const stopBtn = document.getElementById('stop-btn');
            const taskDisplay = document.getElementById('current-task-display');
            
            if (currentTask) {
                startBtn.classList.add('hidden');
                pauseResumeBtn.classList.remove('hidden');
                stopBtn.classList.remove('hidden');
                taskDisplay.classList.remove('hidden');
                
                document.getElementById('task-name').textContent = currentTask.name;
                pauseResumeBtn.textContent = currentTask.isPaused ? '恢复' : '暂停';
                pauseResumeBtn.className = currentTask.isPaused 
                    ? 'bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-200 transform hover:scale-105'
                    : 'bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-200 transform hover:scale-105';
                
                updateTimer();
            } else {
                startBtn.classList.remove('hidden');
                pauseResumeBtn.classList.add('hidden');
                stopBtn.classList.add('hidden');
                taskDisplay.classList.add('hidden');
            }
        }

        // 日历相关
        let currentYear = new Date().getFullYear();
        let currentMonth = new Date().getMonth() + 1;

        async function loadCalendar() {
            try {
                const response = await fetch(\`\${API_BASE}/api/calendar?year=\${currentYear}&month=\${currentMonth}\`);
                const tasksByDate = await response.json();
                renderCalendar(tasksByDate);
            } catch (error) {
                console.error('加载日历失败', error);
            }
        }

        function renderCalendar(tasksByDate) {
            const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
            document.getElementById('calendar-month').textContent = \`\${currentYear}年 \${monthNames[currentMonth - 1]}\`;
            
            const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
            const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
            
            const grid = document.getElementById('calendar-grid');
            grid.innerHTML = '';
            
            for (let i = 0; i < firstDay; i++) {
                grid.appendChild(createEmptyDay());
            }
            
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = \`\${currentYear}-\${currentMonth.toString().padStart(2, '0')}-\${day.toString().padStart(2, '0')}\`;
                const tasks = tasksByDate[dateStr] || [];
                grid.appendChild(createCalendarDay(day, tasks));
            }
        }

        function createEmptyDay() {
            const div = document.createElement('div');
            div.className = 'calendar-day';
            return div;
        }

        function createCalendarDay(day, tasks) {
            const div = document.createElement('div');
            div.className = 'calendar-day border border-gray-200 rounded-lg p-2 hover:bg-gray-50 relative';
            
            const dayNumber = document.createElement('div');
            dayNumber.className = 'text-sm text-gray-600 mb-1';
            dayNumber.textContent = day;
            div.appendChild(dayNumber);
            
            if (tasks.length > 0) {
                const barsContainer = document.createElement('div');
                barsContainer.className = 'space-y-1';
                
                tasks.forEach(task => {
                    const bar = document.createElement('div');
                    bar.className = 'task-bar rounded cursor-pointer';
                    bar.style.backgroundColor = task.color;
                    bar.style.height = '4px';
                    bar.style.width = \`\${Math.min(100, (task.duration / 3600000) * 25)}%\`;
                    
                    bar.addEventListener('mouseenter', (e) => showTooltip(e, task));
                    bar.addEventListener('mouseleave', hideTooltip);
                    
                    barsContainer.appendChild(bar);
                });
                
                div.appendChild(barsContainer);
            }
            
            return div;
        }

        function showTooltip(event, task) {
            const tooltip = document.getElementById('tooltip');
            const rect = event.target.getBoundingClientRect();
            
            tooltip.innerHTML = \`
                <div class="font-semibold">\${task.name}</div>
                <div>\${task.hours}小时 \${task.minutes}分钟</div>
            \`;
            
            tooltip.style.left = \`\${rect.left + rect.width / 2}px\`;
            tooltip.style.top = \`\${rect.top - 10}px\`;
            tooltip.style.transform = 'translate(-50%, -100%)';
            tooltip.classList.remove('hidden');
        }

        function hideTooltip() {
            document.getElementById('tooltip').classList.add('hidden');
        }

        function navigateMonth(direction) {
            currentMonth += direction;
            
            if (currentMonth > 12) {
                currentMonth = 1;
                currentYear++;
            } else if (currentMonth < 1) {
                currentMonth = 12;
                currentYear--;
            }
            
            loadCalendar();
        }
    </script>
</body>
</html>`;

// 处理 CORS
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}

// API 路由处理
async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;

  // 处理 OPTIONS 请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    // API 路由
    switch (path) {
      case '/api/tasks':
        return await handleTasks(request, env);
      
      case '/api/current':
        return await handleCurrentTask(request, env);
      
      case '/api/tasks/start':
        return await startTask(request, env);
      
      case '/api/tasks/pause':
        return await pauseTask(request, env);
      
      case '/api/tasks/resume':
        return await resumeTask(request, env);
      
      case '/api/tasks/stop':
        return await stopTask(request, env);
      
      case '/api/calendar':
        return await getCalendarData(request, env);
      
      default:
        // 返回 HTML
        return new Response(HTML_CONTENT, {
          headers: {
            'Content-Type': 'text/html;charset=UTF-8',
          }
        });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders()
    });
  }
}

// 获取所有任务
async function handleTasks(request, env) {
  if (request.method === 'GET') {
    const tasks = await env.TIME_TRACKER_KV.get('tasks', { type: 'json' }) || [];
    return new Response(JSON.stringify(tasks), {
      headers: corsHeaders()
    });
  }
  
  return new Response('Method not allowed', { status: 405 });
}

// 获取当前任务
async function handleCurrentTask(request, env) {
  if (request.method === 'GET') {
    const current = await env.TIME_TRACKER_KV.get('current_task', { type: 'json' });
    return new Response(JSON.stringify(current || null), {
      headers: corsHeaders()
    });
  }
  
  return new Response('Method not allowed', { status: 405 });
}

// 开始新任务
async function startTask(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  const { name } = await request.json();
  
  if (!name) {
    return new Response(JSON.stringify({ error: 'Task name is required' }), {
      status: 400,
      headers: corsHeaders()
    });
  }
  
  // 检查是否有正在进行的任务
  const current = await env.TIME_TRACKER_KV.get('current_task', { type: 'json' });
  if (current) {
    return new Response(JSON.stringify({ error: 'A task is already in progress' }), {
      status: 400,
      headers: corsHeaders()
    });
  }
  
  const newTask = {
    id: Date.now().toString(),
    name,
    startTime: new Date().toISOString(),
    pausedDuration: 0,
    isPaused: false,
    color: generateTaskColor(name)
  };
  
  await env.TIME_TRACKER_KV.put('current_task', JSON.stringify(newTask));
  
  return new Response(JSON.stringify(newTask), {
    headers: corsHeaders()
  });
}

// 暂停任务
async function pauseTask(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  const current = await env.TIME_TRACKER_KV.get('current_task', { type: 'json' });
  if (!current) {
    return new Response(JSON.stringify({ error: 'No task in progress' }), {
      status: 400,
      headers: corsHeaders()
    });
  }
  
  if (current.isPaused) {
    return new Response(JSON.stringify({ error: 'Task is already paused' }), {
      status: 400,
      headers: corsHeaders()
    });
  }
  
  current.isPaused = true;
  current.pauseStartTime = new Date().toISOString();
  
  await env.TIME_TRACKER_KV.put('current_task', JSON.stringify(current));
  
  return new Response(JSON.stringify(current), {
    headers: corsHeaders()
  });
}

// 恢复任务
async function resumeTask(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  const current = await env.TIME_TRACKER_KV.get('current_task', { type: 'json' });
  if (!current) {
    return new Response(JSON.stringify({ error: 'No task in progress' }), {
      status: 400,
      headers: corsHeaders()
    });
  }
  
  if (!current.isPaused) {
    return new Response(JSON.stringify({ error: 'Task is not paused' }), {
      status: 400,
      headers: corsHeaders()
    });
  }
  
  // 计算暂停时长
  const pauseDuration = new Date() - new Date(current.pauseStartTime);
  current.pausedDuration += pauseDuration;
  current.isPaused = false;
  delete current.pauseStartTime;
  
  await env.TIME_TRACKER_KV.put('current_task', JSON.stringify(current));
  
  return new Response(JSON.stringify(current), {
    headers: corsHeaders()
  });
}

// 停止任务
async function stopTask(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  const current = await env.TIME_TRACKER_KV.get('current_task', { type: 'json' });
  if (!current) {
    return new Response(JSON.stringify({ error: 'No task in progress' }), {
      status: 400,
      headers: corsHeaders()
    });
  }
  
  // 如果任务正在暂停中，先计算暂停时长
  if (current.isPaused) {
    const pauseDuration = new Date() - new Date(current.pauseStartTime);
    current.pausedDuration += pauseDuration;
  }
  
  // 计算总时长（减去暂停时间）
  const totalDuration = new Date() - new Date(current.startTime) - current.pausedDuration;
  current.endTime = new Date().toISOString();
  current.duration = totalDuration;
  
  // 保存到任务列表
  const tasks = await env.TIME_TRACKER_KV.get('tasks', { type: 'json' }) || [];
  tasks.push(current);
  await env.TIME_TRACKER_KV.put('tasks', JSON.stringify(tasks));
  
  // 清除当前任务
  await env.TIME_TRACKER_KV.delete('current_task');
  
  return new Response(JSON.stringify(current), {
    headers: corsHeaders()
  });
}

// 获取日历数据
async function getCalendarData(request, env) {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  const url = new URL(request.url);
  const year = parseInt(url.searchParams.get('year') || new Date().getFullYear());
  const month = parseInt(url.searchParams.get('month') || new Date().getMonth() + 1);
  
  const tasks = await env.TIME_TRACKER_KV.get('tasks', { type: 'json' }) || [];
  
  // 按日期分组任务
  const tasksByDate = {};
  tasks.forEach(task => {
    const date = new Date(task.startTime);
    if (date.getFullYear() === year && date.getMonth() + 1 === month) {
      const dateKey = date.toISOString().split('T')[0];
      if (!tasksByDate[dateKey]) {
        tasksByDate[dateKey] = [];
      }
      tasksByDate[dateKey].push({
        ...task,
        hours: Math.floor(task.duration / 3600000),
        minutes: Math.floor((task.duration % 3600000) / 60000)
      });
    }
  });
  
  return new Response(JSON.stringify(tasksByDate), {
    headers: corsHeaders()
  });
}

// 生成任务颜色
function generateTaskColor(taskName) {
  // 基于任务名称生成一致的颜色
  let hash = 0;
  for (let i = 0; i < taskName.length; i++) {
    hash = taskName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  }
};
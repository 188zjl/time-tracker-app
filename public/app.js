// 调试模式
const DEBUG = true;

// 调试日志函数
function debugLog(category, message, data = {}) {
    if (!DEBUG) return;
    
    const timestamp = new Date().toISOString();
    console.log(`[${category}] ${timestamp} - ${message}`, data);
    
    // 显示在页面上
    const debugPanel = document.getElementById('debug-panel');
    const debugLogs = document.getElementById('debug-logs');
    if (debugPanel && debugLogs) {
        debugPanel.classList.remove('hidden');
        const logEntry = document.createElement('div');
        logEntry.textContent = `[${category}] ${new Date().toLocaleTimeString()} - ${message} ${JSON.stringify(data)}`;
        debugLogs.appendChild(logEntry);
        
        // 保持最新的10条日志
        while (debugLogs.children.length > 10) {
            debugLogs.removeChild(debugLogs.firstChild);
        }
    }
}

// API 基础 URL
const API_BASE = window.location.origin;

// 全局状态
let currentTask = null;
let timerInterval = null;
let timerWorker = null;

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    debugLog('INIT', '应用初始化开始');
    
    // 初始化 Web Worker 用于计时器
    initTimerWorker();
    
    // 绑定事件
    bindEvents();
    
    // 恢复当前任务状态
    await restoreCurrentTask();
    
    // 加载日历
    await loadCalendar();
    
    debugLog('INIT', '应用初始化完成');
});

// 初始化计时器 Worker
function initTimerWorker() {
    debugLog('WORKER', '初始化 Web Worker');
    
    // 创建内联 Worker
    const workerCode = `
        let interval = null;
        
        self.onmessage = function(e) {
            const { command, data } = e.data;
            
            switch(command) {
                case 'start':
                    if (interval) clearInterval(interval);
                    interval = setInterval(() => {
                        self.postMessage({ type: 'tick' });
                    }, 1000);
                    break;
                    
                case 'stop':
                    if (interval) {
                        clearInterval(interval);
                        interval = null;
                    }
                    break;
            }
        };
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    
    try {
        timerWorker = new Worker(workerUrl);
        
        timerWorker.onmessage = (e) => {
            if (e.data.type === 'tick') {
                updateTimer();
            }
        };
        
        timerWorker.onerror = (error) => {
            debugLog('WORKER', 'Worker 错误', { error: error.message });
            // 降级到普通定时器
            useIntervalTimer();
        };
        
        debugLog('WORKER', 'Web Worker 初始化成功');
    } catch (error) {
        debugLog('WORKER', 'Web Worker 初始化失败，使用备用方案', { error: error.message });
        useIntervalTimer();
    }
}

// 使用普通定时器作为备用方案
function useIntervalTimer() {
    debugLog('TIMER', '使用 setInterval 定时器');
    
    if (currentTask && !currentTask.isPaused) {
        timerInterval = setInterval(updateTimer, 1000);
    }
}

// 绑定事件
function bindEvents() {
    debugLog('EVENTS', '绑定事件处理器');
    
    // 按钮事件
    document.getElementById('start-btn').addEventListener('click', showTaskModal);
    document.getElementById('pause-resume-btn').addEventListener('click', togglePause);
    document.getElementById('stop-btn').addEventListener('click', stopTask);
    
    // 模态框事件
    document.getElementById('confirm-task').addEventListener('click', startTask);
    document.getElementById('cancel-task').addEventListener('click', hideTaskModal);
    document.getElementById('task-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') startTask();
    });
    
    // 日历导航
    document.getElementById('prev-month').addEventListener('click', () => navigateMonth(-1));
    document.getElementById('next-month').addEventListener('click', () => navigateMonth(1));
    
    // 页面可见性变化
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 页面卸载前保存状态
    window.addEventListener('beforeunload', saveTaskState);
}

// 处理页面可见性变化
function handleVisibilityChange() {
    debugLog('VISIBILITY', `页面可见性: ${document.hidden ? '隐藏' : '可见'}`);
    
    if (!document.hidden && currentTask) {
        // 页面重新可见时，更新计时器显示
        updateTimer();
    }
}

// 保存任务状态到 localStorage
function saveTaskState() {
    if (currentTask) {
        debugLog('STATE', '保存任务状态到 localStorage', currentTask);
        localStorage.setItem('currentTask', JSON.stringify(currentTask));
        localStorage.setItem('lastUpdate', new Date().toISOString());
    } else {
        localStorage.removeItem('currentTask');
        localStorage.removeItem('lastUpdate');
    }
}

// 恢复当前任务
async function restoreCurrentTask() {
    debugLog('RESTORE', '尝试恢复任务状态');
    
    try {
        // 先从服务器获取
        const response = await fetch(`${API_BASE}/api/current`);
        const serverTask = await response.json();
        
        debugLog('RESTORE', '服务器任务状态', serverTask);
        
        // 再从 localStorage 获取
        const localTask = localStorage.getItem('currentTask');
        const lastUpdate = localStorage.getItem('lastUpdate');
        
        if (localTask) {
            debugLog('RESTORE', 'localStorage 任务状态', { 
                task: JSON.parse(localTask), 
                lastUpdate 
            });
        }
        
        // 决定使用哪个数据源
        if (serverTask) {
            currentTask = serverTask;
            updateUI();
            startTimer();
            debugLog('RESTORE', '使用服务器任务状态');
        } else if (localTask) {
            // 如果服务器没有任务但本地有，可能是网络问题
            currentTask = JSON.parse(localTask);
            updateUI();
            startTimer();
            debugLog('RESTORE', '使用本地任务状态（服务器无数据）');
        }
    } catch (error) {
        debugLog('RESTORE', '恢复任务失败', { error: error.message });
        
        // 尝试使用本地数据
        const localTask = localStorage.getItem('currentTask');
        if (localTask) {
            currentTask = JSON.parse(localTask);
            updateUI();
            startTimer();
            debugLog('RESTORE', '降级使用本地任务状态');
        }
    }
}

// 显示任务输入模态框
function showTaskModal() {
    debugLog('UI', '显示任务输入模态框');
    document.getElementById('task-modal').classList.remove('hidden');
    document.getElementById('task-input').focus();
}

// 隐藏任务输入模态框
function hideTaskModal() {
    debugLog('UI', '隐藏任务输入模态框');
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
    
    debugLog('TASK', '开始新任务', { name: taskName });
    
    try {
        const response = await fetch(`${API_BASE}/api/tasks/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: taskName })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '启动任务失败');
        }
        
        currentTask = await response.json();
        debugLog('TASK', '任务启动成功', currentTask);
        
        hideTaskModal();
        updateUI();
        startTimer();
        saveTaskState();
    } catch (error) {
        debugLog('TASK', '启动任务失败', { error: error.message });
        alert(error.message);
    }
}

// 切换暂停/恢复
async function togglePause() {
    if (!currentTask) return;
    
    const action = currentTask.isPaused ? 'resume' : 'pause';
    debugLog('TASK', `${action} 任务`);
    
    try {
        const response = await fetch(`${API_BASE}/api/tasks/${action}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `${action} 失败`);
        }
        
        currentTask = await response.json();
        debugLog('TASK', `任务 ${action} 成功`, currentTask);
        
        updateUI();
        
        if (currentTask.isPaused) {
            stopTimer();
        } else {
            startTimer();
        }
        
        saveTaskState();
    } catch (error) {
        debugLog('TASK', `${action} 任务失败`, { error: error.message });
        alert(error.message);
    }
}

// 停止任务
async function stopTask() {
    if (!currentTask) return;
    
    debugLog('TASK', '停止任务');
    
    try {
        const response = await fetch(`${API_BASE}/api/tasks/stop`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '停止任务失败');
        }
        
        const stoppedTask = await response.json();
        debugLog('TASK', '任务停止成功', stoppedTask);
        
        currentTask = null;
        stopTimer();
        updateUI();
        saveTaskState();
        
        // 刷新日历
        await loadCalendar();
    } catch (error) {
        debugLog('TASK', '停止任务失败', { error: error.message });
        alert(error.message);
    }
}

// 启动计时器
function startTimer() {
    debugLog('TIMER', '启动计时器');
    
    if (timerWorker) {
        timerWorker.postMessage({ command: 'start' });
    } else {
        // 备用方案
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(updateTimer, 1000);
    }
}

// 停止计时器
function stopTimer() {
    debugLog('TIMER', '停止计时器');
    
    if (timerWorker) {
        timerWorker.postMessage({ command: 'stop' });
    }
    
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
    
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('task-timer').textContent = timeString;
    
    // 每10秒保存一次状态
    if (seconds % 10 === 0) {
        saveTaskState();
    }
}

// 更新 UI
function updateUI() {
    debugLog('UI', '更新界面', { hasTask: !!currentTask });
    
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
    debugLog('CALENDAR', '加载日历数据', { year: currentYear, month: currentMonth });
    
    try {
        const response = await fetch(`${API_BASE}/api/calendar?year=${currentYear}&month=${currentMonth}`);
        const tasksByDate = await response.json();
        
        debugLog('CALENDAR', '日历数据加载成功', { dates: Object.keys(tasksByDate).length });
        
        renderCalendar(tasksByDate);
    } catch (error) {
        debugLog('CALENDAR', '加载日历失败', { error: error.message });
    }
}

function renderCalendar(tasksByDate) {
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    document.getElementById('calendar-month').textContent = `${currentYear}年 ${monthNames[currentMonth - 1]}`;
    
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';
    
    // 添加空白格子
    for (let i = 0; i < firstDay; i++) {
        grid.appendChild(createEmptyDay());
    }
    
    // 添加日期格子
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
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
    
    // 日期数字
    const dayNumber = document.createElement('div');
    dayNumber.className = 'text-sm text-gray-600 mb-1';
    dayNumber.textContent = day;
    div.appendChild(dayNumber);
    
    // 任务条形图
    if (tasks.length > 0) {
        const barsContainer = document.createElement('div');
        barsContainer.className = 'space-y-1';
        
        tasks.forEach(task => {
            const bar = document.createElement('div');
            bar.className = 'task-bar rounded cursor-pointer';
            bar.style.backgroundColor = task.color;
            bar.style.height = '4px';
            bar.style.width = `${Math.min(100, (task.duration / 3600000) * 25)}%`; // 4小时 = 100%
            
            // 悬停事件
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
    
    tooltip.innerHTML = `
        <div class="font-semibold">${task.name}</div>
        <div>${task.hours}小时 ${task.minutes}分钟</div>
    `;
    
    tooltip.style.left = `${rect.left + rect.width / 2}px`;
    tooltip.style.top = `${rect.top - 10}px`;
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

// 定期检查任务状态一致性
setInterval(async () => {
    if (currentTask) {
        debugLog('SYNC', '检查任务状态一致性');
        
        try {
            const response = await fetch(`${API_BASE}/api/current`);
            const serverTask = await response.json();
            
            if (!serverTask && currentTask) {
                debugLog('SYNC', '服务器无任务但本地有，可能需要同步');
                // 可以选择重新提交任务或清除本地状态
            }
        } catch (error) {
            debugLog('SYNC', '状态检查失败', { error: error.message });
        }
    }
}, 30000); // 每30秒检查一次
import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

// 调试日志函数
function debugLog(env, message, data = {}) {
  if (env.DEBUG === 'true') {
    console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, data);
  }
}

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
  
  debugLog(env, 'Incoming request', { 
    method: request.method, 
    path: path,
    headers: Object.fromEntries(request.headers)
  });

  // 处理 OPTIONS 请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    // API 路由
    if (path.startsWith('/api/')) {
      return await handleAPI(request, env, path);
    }
    
    // 静态文件
    return await getAssetFromKV(
      {
        request,
        waitUntil: ctx.waitUntil.bind(ctx),
      },
      {
        ASSET_NAMESPACE: env.__STATIC_CONTENT,
        ASSET_MANIFEST: JSON.parse(env.__STATIC_CONTENT_MANIFEST),
      }
    );
  } catch (error) {
    debugLog(env, 'Error handling request', { error: error.message, stack: error.stack });
    
    // 如果是404错误，返回index.html（用于SPA）
    if (error.status === 404) {
      try {
        const indexRequest = new Request(new URL('/', request.url).toString(), request);
        return await getAssetFromKV(
          {
            request: indexRequest,
            waitUntil: ctx.waitUntil.bind(ctx),
          },
          {
            ASSET_NAMESPACE: env.__STATIC_CONTENT,
            ASSET_MANIFEST: JSON.parse(env.__STATIC_CONTENT_MANIFEST),
          }
        );
      } catch (e) {
        return new Response('Not Found', { status: 404 });
      }
    }
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders()
    });
  }
}

// 处理 API 请求
async function handleAPI(request, env, path) {
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
      return new Response('Not Found', { status: 404 });
  }
}

// 获取所有任务
async function handleTasks(request, env) {
  debugLog(env, 'Getting all tasks');
  
  if (request.method === 'GET') {
    const tasks = await env.TIME_TRACKER_KV.get('tasks', { type: 'json' }) || [];
    debugLog(env, 'Retrieved tasks', { count: tasks.length });
    
    return new Response(JSON.stringify(tasks), {
      headers: corsHeaders()
    });
  }
  
  return new Response('Method not allowed', { status: 405 });
}

// 获取当前任务
async function handleCurrentTask(request, env) {
  debugLog(env, 'Getting current task');
  
  if (request.method === 'GET') {
    const current = await env.TIME_TRACKER_KV.get('current_task', { type: 'json' });
    debugLog(env, 'Current task', current);
    
    return new Response(JSON.stringify(current || null), {
      headers: corsHeaders()
    });
  }
  
  return new Response('Method not allowed', { status: 405 });
}

// 开始新任务
async function startTask(request, env) {
  debugLog(env, 'Starting new task');
  
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
    debugLog(env, 'Task already in progress', current);
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
  debugLog(env, 'Task started', newTask);
  
  return new Response(JSON.stringify(newTask), {
    headers: corsHeaders()
  });
}

// 暂停任务
async function pauseTask(request, env) {
  debugLog(env, 'Pausing task');
  
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
  debugLog(env, 'Task paused', current);
  
  return new Response(JSON.stringify(current), {
    headers: corsHeaders()
  });
}

// 恢复任务
async function resumeTask(request, env) {
  debugLog(env, 'Resuming task');
  
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
  debugLog(env, 'Task resumed', current);
  
  return new Response(JSON.stringify(current), {
    headers: corsHeaders()
  });
}

// 停止任务
async function stopTask(request, env) {
  debugLog(env, 'Stopping task');
  
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
  
  debugLog(env, 'Task stopped and saved', current);
  
  return new Response(JSON.stringify(current), {
    headers: corsHeaders()
  });
}

// 获取日历数据
async function getCalendarData(request, env) {
  debugLog(env, 'Getting calendar data');
  
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
  
  debugLog(env, 'Calendar data prepared', { year, month, daysWithTasks: Object.keys(tasksByDate).length });
  
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
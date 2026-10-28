// Direct HTTP sockets keep these local checks independent of proxy settings.
import http from 'node:http';
import {setTimeout as delay} from 'node:timers/promises';
import {resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

export function checkHealth(url = 'http://127.0.0.1:3000/api/health') {
  return new Promise((resolve, reject) => {
    const request = http.get(url, {agent: false}, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('error', reject);
      response.on('data', chunk => {
        body += chunk;
        if (body.length > 8192) request.destroy(Object.assign(new Error(), {code: 'INVALID_HEALTH'}));
      });
      response.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (response.statusCode !== 200 || data.ok !== true || data.database !== 'MySQL') throw new Error();
          resolve(data);
        } catch {
          reject(Object.assign(new Error(), {code: 'INVALID_HEALTH'}));
        }
      });
    });
    const timer = setTimeout(() => request.destroy(Object.assign(new Error(), {code: 'ETIMEDOUT'})), 2500);
    request.once('close', () => clearTimeout(timer));
    request.once('error', reject);
  });
}

async function main() {
  const mode = process.argv[2];
  if (!['db', 'health'].includes(mode)) {
    console.error('Usage: node scripts/check-local.mjs <db|health> [--wait=seconds]');
    return 1;
  }
  const seconds = Number(process.argv.find(arg => arg.startsWith('--wait='))?.slice(7) || 0);
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 120) return 1;
  let probe = checkHealth;
  if (mode === 'db') {
    const dotenv = await import('dotenv');
    dotenv.config({path: fileURLToPath(new URL('../.env', import.meta.url))});
    const mysql = await import('mysql2/promise');
    probe = async () => {
      let connection;
      try {
        connection = await mysql.createConnection({
          host: process.env.DB_HOST || '127.0.0.1',
          port: Number(process.env.DB_PORT || 3307),
          user: process.env.DB_USER || 'study',
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME || 'study_garden',
          connectTimeout: 1500
        });
        await connection.query({sql: 'SELECT 1', timeout: 2000});
      } finally {
        connection?.destroy();
      }
    };
  }
  const deadline = Date.now() + seconds * 1000;
  const transient = new Set(['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'PROTOCOL_CONNECTION_LOST', 'PROTOCOL_SEQUENCE_TIMEOUT', 'INVALID_HEALTH']);
  while (true) {
    try {
      await probe();
      console.log(mode === 'db' ? '数据库连接正常。' : '网页与数据库正常：http://127.0.0.1:3000/');
      return 0;
    } catch (error) {
      if (Date.now() < deadline && transient.has(error.code)) {
        await delay(500);
        continue;
      }
      const messages = {
        ECONNREFUSED: '没有服务监听：服务尚未启动或已经停止。',
        ETIMEDOUT: '连接超时：服务没有及时响应。',
        ER_ACCESS_DENIED_ERROR: '数据库账号或密码不匹配，请检查本地 .env。',
        ER_BAD_DB_ERROR: '指定数据库不存在，请检查 .env 中的库名或恢复备份。',
        INVALID_HEALTH: '端口有响应，但网页或数据库健康检查未通过。'
      };
      console.error(`${mode === 'db' ? '数据库' : '网页'}检查失败：${messages[error.code] || '请检查对应错误日志。'} (${error.code || 'UNKNOWN'})`);
      return 1;
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then(code => { process.exitCode = code; }).catch(error => {
    console.error(`检查工具无法运行，请确认 npm.cmd install 已完成。(${error.code || 'UNKNOWN'})`);
    process.exitCode = 1;
  });
}

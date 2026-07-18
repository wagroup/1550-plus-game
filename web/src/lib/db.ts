import dns from 'dns';
import mongoose from 'mongoose';

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined;
}

const cached = global.mongooseCache ?? { conn: null, promise: null };
global.mongooseCache = cached;

function uriMeta(uri: string) {
  const isSrv = uri.startsWith('mongodb+srv://');
  const host = uri.replace(/^mongodb(\+srv)?:\/\//, '').split('@')[1]?.split('/')[0]?.split('?')[0] ?? 'unknown';
  return { isSrv, host };
}

function agentLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
  runId = 'pre-fix'
) {
  // #region agent log
  fetch('http://127.0.0.1:7299/ingest/1b3633a8-57f6-425b-8865-b11250da8bca', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'cd75b7' },
    body: JSON.stringify({
      sessionId: 'cd75b7',
      runId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

async function connectWithDns(label: 'system' | 'public', uri: string) {
  if (label === 'public') {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  }

  agentLog('db.ts:connectWithDns', 'attempting mongoose.connect', {
    label,
    dnsServers: dns.getServers(),
    ...uriMeta(uri),
  }, label === 'system' ? 'A' : 'B');

  return mongoose.connect(uri, {
    bufferCommands: false,
    dbName: process.env.MONGODB_DB || undefined,
    serverSelectionTimeoutMS: 10000,
  });
}

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  agentLog('db.ts:connectDB', 'connectDB called', {
    hasUri: !!uri,
    dnsServers: dns.getServers(),
    hasDbName: !!process.env.MONGODB_DB,
    ...(uri ? uriMeta(uri) : {}),
  }, 'C');

  if (!uri) throw new Error('MONGODB_URI is not set');

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = (async () => {
      try {
        const conn = await connectWithDns('system', uri);
        agentLog('db.ts:connectDB', 'connected with system DNS', {
          host: conn.connection.host,
          db: conn.connection.name,
        }, 'A', 'pre-fix');
        return conn;
      } catch (err) {
        const e = err as NodeJS.ErrnoException & { syscall?: string; hostname?: string };
        agentLog('db.ts:connectDB', 'system DNS connect failed', {
          code: e.code,
          syscall: e.syscall,
          hostname: e.hostname,
          message: e.message,
        }, 'A', 'pre-fix');

        if (e.code === 'ECONNREFUSED' && e.syscall === 'querySrv' && uri.startsWith('mongodb+srv://')) {
          try {
            await mongoose.disconnect();
          } catch {
            /* ignore stale disconnect */
          }
          const conn = await connectWithDns('public', uri);
          agentLog('db.ts:connectDB', 'connected after public DNS fallback', {
            host: conn.connection.host,
            db: conn.connection.name,
          }, 'B', 'pre-fix');
          return conn;
        }

        throw err;
      }
    })();
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    cached.promise = null;
    cached.conn = null;
    throw err;
  }
}

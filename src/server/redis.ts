import { createClient, type RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;
let redisReady = false;
const DEFAULT_REPOSITORY_CACHE_TTL_SECONDS = Math.max(5, Number(process.env.REPOSITORY_CACHE_TTL_SECONDS || 30));
const REPOSITORY_CACHE_PREFIX = 'repo-cache';
const REPOSITORY_CACHE_INDEX_PREFIX = 'repo-cache-index';

export const getRedisClient = () => redisClient;

export const isRedisReady = () => redisReady && !!redisClient?.isOpen;

const getRepositoryCacheIndexKey = (repoId: string) => `${REPOSITORY_CACHE_INDEX_PREFIX}:${repoId}`;
const getRepositoryCacheKey = (repoId: string, suffix: string) => `${REPOSITORY_CACHE_PREFIX}:${repoId}:${suffix}`;

export const getRepositoryCacheTtlSeconds = () => DEFAULT_REPOSITORY_CACHE_TTL_SECONDS;

export const getCachedRepositoryJson = async <T>(repoId: string, suffix: string): Promise<T | null> => {
  if (!isRedisReady() || !redisClient) return null;

  try {
    const cached = await redisClient.get(getRepositoryCacheKey(repoId, suffix));
    if (!cached || typeof cached !== 'string') return null;
    return JSON.parse(cached) as T;
  } catch (error) {
    console.error('Redis repository cache read error:', error);
    return null;
  }
};

export const setCachedRepositoryJson = async <T>(
  repoId: string,
  suffix: string,
  value: T,
  ttlSeconds = DEFAULT_REPOSITORY_CACHE_TTL_SECONDS
) => {
  if (!isRedisReady() || !redisClient) return;

  const cacheKey = getRepositoryCacheKey(repoId, suffix);
  const indexKey = getRepositoryCacheIndexKey(repoId);
  const normalizedTtl = Math.max(5, ttlSeconds);

  try {
    const multi = redisClient.multi();
    multi.set(cacheKey, JSON.stringify(value), { EX: normalizedTtl });
    multi.sAdd(indexKey, cacheKey);
    multi.expire(indexKey, Math.max(normalizedTtl * 4, normalizedTtl + 60));
    await multi.exec();
  } catch (error) {
    console.error('Redis repository cache write error:', error);
  }
};

export const getOrSetCachedRepositoryJson = async <T>(
  repoId: string,
  suffix: string,
  loader: () => Promise<T>,
  ttlSeconds = DEFAULT_REPOSITORY_CACHE_TTL_SECONDS
): Promise<T> => {
  const cached = await getCachedRepositoryJson<T>(repoId, suffix);
  if (cached !== null) return cached;

  const value = await loader();
  await setCachedRepositoryJson(repoId, suffix, value, ttlSeconds);
  return value;
};

export const invalidateRepositoryCache = async (repoId: string) => {
  if (!isRedisReady() || !redisClient) return;

  const indexKey = getRepositoryCacheIndexKey(repoId);

  try {
    const keys = await redisClient.sMembers(indexKey);
    if (keys.length > 0) {
      await redisClient.del(keys as string[]);
    }
    await redisClient.del(indexKey);
  } catch (error) {
    console.error('Redis repository cache invalidation error:', error);
  }
};

export const initializeRedis = async () => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.log('Redis disabled: REDIS_URL is not set');
    return null;
  }

  if (redisClient?.isOpen) return redisClient;

  redisClient = createClient({ url: redisUrl });
  redisClient.on('error', (error) => {
    redisReady = false;
    console.error('Redis client error:', error);
  });
  redisClient.on('ready', () => {
    redisReady = true;
    console.log('Redis connected');
  });
  redisClient.on('end', () => {
    redisReady = false;
    console.warn('Redis disconnected');
  });

  // High-Fidelity Connection Protocol: 2-second timeout to prevent serverless hang
  const connectPromise = redisClient.connect();
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Redis connection timeout')), 2000)
  );

  try {
    await Promise.race([connectPromise, timeoutPromise]);
    return redisClient;
  } catch (error) {
    console.error('Institutional Warning: Redis connection failed or timed out:', error);
    // Ensure we don't try to use a half-connected client
    if (redisClient) {
      redisClient.disconnect().catch(() => {});
      redisClient = null;
    }
    return null;
  }
};

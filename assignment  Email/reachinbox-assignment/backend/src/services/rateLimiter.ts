import { redis } from "../lib/redis";
import { env } from "../config/env";

const RESERVE_SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local current = tonumber(redis.call('GET', key) or '0')
if current >= limit then
  return -1
end
local next = redis.call('INCR', key)
if next == 1 then redis.call('EXPIRE', key, ttl) end
return next
`;

export async function reserveHourlySlot(sender: string, limit: number) {
  const hourWindow = new Date();
  hourWindow.setMinutes(0, 0, 0);
  const key = `email-rate:${sender}:${hourWindow.toISOString()}`;
  const secondsLeft = Math.max(
    1,
    Math.floor((hourWindow.getTime() + 60 * 60 * 1000 - Date.now()) / 1000),
  );

  const result = await redis.eval(
    RESERVE_SCRIPT,
    1,
    key,
    String(limit),
    String(secondsLeft + 60),
  );

  return {
    allowed: Number(result) !== -1,
    nextHour: new Date(hourWindow.getTime() + 60 * 60 * 1000),
  };
}

const MIN_DELAY_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local delay = tonumber(ARGV[2])
local last = tonumber(redis.call('GET', key) or '0')
local next = math.max(now, last + delay)
redis.call('SET', key, next, 'PX', delay * 2 + 60000)
return next - now
`;

export async function reserveMinimumDelay(sender: string, delayMs: number) {
  if (delayMs <= 0) return 0;

  const waitMs = await redis.eval(
    MIN_DELAY_SCRIPT,
    1,
    `email-delay:${sender}`,
    String(Date.now()),
    String(delayMs),
  );

  return Number(waitMs);
}

export function globalHourlyLimit() {
  return env.MAX_EMAILS_PER_HOUR;
}

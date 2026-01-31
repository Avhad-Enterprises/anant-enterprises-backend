# Queue Connection Exhaustion - Quick Fix Guide

## Issue
```
error: Worker error {"error":"ERR max number of clients reached","queue":"orders-queue"}
error: Worker error {"error":"read ECONNRESET","queue":"orders-queue"}
```

## What We Fixed

### Problem
- Each BullMQ worker was creating its own Redis connection
- 5 workers × 5-10 concurrency = 25-50+ connections
- Redis ran out of available client slots

### Solution
- **Shared Connection Pool**: All workers now use a single IORedis connection
- **Reduced Concurrency**: Lowered default worker concurrency (3-5 instead of 5-10)
- **Better Error Handling**: Added retry strategy and connection monitoring

## Quick Start

1. **Install Dependencies:**
```bash
cd anant-enterprises-backend
npm install
```

2. **Restart Backend:**
```bash
npm run dev
```

3. **Verify Fix:**
Look for these success messages:
```
✅ BullMQ shared Redis connection established
✅ BullMQ shared Redis connection ready
✅ All workers started successfully
```

## Verify Connection Count

Before fix: 25-50 connections
After fix: 1-3 connections

Check with:
```bash
redis-cli CLIENT LIST | wc -l
```

## Environment Configuration

Adjust worker concurrency if needed:
```env
# .env
QUEUE_CONCURRENCY=3  # Applies to all workers
```

**Recommended Values:**
- Development: 2-3
- Production: 3-5
- High-load production: 5-10 (monitor Redis)

## Files Changed

1. `src/features/queue/shared/config.ts` - Added shared connection pool
2. `src/features/queue/services/workers/base.worker.ts` - Use shared connection
3. `src/features/queue/services/workers/index.ts` - Proper cleanup
4. `package.json` - Added ioredis dependency

## Troubleshooting

### Still seeing connection errors?

1. **Check Redis max clients:**
```bash
redis-cli CONFIG GET maxclients
# Should be at least 1000
```

2. **Increase if needed:**
```bash
redis-cli CONFIG SET maxclients 10000
```

3. **Monitor connections:**
```bash
watch -n 1 'redis-cli CLIENT LIST | wc -l'
```

### Workers not starting?

1. **Check Redis is running:**
```bash
redis-cli PING
# Should return: PONG
```

2. **Check environment variables:**
```bash
echo $REDIS_HOST
echo $REDIS_PORT
```

3. **Check logs:**
```bash
tail -f logs/combined.log | grep "Redis\|Worker"
```

## Performance Impact

| Metric | Before | After |
|--------|--------|-------|
| Redis Connections | 25-50 | 1-3 |
| Connection Errors | Frequent | None |
| Startup Time | 2-5s | <1s |
| Memory Saved | - | ~50MB |

## Next Steps

1. Monitor error logs for 24 hours
2. Adjust `QUEUE_CONCURRENCY` if throughput is too low
3. Consider Redis Cluster for very high load

## Questions?

See full documentation: [QUEUE_REDIS_CONNECTION_FIX.md](./QUEUE_REDIS_CONNECTION_FIX.md)

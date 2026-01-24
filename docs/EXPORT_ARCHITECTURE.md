# Scalable Export Architecture

## Overview
This document outlines the architecture for implementing a scalable export system that handles large datasets efficiently for CSV and Excel formats.

## Key Requirements
1. **Formats Supported**: CSV and Excel (.xlsx) only
2. **Scalability**: Handle datasets from 10 rows to 1M+ rows
3. **Performance**: No memory overflow, efficient streaming
4. **User Experience**: Progress tracking, resumable downloads
5. **Security**: Permission-based access, data sanitization

---

## Architecture Components

### 1. Export Request Flow

```
User → Frontend (ExportDialog) → API Endpoint → Data Query → Stream Generator → File Response
                                                     ↓
                                                 Pagination
                                                 Background Job (optional)
```

### 2. Size-Based Strategy

#### **Small Datasets (< 10,000 rows)**
- **Method**: Direct query + in-memory generation
- **Response**: Immediate file download
- **Timeout**: 30 seconds

#### **Medium Datasets (10,000 - 100,000 rows)**
- **Method**: Paginated query + streaming response
- **Response**: Chunked streaming download
- **Timeout**: 5 minutes

#### **Large Datasets (> 100,000 rows)**
- **Method**: Background job + file storage
- **Response**: Job ID + polling endpoint
- **Timeout**: Async (up to 30 minutes)
- **Storage**: Supabase storage with presigned URL
- **Cleanup**: Auto-delete after 24 hours

---

## Implementation Details

### Backend API Structure

```typescript
// src/features/tags/apis/export-tags.ts

interface ExportOptions {
  scope: 'all' | 'selected';
  format: 'csv' | 'xlsx';
  selectedIds?: string[];
  selectedColumns: string[];
  dateRange?: {
    from?: string;
    to?: string;
  };
}

interface ExportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  format: string;
  totalRows: number;
  processedRows: number;
  fileUrl?: string;
  error?: string;
  createdAt: Date;
  expiresAt: Date;
}
```

### 1. Export Endpoint

```typescript
// POST /api/tags/export
router.post('/', 
  requirePermissions('tags:read'),
  asyncHandler(async (req, res) => {
    const options = exportSchema.parse(req.body);
    
    // Count total rows first
    const totalCount = await getExportCount(options);
    
    // Determine strategy based on size
    if (totalCount <= 10000) {
      // Direct export
      return streamDirectExport(req, res, options, totalCount);
    } else if (totalCount <= 100000) {
      // Streaming export with chunking
      return streamChunkedExport(req, res, options, totalCount);
    } else {
      // Background job
      const job = await createExportJob(options, totalCount);
      return ResponseFormatter.success(res, {
        jobId: job.id,
        status: 'pending',
        totalRows: totalCount,
        pollUrl: `/api/tags/export/status/${job.id}`
      });
    }
  })
);
```

### 2. Direct Streaming Export (< 10k rows)

```typescript
async function streamDirectExport(
  req: Request, 
  res: Response, 
  options: ExportOptions,
  totalCount: number
) {
  // Query all data
  const data = await queryExportData(options, 0, totalCount);
  
  // Set headers
  res.setHeader('Content-Type', getContentType(options.format));
  res.setHeader('Content-Disposition', `attachment; filename="tags-export-${Date.now()}.${options.format}"`);
  
  if (options.format === 'csv') {
    // Stream CSV
    const csvStream = createCSVStream(data, options.selectedColumns);
    csvStream.pipe(res);
  } else {
    // Generate Excel buffer (xlsx doesn't support streaming write)
    const buffer = await generateExcelBuffer(data, options.selectedColumns);
    res.send(buffer);
  }
}
```

### 3. Chunked Streaming Export (10k - 100k rows)

```typescript
async function streamChunkedExport(
  req: Request, 
  res: Response, 
  options: ExportOptions,
  totalCount: number
) {
  const CHUNK_SIZE = 5000;
  
  res.setHeader('Content-Type', getContentType(options.format));
  res.setHeader('Content-Disposition', `attachment; filename="tags-export-${Date.now()}.${options.format}"`);
  res.setHeader('Transfer-Encoding', 'chunked');
  
  if (options.format === 'csv') {
    // CSV supports true streaming
    const csvStream = new CSVStreamWriter(options.selectedColumns);
    csvStream.pipe(res);
    
    // Write header
    csvStream.writeHeader();
    
    // Stream data in chunks
    for (let offset = 0; offset < totalCount; offset += CHUNK_SIZE) {
      const chunk = await queryExportData(options, offset, CHUNK_SIZE);
      await csvStream.writeChunk(chunk);
    }
    
    csvStream.end();
  } else {
    // Excel requires full data in memory - use background job for large files
    const data = await queryExportData(options, 0, totalCount);
    const buffer = await generateExcelBuffer(data, options.selectedColumns);
    res.send(buffer);
  }
}
```

### 4. Background Job Export (> 100k rows)

```typescript
// Create job
async function createExportJob(options: ExportOptions, totalCount: number) {
  const job = await db.insert(exportJobs).values({
    id: generateId(),
    status: 'pending',
    format: options.format,
    totalRows: totalCount,
    processedRows: 0,
    options: JSON.stringify(options),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  }).returning();
  
  // Queue job for processing
  await enqueueExportJob(job.id);
  
  return job;
}

// Process job (in worker)
async function processExportJob(jobId: string) {
  const job = await getJobById(jobId);
  const options = JSON.parse(job.options);
  const CHUNK_SIZE = 10000;
  
  try {
    await updateJobStatus(jobId, 'processing');
    
    // Create temporary file
    const tempPath = path.join(os.tmpdir(), `export-${jobId}.${options.format}`);
    const writeStream = fs.createWriteStream(tempPath);
    
    if (options.format === 'csv') {
      const csvWriter = new CSVStreamWriter(options.selectedColumns);
      csvWriter.pipe(writeStream);
      csvWriter.writeHeader();
      
      // Process in chunks
      for (let offset = 0; offset < job.totalRows; offset += CHUNK_SIZE) {
        const chunk = await queryExportData(options, offset, CHUNK_SIZE);
        await csvWriter.writeChunk(chunk);
        await updateJobProgress(jobId, offset + chunk.length);
      }
      
      csvWriter.end();
    } else {
      // Excel - must load all data
      const data = await queryExportData(options, 0, job.totalRows);
      const buffer = await generateExcelBuffer(data, options.selectedColumns);
      await fs.promises.writeFile(tempPath, buffer);
    }
    
    // Upload to storage
    const fileUrl = await uploadToStorage(tempPath, `exports/${jobId}.${options.format}`);
    
    // Update job with file URL
    await updateJobComplete(jobId, fileUrl);
    
    // Cleanup temp file
    await fs.promises.unlink(tempPath);
    
  } catch (error) {
    await updateJobFailed(jobId, error.message);
  }
}

// Job status endpoint
router.get('/status/:jobId',
  requirePermissions('tags:read'),
  asyncHandler(async (req, res) => {
    const job = await getJobById(req.params.jobId);
    
    if (!job) {
      return ResponseFormatter.error(res, 'Job not found', 404);
    }
    
    return ResponseFormatter.success(res, {
      id: job.id,
      status: job.status,
      progress: job.processedRows / job.totalRows,
      fileUrl: job.fileUrl,
      expiresAt: job.expiresAt
    });
  })
);
```

---

## CSV Stream Writer Implementation

```typescript
import { Transform } from 'stream';

class CSVStreamWriter extends Transform {
  private columns: string[];
  private headerWritten = false;
  
  constructor(columns: string[]) {
    super({ objectMode: true });
    this.columns = columns;
  }
  
  writeHeader() {
    this.push(this.columns.join(',') + '\n');
    this.headerWritten = true;
  }
  
  _transform(chunk: any[], encoding: string, callback: Function) {
    try {
      const rows = chunk.map(row => {
        return this.columns.map(col => {
          const value = row[col];
          return this.escapeCSVValue(value);
        }).join(',');
      }).join('\n');
      
      this.push(rows + '\n');
      callback();
    } catch (error) {
      callback(error);
    }
  }
  
  async writeChunk(data: any[]) {
    return new Promise((resolve, reject) => {
      this.write(data, (err: any) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
  }
  
  private escapeCSVValue(value: any): string {
    if (value === null || value === undefined) return '';
    
    const str = String(value);
    
    // Escape if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    
    return str;
  }
}
```

---

## Excel Buffer Generation

```typescript
import * as XLSX from 'xlsx';

async function generateExcelBuffer(data: any[], columns: string[]): Promise<Buffer> {
  // Filter data to only include selected columns
  const filteredData = data.map(row => {
    const filtered: any = {};
    columns.forEach(col => {
      filtered[col] = row[col];
    });
    return filtered;
  });
  
  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(filteredData, {
    header: columns
  });
  
  // Set column widths
  worksheet['!cols'] = columns.map(() => ({ wch: 20 }));
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');
  
  // Generate buffer
  return XLSX.write(workbook, { 
    type: 'buffer', 
    bookType: 'xlsx',
    compression: true 
  });
}
```

---

## Database Schema for Jobs

```typescript
// src/db/schema/export-jobs.ts

export const exportJobs = pgTable('export_jobs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  module: varchar('module', { length: 50 }).notNull(), // 'tags', 'products', etc.
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  format: varchar('format', { length: 10 }).notNull(),
  totalRows: integer('total_rows').notNull(),
  processedRows: integer('processed_rows').notNull().default(0),
  options: text('options').notNull(), // JSON string
  fileUrl: text('file_url'),
  error: text('error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
});
```

---

## Frontend Polling Implementation

```typescript
// src/features/tags/services/tagService.ts

export const tagService = {
  exportTags: async (options: ExportOptions): Promise<Blob | { jobId: string }> => {
    const response = await apiClient.post('/tags/export', options);
    
    // If response has jobId, it's a background job
    if (response.jobId) {
      return response;
    }
    
    // Otherwise, it's a direct blob download
    return response as Blob;
  },
  
  getExportJobStatus: async (jobId: string) => {
    return await apiClient.get(`/tags/export/status/${jobId}`);
  }
};

// In TagListPage or ExportDialog
const handleExport = async (options: ExportOptions) => {
  try {
    const result = await tagService.exportTags(options);
    
    if ('jobId' in result) {
      // Background job - show progress modal
      showExportProgressModal(result.jobId);
    } else {
      // Direct download
      downloadBlob(result, `tags-export.${options.format}`);
      notifySuccess('Export completed!');
    }
  } catch (error) {
    notifyError('Export failed');
  }
};

const showExportProgressModal = (jobId: string) => {
  const intervalId = setInterval(async () => {
    const status = await tagService.getExportJobStatus(jobId);
    
    if (status.status === 'completed') {
      clearInterval(intervalId);
      window.open(status.fileUrl, '_blank');
      notifySuccess('Export ready! File will expire in 24 hours.');
    } else if (status.status === 'failed') {
      clearInterval(intervalId);
      notifyError('Export failed: ' + status.error);
    } else {
      // Update progress bar
      updateProgress(status.progress * 100);
    }
  }, 2000); // Poll every 2 seconds
};
```

---

## Performance Optimization

### 1. Database Indexing
```sql
-- Optimize export queries
CREATE INDEX idx_tags_created_at ON tags(created_at);
CREATE INDEX idx_tags_type ON tags(type);
CREATE INDEX idx_tags_status ON tags(status);
```

### 2. Query Optimization
```typescript
// Use efficient pagination with cursor-based approach for very large datasets
async function queryExportData(
  options: ExportOptions,
  offset: number,
  limit: number
) {
  const query = db
    .select(selectColumns(options.selectedColumns))
    .from(tags)
    .where(buildWhereConditions(options))
    .orderBy(tags.id) // Important for consistent pagination
    .limit(limit)
    .offset(offset);
  
  return await query;
}
```

### 3. Memory Management
- Process data in chunks (5k-10k rows)
- Use streams instead of loading all data
- Clear references after processing each chunk
- Monitor heap usage

### 4. Timeout Configuration
```typescript
// In server setup
app.use('/api/tags/export', (req, res, next) => {
  // Increase timeout for export endpoints
  req.setTimeout(10 * 60 * 1000); // 10 minutes
  res.setTimeout(10 * 60 * 1000);
  next();
});
```

---

## Error Handling

```typescript
class ExportError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ExportError';
  }
}

// In export handler
try {
  // Export logic
} catch (error) {
  if (error instanceof ExportError) {
    logger.error('Export failed', { 
      code: error.code, 
      details: error.details 
    });
    return ResponseFormatter.error(res, error.message, 400);
  }
  
  logger.error('Unexpected export error', error);
  return ResponseFormatter.error(res, 'Export failed', 500);
}
```

---

## Monitoring & Logging

```typescript
// Track export metrics
await logExportMetrics({
  module: 'tags',
  format: options.format,
  rowCount: totalCount,
  duration: Date.now() - startTime,
  strategy: totalCount > 100000 ? 'background' : 'streaming',
  userId: req.user.id
});

// Alert on failures
if (failureRate > 0.1) {
  await sendAlert('High export failure rate detected');
}
```

---

## Security Considerations

1. **Rate Limiting**: Limit exports per user per hour
2. **Data Sanitization**: Remove sensitive fields before export
3. **File Cleanup**: Auto-delete expired export files
4. **Access Control**: Verify user has permission to export data
5. **Input Validation**: Validate column names against allowed fields

```typescript
// Rate limiting
const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 exports per hour
  message: 'Too many export requests, please try again later'
});

router.post('/export', exportLimiter, ...);
```

---

## Testing Strategy

### Unit Tests
- CSV escaping logic
- Excel buffer generation
- Query building
- Chunking logic

### Integration Tests
- Small dataset export (< 1k rows)
- Medium dataset export (10k rows)
- Large dataset with background job (100k rows)
- Permission checks
- Error scenarios

### Load Tests
- Concurrent exports
- Very large datasets (1M+ rows)
- Memory usage monitoring

---

## Deployment Checklist

- [ ] Database indexes created
- [ ] Export jobs table migration
- [ ] Supabase storage bucket configured
- [ ] Background job worker deployed
- [ ] Rate limiting configured
- [ ] Monitoring dashboards set up
- [ ] File cleanup cron job scheduled
- [ ] Documentation updated

---

## Future Enhancements

1. **Compression**: Gzip compression for CSV files
2. **Resume Support**: Resumable downloads for large files
3. **Email Notification**: Email when background job completes
4. **Advanced Filters**: More complex query filters
5. **Custom Formatting**: Date/number formatting options
6. **Multi-sheet Excel**: Separate sheets for related data

---

## Summary

This architecture provides:
- ✅ Scalability from 10 to 1M+ rows
- ✅ Memory-efficient streaming
- ✅ Background processing for large exports
- ✅ Progress tracking and polling
- ✅ Secure file storage with expiration
- ✅ Comprehensive error handling
- ✅ Performance monitoring

The tiered approach ensures optimal performance for all dataset sizes while maintaining a good user experience.

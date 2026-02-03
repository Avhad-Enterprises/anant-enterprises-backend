/**
 * Upload Import Templates to Supabase Storage
 * 
 * This script uploads CSV templates to the Supabase storage bucket
 * in the 'import-templates' folder for use in import functionality.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

import { logger } from '../../src/utils';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env.prod' : '.env.dev';
dotenv.config({ path: envFile });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SERVICE_ROLE_KEY;
const BUCKET_NAME = 'uploads';
const TEMPLATE_FOLDER = 'import-templates';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  logger.error('❌ Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client with service role key for admin access
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Upload a file to Supabase Storage
 */
async function uploadFile(
  localFilePath: string,
  storageFilePath: string
): Promise<string> {
  try {
    // Read file from local filesystem
    const fileBuffer = fs.readFileSync(localFilePath);
    const filename = path.basename(localFilePath);

    logger.info(`📤 Uploading ${filename} to ${storageFilePath}...`);

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storageFilePath, fileBuffer, {
        contentType: 'text/csv',
        cacheControl: '3600',
        upsert: true, // Replace if exists
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storageFilePath);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to generate public URL');
    }

    logger.info(`✅ Successfully uploaded: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error) {
    logger.error(`❌ Error uploading ${localFilePath}:`, error);
    throw error;
  }
}

/**
 * Main upload function
 */
async function main() {
  logger.info('🚀 Starting import template upload process...\n');

  // Get the absolute path to the admin templates directory
  const adminTemplatesPath = path.resolve(__dirname, '../../../anant-enterprises-admin/public/templates');
  logger.info(`📁 Templates directory: ${adminTemplatesPath}\n`);

  // Define templates to upload
  const templates = [
    {
      name: 'Tags Template',
      localPath: path.join(adminTemplatesPath, 'tags-template.csv'),
      storagePath: `${TEMPLATE_FOLDER}/tags-template.csv`,
    },
    {
      name: 'Tiers Template',
      localPath: path.join(adminTemplatesPath, 'tiers-template.csv'),
      storagePath: `${TEMPLATE_FOLDER}/tiers-template.csv`,
    },
    {
      name: 'Blogs Template',
      localPath: path.join(adminTemplatesPath, 'blogs-template.csv'),
      storagePath: `${TEMPLATE_FOLDER}/blogs-template.csv`,
    },
    {
      name: 'Customers Template',
      localPath: path.join(adminTemplatesPath, 'customers-template.csv'),
      storagePath: `${TEMPLATE_FOLDER}/customers-template.csv`,
    },
    {
      name: 'Products Template',
      localPath: path.join(adminTemplatesPath, 'products-template.csv'),
      storagePath: `${TEMPLATE_FOLDER}/products-template.csv`,
    },
  ];

  const results: { name: string; url: string }[] = [];

  // Upload each template
  for (const template of templates) {
    try {
      // Check if local file exists
      if (!fs.existsSync(template.localPath)) {
        logger.warn(`⚠️  File not found: ${template.localPath}, skipping...`);
        continue;
      }

      const url = await uploadFile(template.localPath, template.storagePath);
      results.push({ name: template.name, url });
    } catch (error) {
      logger.error(`Failed to upload ${template.name}:`, error);
    }
  }

  // Print summary
  logger.info('\n📊 Upload Summary:');
  logger.info('='.repeat(80));

  if (results.length === 0) {
    logger.error('❌ No templates were uploaded successfully');
  } else {
    results.forEach(({ name, url }) => {
      logger.info(`✅ ${name}`);
      logger.info(`   URL: ${url}\n`);
    });

    logger.info('\n📝 Next Steps:');
    logger.info('1. Update the import-export.config.ts files with the new URLs');
    logger.info('2. Remove local template files from public/templates if desired');
    logger.info('3. Test the import functionality with the new template URLs');
  }

  logger.info('='.repeat(80));
}

// Run the script
main()
  .then(() => {
    logger.info('\n✅ Upload process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('\n❌ Upload process failed:', error);
    process.exit(1);
  });

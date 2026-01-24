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

// Load environment variables
dotenv.config({ path: '.env.dev' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SERVICE_ROLE_KEY;
const BUCKET_NAME = 'uploads';
const TEMPLATE_FOLDER = 'import-templates';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
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
    
    console.log(`📤 Uploading ${filename} to ${storageFilePath}...`);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
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

    console.log(`✅ Successfully uploaded: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error) {
    console.error(`❌ Error uploading ${localFilePath}:`, error);
    throw error;
  }
}

/**
 * Main upload function
 */
async function main() {
  console.log('🚀 Starting import template upload process...\n');

  // Define templates to upload
  const templates = [
    {
      name: 'Tags Template',
      localPath: path.join(__dirname, '../../anant-enterprises-admin/public/templates/tags-template.csv'),
      storagePath: `${TEMPLATE_FOLDER}/tags-template.csv`,
    },
    {
      name: 'Tiers Template',
      localPath: path.join(__dirname, '../../anant-enterprises-admin/public/templates/tiers-template.csv'),
      storagePath: `${TEMPLATE_FOLDER}/tiers-template.csv`,
    },
    {
      name: 'Blogs Template',
      localPath: path.join(__dirname, '../../anant-enterprises-admin/public/templates/blogs-template.csv'),
      storagePath: `${TEMPLATE_FOLDER}/blogs-template.csv`,
    },
    {
      name: 'Customers Template',
      localPath: path.join(__dirname, '../../anant-enterprises-admin/public/templates/customers-template.csv'),
      storagePath: `${TEMPLATE_FOLDER}/customers-template.csv`,
    },
    // Add more templates here as needed
    // {
    //   name: 'Products Template',
    //   localPath: path.join(__dirname, '../../anant-enterprises-admin/public/templates/products-template.csv'),
    //   storagePath: `${TEMPLATE_FOLDER}/products-template.csv`,
    // },
  ];

  const results: { name: string; url: string }[] = [];

  // Upload each template
  for (const template of templates) {
    try {
      // Check if local file exists
      if (!fs.existsSync(template.localPath)) {
        console.warn(`⚠️  File not found: ${template.localPath}, skipping...`);
        continue;
      }

      const url = await uploadFile(template.localPath, template.storagePath);
      results.push({ name: template.name, url });
    } catch (error) {
      console.error(`Failed to upload ${template.name}:`, error);
    }
  }

  // Print summary
  console.log('\n📊 Upload Summary:');
  console.log('='.repeat(80));
  
  if (results.length === 0) {
    console.log('❌ No templates were uploaded successfully');
  } else {
    results.forEach(({ name, url }) => {
      console.log(`✅ ${name}`);
      console.log(`   URL: ${url}\n`);
    });
    
    console.log('\n📝 Next Steps:');
    console.log('1. Update the import-export.config.ts files with the new URLs');
    console.log('2. Remove local template files from public/templates if desired');
    console.log('3. Test the import functionality with the new template URLs');
  }

  console.log('='.repeat(80));
}

// Run the script
main()
  .then(() => {
    console.log('\n✅ Upload process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Upload process failed:', error);
    process.exit(1);
  });

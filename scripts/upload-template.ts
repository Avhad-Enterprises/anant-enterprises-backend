
import fs from 'fs';
import path from 'path';
import { supabase } from '../src/utils/supabase';

const TEMPLATE_PATH = String.raw`d:\Avhad Enterprises\Avant Enterprises\anant-enterprises-admin\public\templates\products-template.csv`;
const BUCKET_NAME = 'uploads';
const STORAGE_PATH = 'products-template.csv';

async function uploadTemplate() {
  try {
    console.log(`Reading template from: ${TEMPLATE_PATH}`);
    if (!fs.existsSync(TEMPLATE_PATH)) {
      console.error('Template file not found!');
      process.exit(1);
    }

    const fileContent = fs.readFileSync(TEMPLATE_PATH);

    console.log(`Uploading to Supabase Storage: ${BUCKET_NAME}/${STORAGE_PATH} ...`);

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(STORAGE_PATH, fileContent, {
        contentType: 'text/csv',
        upsert: true,
      });

    if (error) {
      console.error('Upload failed:', error.message);
      process.exit(1);
    }

    console.log('Upload successful!');
    console.log('Path:', data?.path);
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(STORAGE_PATH);
      
    console.log('Public URL:', publicUrlData.publicUrl);

  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

uploadTemplate();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://klteevegsvzqhtvdgsbr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsdGVldmVnc3Z6cWh0dmRnc2JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDM2NDMsImV4cCI6MjA4ODM3OTY0M30.o5cKXdpRQhsYdKZzklnV4Kl5I29Ht5TKwT2IluMwp20';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  console.log('Data:', data);
  console.log('Error:', error);
}

test();

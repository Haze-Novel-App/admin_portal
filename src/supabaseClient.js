import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qmnwjusineizolrpmcxq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtbndqdXNpbmVpem9scnBtY3hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODIwMzEsImV4cCI6MjA2OTM1ODAzMX0.H4c-2fpB2a-UyB1RrnsQQjtvx8JXB94ps-C2KuF9vm4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
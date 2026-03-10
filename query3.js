import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = 'https://qmnwjusineizolrpmcxq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtbndqdXNpbmVpem9scnBtY3hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODIwMzEsImV4cCI6MjA2OTM1ODAzMX0.H4c-2fpB2a-UyB1RrnsQQjtvx8JXB94ps-C2KuF9vm4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    const { data, error } = await supabase.from('chapters').select('*').order('created_at', { ascending: false }).limit(2);
    if (error) console.error(error);
    const output = data && data.length > 0 ? "COLUMNS: " + Object.keys(data[0]).join(', ') + "\n" + JSON.stringify(data[0], null, 2) : "No data";
    fs.writeFileSync('output.txt', output, 'utf8');
}

run();

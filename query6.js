import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = 'https://qmnwjusineizolrpmcxq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtbndqdXNpbmVpem9scnBtY3hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODIwMzEsImV4cCI6MjA2OTM1ODAzMX0.H4c-2fpB2a-UyB1RrnsQQjtvx8JXB94ps-C2KuF9vm4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    const { data: books, error: booksError } = await supabase.from('books').select('id, title, cover_url, status, created_at, synopsis').order('created_at', { ascending: false }).limit(10);
    const { data: chapters, error: chaptersError } = await supabase.from('chapters').select('id, book_id, title, content_url, status, created_at, word_count').order('created_at', { ascending: false }).limit(10);

    let out = "--- BOOKS ---\n";
    if (books) out += JSON.stringify(books, null, 2) + "\n";
    else out += booksError + "\n";

    out += "--- CHAPTERS ---\n";
    if (chapters) out += JSON.stringify(chapters, null, 2) + "\n";
    else out += chaptersError + "\n";

    fs.writeFileSync('output6.txt', out, 'utf8');
}

run();

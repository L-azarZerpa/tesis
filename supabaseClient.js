// supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5cGdjcnJvYmRydmVyZnJobmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NzA3OTMsImV4cCI6MjA4MDQ0Njc5M30.BtaM3y2L0kIEt7MjEf0giHh0H6UKNTgnl5XWvDL4sS8';

const supabaseUrl = 'https://cypgcrrobdrverfrhnav.supabase.co';

export const supabase = createClient(supabaseUrl, supabaseKey);
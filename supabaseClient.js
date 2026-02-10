// supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

export const supabase = createClient(supabaseUrl, supabaseKey);
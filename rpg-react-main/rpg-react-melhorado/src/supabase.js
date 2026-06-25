import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://mjbvslyfatzqrmrdqpwl.supabase.co';
export const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qYnZzbHlmYXR6cXJtcmRxcHdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MzA3NjIsImV4cCI6MjA5MjIwNjc2Mn0.Oomslg7gPS39VMW9QGW-BL_8ugezAR8-BZWf__9TrEM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

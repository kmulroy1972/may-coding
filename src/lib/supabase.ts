import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://acrwslnuvtmfkqrkvtgi.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjcndzbG51dnRtZmtxcmt2dGdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxNzgzNTksImV4cCI6MjA1ODc1NDM1OX0.5MBhsNCQhBMR2xyERzZzMkT0G_iRRawvIRiNNOWXZU4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
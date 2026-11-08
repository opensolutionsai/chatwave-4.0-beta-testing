// NexCall Supabase Client Config for Temp Calling Mode
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.43.4/+esm";

const supabaseUrl = "https://qnfxnwpqkotsdkhmymgn.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZnhud3Bxa290c2RraG15bWduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTI2NTQsImV4cCI6MjA5NjEyODY1NH0._bJiN-YLxsgD892DS1sF8WG5U60I7SBOfPdTPxX4Rvg";

export const supabase = createClient(supabaseUrl, supabaseKey);

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = process.env
  .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabase =
  SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    : null;

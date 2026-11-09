import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// The publishable key is designed for client apps. Never place a service-role/secret key here.
const supabaseUrl = "https://uotrkukemlpgvfobgbfd.supabase.co";
const supabasePublishableKey = "sb_publishable_cjwNhkZ-GgOSU2p30UvCfQ_8MzxUc2y";

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabasePublishableKey
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

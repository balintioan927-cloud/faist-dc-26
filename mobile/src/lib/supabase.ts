import 'react-native-url-polyfill/auto';

import { secureSessionStorage } from './secureStorage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

export const isSupabaseConfigured =
  supabaseUrl.startsWith('https://') &&
  supabasePublishableKey.startsWith('sb_publishable_');

// Supabase session tokens are kept in the device's encrypted secure storage.
// Never place a service_role key in an Expo app or EXPO_PUBLIC_ variable.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        storage: secureSessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

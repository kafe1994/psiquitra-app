import { createClient } from '@supabase/supabase-js';

// Variables de entorno de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Variables de Supabase no configuradas. Verifica SUPABASE_URL y SUPABASE_ANON_KEY');
}

// Cliente de Supabase para operaciones generales
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Cliente de Supabase con Service Role Key para operaciones administrativas
export const supabaseAdmin = supabaseServiceRoleKey ? createClient(
  supabaseUrl || '',
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
) : null;

// Verificar conexión
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    return !error;
  } catch (error) {
    console.error('❌ Error conectando a Supabase:', error);
    return false;
  }
};

export default supabase;
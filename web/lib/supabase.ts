import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ebzzfbifmorqqtdfvenz.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVienpmYmlmbW9ycXF0ZGZ2ZW56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NDY5MTEsImV4cCI6MjEwNjQyMjkxMX0.Z6VTFMK0B5B2jOZx6BVqYGOkDGxCb3xciRVyTKCjjGQ'

/** Brauzer va server uchun universal Supabase mijozi */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/** Faqat server uchun service_role huquqiga ega mijoz */
export function getServiceSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVienpmYmlmbW9ycXF0ZGZ2ZW56Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDg0NjkxMSwiZXhwIjoyMTA2NDIyOTExfQ.h4WmIB4CgX2N7qtybjJ8qrEevvKRUc71esgVOiSzAL4'
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })
}

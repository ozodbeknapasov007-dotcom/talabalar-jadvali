/** 03_hisobot_yasat.py yaratadigan students.json dagi bitta yozuv */
export interface Student {
  row: number // Excel'dagi qator raqami — serverga yozishda kalit
  tr: number
  shnum: string
  sana: string
  ism: string
  ota: string
  fish: string
  yon: string
  group: string
  pv: string
  pass_type: string
  pinfl: string
  dob: string
  ber: string
  sh_doc: string
  sh_qr: string
  mak: string
  doc_tur: string
  yil: string
  tel: string
  doc_file: string
  status: 'full' | 'chala' | 'yoq' | string
  pass_fish: string
  cert_fish: string
  name_match: string
  name_flag: '' | 'ok' | 'translit' | 'farq' | 'tekshir' | 'boshqa' | string
  verified: 'TASDIQLANDI' | 'KUTILMOQDA' | string
  /** Bazaga kiritilganligi tasdig'i (Excel 28-ustun, standart: KIRITILDI) */
  baza?: 'KIRITILDI' | 'KIRITILMAGAN' | string
  /** Safdan chiqarish / akademik ta'til buyrug'i (Excel 26–27-ustunlar) */
  buyruq?: string
  buyruq_sana?: string
  /** So'rovnomadan kiritilgan qo'shimcha ma'lumotlar */
  manzil_tuman?: string
  manzil_mfy?: string
  manzil_kocha?: string
  manzil_uy?: string
  manzil_toliq?: string
  qatnov?: string
  tel_shaxsiy?: string
  tel_otaona?: string
  tel_otaona_kim?: string
  sorovnoma_vaqti?: string
}

/** Qo'lda tahrirlanadigan maydonlar (eski app.js dagi STUDENT_EDIT_FIELDS) */
export const EDIT_FIELDS = [
  'ism', 'ota', 'group', 'pv', 'pinfl', 'dob', 'ber',
  'doc_tur', 'sh_doc', 'mak', 'yil', 'yon', 'shnum', 'tel',
  'buyruq', 'buyruq_sana',
] as const
export type EditField = (typeof EDIT_FIELDS)[number]
export type EditFields = Partial<Record<EditField, string>>

export type VerifyStatus = 'TASDIQLANDI' | 'KUTILMOQDA'
export type BazaStatus = 'KIRITILDI' | 'KIRITILMAGAN'

/** Python xizmati tushunadigan o'zgarishlar (scripts/remote_changes.json formati) */
export type Change =
  | { type: 'update_student'; data: { row: number; fields: EditFields; shnum?: string; pinfl?: string; ism?: string } }
  | { type: 'verify_student'; data: { row: number; status: VerifyStatus; shnum: string; pinfl: string; ism: string } }
  | { type: 'baza_student'; data: { row: number; status: BazaStatus; shnum: string; pinfl: string; ism: string } }
  | { type: 'delete_student'; data: { row: number; shnum: string; pinfl: string; ism: string; fish: string } }
  | { type: 'add_student'; data: EditFields }

export interface StudentsPayload {
  students: Student[]
  source: 'supabase' | 'local' | 'github'
  fetchedAt: string
}

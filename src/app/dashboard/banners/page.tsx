import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import BannersClient from './_components/BannersClient';

export type Banner = {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean | null;
  start_date: string | null;
  end_date: string | null;
  background_color: string | null;
  text_color: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export default async function BannersPage() {
  const cookieStore = cookies();
  const supabase = await createClient();

  const { data: banners, error } = await supabase
    .from('banners')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<Banner[]>();

  if (error) {
    console.error("Error fetching banners:", error);
  }

  return (
    <BannersClient initialBanners={banners ?? []} />
  );
} 
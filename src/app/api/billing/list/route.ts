import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createAdminClient();
  try {
    const { data: drafts } = await supabase
      .from('invoices')
      .select('*')
      .in('status', ['Draft', 'Draft-Incomplete'])
      .order('created_at', { ascending: false });

    const { data: sent } = await supabase
      .from('invoices')
      .select('*')
      .eq('status', 'Sent')
      .order('created_at', { ascending: false });

    return NextResponse.json({ drafts: drafts || [], sent: sent || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error' }, { status: 500 });
  }
}



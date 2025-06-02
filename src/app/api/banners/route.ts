import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const { data: banners, error } = await supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .or(`start_date.is.null,start_date.lte.${today}`)
      .or(`end_date.is.null,end_date.gte.${today}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching banners:', error);
      return NextResponse.json(
        { error: 'Error obteniendo banners' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: banners || [],
      count: banners?.length || 0
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 
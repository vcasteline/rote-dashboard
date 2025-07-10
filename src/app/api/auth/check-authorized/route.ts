import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    const authorizedEmails = process.env.AUTHORIZED_EMAILS?.split(',').map(email => email.trim()) || [];
    const isAuthorized = authorizedEmails.includes(email);

    return NextResponse.json({ 
      isAuthorized,
      email 
    });
  } catch (error) {
    console.error('Error verificando autorización:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
} 
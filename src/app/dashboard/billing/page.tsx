import { createAdminClient } from '@/lib/supabase/server';
import BillingClient from './_components/BillingClient';

export type InvoiceRow = {
  id: string;
  purchase_id: string | null;
  user_id: string | null;
  package_id: string | null;
  package_name: string | null;
  package_price: number | null;
  quantity: number | null;
  iva_percentage: number | null;
  subtotal: number | null;
  iva_amount: number | null;
  total: number | null;
  status: string | null;
  contifico_id: string | null;
  document_number: string | null;
  contifico_error?: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_address: string | null;
  customer_cedula: string | null;
  missing_fields: string[] | null;
  sent_at?: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export default async function BillingPage() {
  const supabase = createAdminClient();

  const { data: drafts } = await supabase
    .from('invoices')
    .select('*')
    .in('status', ['Draft', 'Draft-Incomplete'])
    .order('created_at', { ascending: false })
    .returns<InvoiceRow[]>();

  const { data: sent } = await supabase
    .from('invoices')
    .select('*')
    .eq('status', 'Sent')
    .order('created_at', { ascending: false })
    .returns<InvoiceRow[]>();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Facturación</h1>
      <BillingClient initialDrafts={drafts || []} initialSent={sent || []} />
    </div>
  );
}



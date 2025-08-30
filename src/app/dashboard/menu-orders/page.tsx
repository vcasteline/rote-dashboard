import { getMenuOrders } from './actions';
import MenuOrdersClient from './_components/MenuOrdersClient';
import { redirect } from 'next/navigation';

export default async function MenuOrdersPage() {
  const result = await getMenuOrders();

  if (!result.success) {
    // En caso de error, redirigir al dashboard principal con un mensaje
    console.error('Error loading menu orders:', result.error);
    redirect('/dashboard?error=menu-orders-load-failed');
  }

  return (
    <MenuOrdersClient initialOrders={result.orders || []} />
  );
}

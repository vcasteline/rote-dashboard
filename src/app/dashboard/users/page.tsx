import { getUsersWithPurchaseCount, getTodaysBirthdays } from './actions';
import UsersClient from './_components/UsersClient';

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = (await searchParams) || {};
  const pageParam = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const pageSizeParam = Array.isArray(sp.pageSize) ? sp.pageSize[0] : sp.pageSize;
  const qParam = Array.isArray(sp.q) ? sp.q[0] : sp.q;

  const page = Math.max(1, Number(pageParam) || 1);
  const pageSize = Math.max(1, Math.min(200, Number(pageSizeParam) || 50));
  const q = (qParam || '').toString();

  // Obtener usuarios paginados y cumpleaños del día en paralelo
  const [{ users, total }, birthdayUsers] = await Promise.all([
    getUsersWithPurchaseCount({ page, pageSize, searchTerm: q }),
    getTodaysBirthdays()
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <div className="text-sm text-gray-600">
          {total} usuario{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}
        </div>
      </div>
      
      <UsersClient 
        users={users} 
        total={total} 
        page={page} 
        pageSize={pageSize} 
        initialSearchTerm={q}
        birthdayUsers={birthdayUsers}
      />
    </div>
  );
} 
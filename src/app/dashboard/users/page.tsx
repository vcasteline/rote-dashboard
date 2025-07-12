import { getUsersWithPurchaseCount } from './actions';
import UsersClient from './_components/UsersClient';

export default async function UsersPage() {
  const users = await getUsersWithPurchaseCount();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <div className="text-sm text-gray-600">
          {users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}
        </div>
      </div>
      
      <UsersClient users={users} />
    </div>
  );
} 
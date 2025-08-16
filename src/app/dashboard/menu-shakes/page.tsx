import { getMenuItems } from './actions';
import MenuClient from './_components/MenuClient';

export default async function MenuPage() {
  const items = await getMenuItems();
  return (
    <div className="space-y-6">
    
      <MenuClient initialItems={items} />
    </div>
  );
}



'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type PurchaseData } from '../page';

// Helper para formatear fechas
const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    // Verificar que la fecha sea válida
    if (isNaN(date.getTime())) return 'N/A';
    
    // Formatear manualmente para asegurar dd/MM/yyyy
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    return 'N/A';
  }
};

// Helper para formatear moneda
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Helper para determinar el estado del paquete
const getPackageStatus = (purchase: PurchaseData) => {
  if (purchase.credits_remaining <= 0) {
    return { status: 'agotado', color: 'bg-red-100 text-red-800', text: 'Agotado' };
  }
  
  if (purchase.expiration_date) {
    const now = new Date();
    const expiration = new Date(purchase.expiration_date);
    if (expiration < now) {
      return { status: 'vencido', color: 'bg-red-100 text-red-800', text: 'Vencido' };
    }
    
    // Si vence en menos de 7 días
    const daysToExpire = Math.ceil((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysToExpire <= 7) {
      return { status: 'por-vencer', color: 'bg-yellow-100 text-yellow-800', text: `Vence en ${daysToExpire} días` };
    }
  }
  
  return { status: 'activo', color: 'bg-green-100 text-green-800', text: 'Activo' };
};

// Función para exportar a Excel (CSV)
const exportToExcel = (purchases: PurchaseData[], filters?: {
  searchTerm?: string;
  statusFilter?: string;
  dateFrom?: string;
  dateTo?: string;
}) => {
  // Crear headers
  const headers = [
    'Fecha Compra',
    'Cliente',
    'Email',
    'Teléfono',
    'Cédula',
    'Dirección',
    'Paquete',
    'Precio',
    'Créditos Totales',
    'Créditos Restantes',
    'Fecha Vencimiento',
    'Estado',
    'Código Autorización',
    'ID Transacción'
  ];

  // Crear filas de datos
  const rows = purchases.map(purchase => [
    formatDate(purchase.purchase_date),
    purchase.users?.name || 'N/A',
    purchase.users?.email || 'N/A',
    purchase.users?.phone || 'N/A',
    purchase.users?.cedula || 'N/A',
    purchase.users?.address || 'N/A',
    purchase.packages?.name || 'N/A',
    purchase.packages?.price || 0,
    purchase.packages?.class_credits || 0,
    purchase.credits_remaining,
    formatDate(purchase.expiration_date),
    getPackageStatus(purchase).text,
    purchase.authorization_code || 'N/A',
    purchase.transaction_id || 'N/A'
  ]);

  // Combinar headers y rows
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  // Generar nombre de archivo con información de filtros
  let fileName = 'paquetes_comprados';
  
  if (filters?.dateFrom || filters?.dateTo) {
    fileName += '_filtrado';
    if (filters.dateFrom && filters.dateTo) {
      fileName += `_${filters.dateFrom}_a_${filters.dateTo}`;
    } else if (filters.dateFrom) {
      fileName += `_desde_${filters.dateFrom}`;
    } else if (filters.dateTo) {
      fileName += `_hasta_${filters.dateTo}`;
    }
  }
  
  if (filters?.statusFilter && filters.statusFilter !== 'todos') {
    fileName += `_${filters.statusFilter}`;
  }
  
  fileName += `_${new Date().toISOString().slice(0, 16).replace(/[-T]/g, '_').replace(/:/g, '-')}.csv`;

  // Crear y descargar archivo
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Componente selector custom
function CustomSelect({ 
  value, 
  onChange, 
  options 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  options: { value: string; label: string }[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);
  const selectRef = useRef<HTMLDivElement>(null);

  // Cerrar el dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={selectRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 flex items-center justify-between"
      >
        <span>{selectedOption?.label || 'Seleccionar...'}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="py-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left hover:bg-gray-100 transition-colors ${
                  value === option.value ? 'bg-indigo-50 text-indigo-600' : 'text-gray-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PackagesClient({ purchases, total, page, pageSize, order, status, dateFrom: initialDateFrom, dateTo: initialDateTo, q: initialQ, filteredUser }: { purchases: PurchaseData[]; total: number; page: number; pageSize: number; order: 'asc' | 'desc'; status: string; dateFrom: string; dateTo: string; q: string; filteredUser: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(initialQ || '');
  const [statusFilter, setStatusFilter] = useState(status || 'todos');
  const [dateFrom, setDateFrom] = useState(initialDateFrom || '');
  const [dateTo, setDateTo] = useState(initialDateTo || '');

  // Funciones de atajo para fechas comunes
  const setDateShortcut = (type: 'today' | 'week' | 'month') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    switch (type) {
      case 'today':
        setDateFrom(todayStr);
        setDateTo(todayStr);
        break;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Domingo de esta semana
        setDateFrom(weekStart.toISOString().split('T')[0]);
        setDateTo(todayStr);
        break;
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        setDateFrom(monthStart.toISOString().split('T')[0]);
        setDateTo(todayStr);
        break;
    }
  };

  // Función para normalizar fecha a YYYY-MM-DD para comparación
  const normalizeDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toISOString().split('T')[0];
    } catch {
      return null;
    }
  };

  // Filtrar paquetes (sobre la página actual)
  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = 
      purchase.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.packages?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const packageStatus = getPackageStatus(purchase).status;
    const matchesStatus = statusFilter === 'todos' || packageStatus === statusFilter;

    // Filtro por fecha de compra
    const purchaseDate = normalizeDate(purchase.purchase_date);
    let matchesDateRange = true;
    
    if (dateFrom && purchaseDate) {
      matchesDateRange = matchesDateRange && purchaseDate >= dateFrom;
    }
    
    if (dateTo && purchaseDate) {
      matchesDateRange = matchesDateRange && purchaseDate <= dateTo;
    }

    return matchesSearch && matchesStatus && matchesDateRange;
  });

  // Navegación/paginación/sort
  const updateParams = (updates: Record<string, string | null | undefined>) => {
    const params = new URLSearchParams(searchParams?.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') params.delete(key);
      else params.set(key, value);
    });
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ''}`);
  };

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(total, (page - 1) * pageSize + purchases.length);

  const goToPage = (newPage: number) => {
    const safePage = Math.min(Math.max(1, newPage), pageCount);
    updateParams({ page: String(safePage), pageSize: String(pageSize), order, status: statusFilter || null, dateFrom: dateFrom || null, dateTo: dateTo || null, q: searchTerm || null });
  };

  // Sincronizar filtros a URL con debounce/reset de página
  useEffect(() => {
    const handle = setTimeout(() => {
      updateParams({ page: '1', pageSize: String(pageSize), order, status: statusFilter || null, dateFrom: dateFrom || null, dateTo: dateTo || null, q: searchTerm || null });
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, dateFrom, dateTo, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Controles superiores */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="space-y-6">
          {/* Primera fila: Búsqueda y Estado */}
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1 w-full lg:w-auto">
              {/* Búsqueda */}
              <div className="flex-1 min-w-80">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buscar paquetes
                </label>
                <input
                  type="text"
                  placeholder="Cliente, email o paquete..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                />
              </div>

              {/* Filtro por estado */}
              <div className="min-w-56">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado del paquete
                </label>
                <CustomSelect
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: 'todos', label: 'Todos los estados' },
                    { value: 'activo', label: 'Activos' },
                    { value: 'por-vencer', label: 'Por vencer' },
                    { value: 'vencido', label: 'Vencidos' },
                    { value: 'agotado', label: 'Agotados' }
                  ]}
                />
              </div>
              {/* Orden */}
              <div className="min-w-44">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ordenar por compra
                </label>
                <CustomSelect
                  value={order}
                  onChange={(val) => updateParams({ order: val, page: '1', pageSize: String(pageSize) })}
                  options={[
                    { value: 'desc', label: 'Más recientes primero' },
                    { value: 'asc', label: 'Más antiguos primero' },
                  ]}
                />
              </div>
            </div>

            {/* Indicador de filtros activos */}
            {(searchTerm || statusFilter !== 'todos' || dateFrom || dateTo || filteredUser) && (
              <div className="flex items-center flex-wrap gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filtros activos
                </span>
                {filteredUser && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Usuario: {filteredUser}
                    </span>
                    <button
                      onClick={() => window.location.href = '/dashboard/packages'}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      title="Limpiar filtro de usuario"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Segunda fila: Filtros por fecha */}
          <div className="border-t border-gray-100 pt-6">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">
                  Filtrar por fecha de compra
                </h3>
                
                {/* Botones de atajo */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setDateShortcut('today')}
                    className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 transition-colors"
                  >
                    Hoy
                  </button>
                  <button
                    onClick={() => setDateShortcut('week')}
                    className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 transition-colors"
                  >
                    Esta semana
                  </button>
                  <button
                    onClick={() => setDateShortcut('month')}
                    className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 transition-colors"
                  >
                    Este mes
                  </button>
                  {(dateFrom || dateTo) && (
                    <button
                      onClick={() => {
                        setDateFrom('');
                        setDateTo('');
                      }}
                      className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors text-sm"
                    >
                      Limpiar fechas
                    </button>
                  )}
                </div>
              </div>
              
              {/* Inputs de fecha */}
              <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Fecha desde
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  />
                </div>
                
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Fecha hasta
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  />
                </div>

                {/* Botón de exportar */}
                <div className="flex-shrink-0">
                  <a
                    href={`/api/purchases/export?order=${order}&status=${encodeURIComponent(statusFilter)}&dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}&q=${encodeURIComponent(searchTerm)}${filteredUser ? `&user=${encodeURIComponent(filteredUser)}` : ''}`}
                    className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 shadow-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Exportar Excel</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="text-center bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                {filteredPurchases.filter(p => getPackageStatus(p).status === 'activo').length}
              </div>
              <div className="text-sm text-gray-600">Activos</div>
            </div>
            <div className="text-center bg-yellow-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {filteredPurchases.filter(p => getPackageStatus(p).status === 'por-vencer').length}
              </div>
              <div className="text-sm text-gray-600">Por vencer</div>
            </div>
            <div className="text-center bg-red-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600">
                {filteredPurchases.filter(p => ['vencido', 'agotado'].includes(getPackageStatus(p).status)).length}
              </div>
              <div className="text-sm text-gray-600">Vencidos/Agotados</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de paquetes */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          {/* Barra de resumen y paginación */}
          <div className="flex items-center justify-between p-4 text-sm text-gray-600">
            <div>
              {total > 0 ? `Mostrando ${startIndex}-${endIndex} de ${total}` : '0 resultados'}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="px-2 py-1 text-sm rounded border disabled:opacity-50"
                title="Anterior"
              >
                «
              </button>
              <span className="text-sm text-gray-600">{page} / {Math.max(1, Math.ceil(total / pageSize))}</span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= Math.max(1, Math.ceil(total / pageSize))}
                className="px-2 py-1 text-sm rounded border disabled:opacity-50"
                title="Siguiente"
              >
                »
              </button>
            </div>
          </div>
          <table className="min-w-full leading-normal">
            <thead>
              <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-5 text-left">Cliente</th>
                <th className="py-3 px-5 text-left">Paquete</th>
                <th className="py-3 px-5 text-center">Créditos</th>
                <th className="py-3 px-5 text-center">Precio</th>
                <th className="py-3 px-5 text-center">Compra</th>
                <th className="py-3 px-5 text-center">Vencimiento</th>
                <th className="py-3 px-5 text-center">Estado</th>
                <th className="py-3 px-5 text-center">Detalles</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 text-sm font-light">
              {filteredPurchases.length > 0 ? (
                filteredPurchases.map((purchase) => {
                  const status = getPackageStatus(purchase);
                  return (
                    <tr key={purchase.id} className="border-b border-gray-200 hover:bg-gray-100">
                      <td className="py-3 px-5 text-left">
                        <div>
                          <div className="font-medium">{purchase.users?.name || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{purchase.users?.email}</div>
                          {purchase.users?.phone && (
                            <div className="text-xs text-gray-500">{purchase.users.phone}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-5 text-left">
                        <div className="font-medium">{purchase.packages?.name || 'N/A'}</div>
                        <div className="text-xs text-gray-500">
                          {purchase.packages?.class_credits} créditos totales
                        </div>
                      </td>
                      <td className="py-3 px-5 text-center">
                        <div className="font-medium">{purchase.credits_remaining}</div>
                        <div className="text-xs text-gray-500">restantes</div>
                      </td>
                      <td className="py-3 px-5 text-center font-medium">
                        {formatCurrency(purchase.packages?.price || 0)}
                      </td>
                      <td className="py-3 px-5 text-center">
                        {formatDate(purchase.purchase_date)}
                      </td>
                      <td className="py-3 px-5 text-center">
                        {formatDate(purchase.expiration_date)}
                      </td>
                      <td className="py-3 px-5 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-center">
                        <div className="text-xs text-gray-500">
                          {purchase.authorization_code && (
                            <div>Autorización: {purchase.authorization_code}</div>
                          )}
                          {purchase.transaction_id && (
                            <div>Transacción: {purchase.transaction_id}</div>
                          )}
                          {purchase.users?.cedula && (
                            <div>Cédula: {purchase.users.cedula}</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-6 px-5 text-center text-gray-500">
                    No se encontraron paquetes con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 
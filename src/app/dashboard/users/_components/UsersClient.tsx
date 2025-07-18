'use client';

import { useState, useEffect } from 'react';
import { User, Package, createUser, assignPackageToUser, createUserWithPackage, getAvailablePackages, updateUser } from '../actions';
import { DateTime } from 'luxon';
import { Mail, Phone, MapPin, Calendar, CreditCard, ShoppingBag, User as UserIcon, Cake, Search, X, Plus, UserPlus, Package as PackageIcon, Edit, Gift } from 'lucide-react';
import Link from 'next/link';

interface UsersClientProps {
  users: User[];
  onUserAdded?: (user: User) => void;
}

export default function UsersClient({ users, onUserAdded }: UsersClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string>('');
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userForPackage, setUserForPackage] = useState<User | null>(null);
  
  // Estados del formulario para crear usuario
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    address: '',
    birthday: '',
    cedula: '',
    shoe_size: '',
    package_id: '',
    transaction_id: '',
    authorization_code: ''
  });

  // Estados del formulario para editar usuario
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    address: '',
    birthday: '',
    cedula: '',
    shoe_size: ''
  });

  // Estados del formulario para asignar paquetes
  const [packageFormData, setPackageFormData] = useState({
    package_id: '',
    transaction_id: '',
    authorization_code: ''
  });
  
  // Cargar paquetes disponibles
  useEffect(() => {
    if (isModalOpen || isPackageModalOpen) {
      getAvailablePackages().then(setPackages);
    }
  }, [isModalOpen, isPackageModalOpen]);
  
  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      phone: '',
      address: '',
      birthday: '',
      cedula: '',
      shoe_size: '',
      package_id: '',
      transaction_id: '',
      authorization_code: ''
    });
    setGeneratedPassword('');
  };

  const resetEditForm = () => {
    setEditFormData({
      name: '',
      phone: '',
      address: '',
      birthday: '',
      cedula: '',
      shoe_size: ''
    });
  };

  const resetPackageForm = () => {
    setPackageFormData({
      package_id: '',
      transaction_id: '',
      authorization_code: ''
    });
  };

  // Función para abrir modal de edición
  const handleEditUser = (user: User) => {
    setUserToEdit(user);
    setEditFormData({
      name: user.name || '',
      phone: user.phone || '',
      address: user.address || '',
      birthday: user.birthday || '',
      cedula: user.cedula || '',
      shoe_size: user.shoe_size || ''
    });
    setIsEditModalOpen(true);
  };

  // Función para abrir modal de asignar paquetes
  const handleAssignPackage = (user: User) => {
    setUserForPackage(user);
    resetPackageForm();
    setIsPackageModalOpen(true);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const userData = {
        email: formData.email,
        name: formData.name,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        birthday: formData.birthday || undefined,
        cedula: formData.cedula || undefined,
        shoe_size: formData.shoe_size || undefined,
      };
      
      let result;
      
      if (formData.package_id) {
        // Crear usuario con paquete
        result = await createUserWithPackage(userData, {
          package_id: formData.package_id,
          transaction_id: formData.transaction_id || undefined,
          authorization_code: formData.authorization_code || undefined,
        });
      } else {
        // Crear usuario sin paquete
        result = await createUser(userData);
      }
      
      if (result.success && result.user) {
        if (result.password) {
          setGeneratedPassword(result.password);
          // No cerrar el modal todavía, mostrar la contraseña primero
        } else {
          resetForm();
          setIsModalOpen(false);
          if (onUserAdded) {
            onUserAdded(result.user);
          }
          // Reload the page to show the new user
          window.location.reload();
        }
      } else {
        alert(result.error || 'Error al crear el usuario');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error al crear el usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para actualizar usuario
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;

    setIsSubmitting(true);
    
    try {
      const result = await updateUser(userToEdit.id, {
        name: editFormData.name || undefined,
        phone: editFormData.phone || undefined,
        address: editFormData.address || undefined,
        birthday: editFormData.birthday || undefined,
        cedula: editFormData.cedula || undefined,
        shoe_size: editFormData.shoe_size || undefined,
      });
      
      if (result.success) {
        alert('Usuario actualizado correctamente');
        setIsEditModalOpen(false);
        setUserToEdit(null);
        resetEditForm();
        window.location.reload();
      } else {
        alert(result.error || 'Error al actualizar el usuario');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error al actualizar el usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para asignar paquete
  const handlePackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForPackage) return;

    setIsSubmitting(true);
    
    try {
      const result = await assignPackageToUser({
        user_id: userForPackage.id,
        package_id: packageFormData.package_id,
        transaction_id: packageFormData.transaction_id || undefined,
        authorization_code: packageFormData.authorization_code || undefined,
      });
      
      if (result.success) {
        alert('Paquete asignado correctamente');
        setIsPackageModalOpen(false);
        setUserForPackage(null);
        resetPackageForm();
        window.location.reload();
      } else {
        alert(result.error || 'Error al asignar el paquete');
      }
    } catch (error) {
      console.error('Error assigning package:', error);
      alert('Error al asignar el paquete');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para filtrar usuarios
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.phone?.toLowerCase().includes(searchLower) ||
      user.address?.toLowerCase().includes(searchLower) ||
      user.cedula?.toLowerCase().includes(searchLower) ||
      user.shoe_size?.toLowerCase().includes(searchLower)
    );
  });

  const formatBirthday = (dateString: string | null) => {
    if (!dateString) return 'No especificado';
    try {
      let dt;
      
      // Limpiar la fecha removiendo espacios
      const cleanDate = dateString.trim();
      
      // Caso 1: Formato sin separadores (ej: 12121999)
      if (/^\d{8}$/.test(cleanDate)) {
        const day = cleanDate.substring(0, 2);
        const month = cleanDate.substring(2, 4);
        const year = cleanDate.substring(4, 8);
        const formattedDate = `${day}/${month}/${year}`;
        dt = DateTime.fromFormat(formattedDate, 'dd/MM/yyyy');
      }
      // Caso 2: Formato DD/MM/YYYY
      else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleanDate)) {
        dt = DateTime.fromFormat(cleanDate, 'dd/MM/yyyy');
      }
      // Caso 3: Formato DD-MM-YYYY
      else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(cleanDate)) {
        dt = DateTime.fromFormat(cleanDate, 'dd-MM-yyyy');
      }
      // Caso 4: Formato DD.MM.YYYY
      else if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(cleanDate)) {
        dt = DateTime.fromFormat(cleanDate, 'dd.MM.yyyy');
      }
      // Caso 5: Formato ISO (YYYY-MM-DD)
      else if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(cleanDate)) {
        dt = DateTime.fromFormat(cleanDate, 'yyyy-MM-dd');
      }
      // Caso por defecto: intentar formato DD/MM/YYYY
      else {
        dt = DateTime.fromFormat(cleanDate, 'dd/MM/yyyy');
      }
      
      if (!dt.isValid) return 'Fecha inválida';
      return dt.toFormat('dd/MM/yyyy');
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  const formatRegistrationDate = (dateString: string | null) => {
    if (!dateString) return 'No especificado';
    try {
      // Las fechas de registro están en UTC, las convertimos a Ecuador
      const dt = DateTime.fromISO(dateString, { zone: 'utc' })
        .setZone('America/Guayaquil');
      if (!dt.isValid) return 'Fecha inválida';
      return dt.toFormat('dd/MM/yyyy HH:mm');
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">No hay usuarios registrados</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Buscar Usuarios</h3>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              {searchTerm ? `${filteredUsers.length} de ${users.length} usuarios` : `${users.length} usuarios`}
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-[#6758C2] text-white font-medium rounded-lg hover:bg-[#5A4AB8] transition-colors shadow-sm"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Agregar Usuario
            </button>
          </div>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, email, teléfono, cédula, dirección o talla..."
            className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6758C2] focus:border-transparent text-gray-900 placeholder-gray-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-700 transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contacto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Información Personal
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Paquetes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha de Registro (Ecuador)
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-[#6758C2] flex items-center justify-center">
                        <span className="text-white font-medium">
                          {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.name || 'Sin nombre'}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Mail className="h-4 w-4 mr-1" />
                        {user.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-1">
                    {user.phone && (
                      <div className="text-sm text-gray-900 flex items-center">
                        <Phone className="h-4 w-4 mr-1 text-gray-400" />
                        {user.phone}
                      </div>
                    )}
                    {user.address && (
                      <div className="text-sm text-gray-500 flex items-center">
                        <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                        {user.address}
                      </div>
                    )}
                    {!user.phone && !user.address && (
                      <div className="text-sm text-gray-500">No especificado</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-1">
                    {user.birthday && (
                      <div className="text-sm text-gray-900 flex items-center">
                        <Cake className="h-4 w-4 mr-1 text-pink-400" />
                        {formatBirthday(user.birthday)}
                      </div>
                    )}
                    {user.cedula && (
                      <div className="text-sm text-gray-500 flex items-center">
                        <CreditCard className="h-4 w-4 mr-1 text-gray-400" />
                        {user.cedula}
                      </div>
                    )}
                    {user.shoe_size && (
                      <div className="text-sm text-gray-500 flex items-center">
                        <UserIcon className="h-4 w-4 mr-1 text-gray-400" />
                        Talla: {user.shoe_size}
                      </div>
                    )}
                    {!user.birthday && !user.cedula && !user.shoe_size && (
                      <div className="text-sm text-gray-500">No especificado</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link 
                    href={`/dashboard/packages?user=${encodeURIComponent(user.email)}`}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#6758C2] text-white hover:bg-[#5A4AB8] transition-colors"
                  >
                    <ShoppingBag className="h-4 w-4 mr-1" />
                    {user.purchase_count} paquete{user.purchase_count !== 1 ? 's' : ''}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatRegistrationDate(user.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                      title="Editar usuario"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleAssignPackage(user)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-150"
                      title="Asignar paquete"
                    >
                      <Gift className="h-4 w-4 mr-1" />
                      Paquete
                    </button>
                  </div>
                </td>
              </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center space-y-2">
                    <Search className="h-12 w-12 text-gray-300" />
                    <div className="text-lg font-medium">No se encontraron usuarios</div>
                    <div className="text-sm">
                      {searchTerm 
                        ? `No hay usuarios que coincidan con "${searchTerm}"`
                        : "Intenta con otros términos de búsqueda"
                      }
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
              </div>
      </div>

      {/* Modal de edición de usuario */}
      {isEditModalOpen && userToEdit && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
          <div className="bg-white rounded-lg shadow-2xl border-2 border-gray-400 w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Editar Usuario</h2>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setUserToEdit(null);
                    resetEditForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-6">
                {/* Información básica */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email (no editable)
                    </label>
                    <input
                      type="email"
                      value={userToEdit.email}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6758C2] focus:border-transparent text-gray-900 bg-white"
                      placeholder="Nombre completo"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6758C2] focus:border-transparent text-gray-900 bg-white"
                      placeholder="0999999999"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cédula
                    </label>
                    <input
                      type="text"
                      value={editFormData.cedula}
                      onChange={(e) => setEditFormData({...editFormData, cedula: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6758C2] focus:border-transparent text-gray-900 bg-white"
                      placeholder="1234567890"
                      maxLength={10}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6758C2] focus:border-transparent text-gray-900 bg-white"
                    placeholder="Dirección completa"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Nacimiento
                    </label>
                    <input
                      type="text"
                      value={editFormData.birthday}
                      onChange={(e) => setEditFormData({...editFormData, birthday: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6758C2] focus:border-transparent text-gray-900 bg-white"
                      placeholder="DD/MM/YYYY o DDMMYYYY"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Talla de Zapato
                    </label>
                    <input
                      type="text"
                      value={editFormData.shoe_size}
                      onChange={(e) => setEditFormData({...editFormData, shoe_size: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6758C2] focus:border-transparent text-gray-900 bg-white"
                      placeholder="38, 39, 40..."
                    />
                  </div>
                </div>

                {/* Botones */}
                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setUserToEdit(null);
                      resetEditForm();
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-[#6758C2] text-white rounded-md hover:bg-[#5A4AB8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Actualizando...' : 'Actualizar Usuario'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal para asignar paquete */}
      {isPackageModalOpen && userForPackage && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
          <div className="bg-white rounded-lg shadow-2xl border-2 border-gray-400 w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Asignar Paquete</h2>
                <button
                  onClick={() => {
                    setIsPackageModalOpen(false);
                    setUserForPackage(null);
                    resetPackageForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900">Usuario seleccionado:</h3>
                <p className="text-sm text-gray-600">{userForPackage.name} ({userForPackage.email})</p>
              </div>

              <form onSubmit={handlePackageSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar Paquete *
                  </label>
                  <select
                    required
                    value={packageFormData.package_id}
                    onChange={(e) => setPackageFormData({...packageFormData, package_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6758C2] focus:border-transparent text-gray-900 bg-white"
                  >
                    <option value="">Seleccionar paquete...</option>
                    {packages.map(pkg => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} - ${pkg.price} ({pkg.class_credits} créditos)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ID de Transacción
                    </label>
                    <input
                      type="text"
                      value={packageFormData.transaction_id}
                      onChange={(e) => setPackageFormData({...packageFormData, transaction_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6758C2] focus:border-transparent text-gray-900 bg-white"
                      placeholder="ID de transacción (opcional)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código de Autorización
                    </label>
                    <input
                      type="text"
                      value={packageFormData.authorization_code}
                      onChange={(e) => setPackageFormData({...packageFormData, authorization_code: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6758C2] focus:border-transparent text-gray-900 bg-white"
                      placeholder="Código de autorización (opcional)"
                    />
                  </div>
                </div>

                {/* Botones */}
                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPackageModalOpen(false);
                      setUserForPackage(null);
                      resetPackageForm();
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !packageFormData.package_id}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Asignando...' : 'Asignar Paquete'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal para agregar usuario (mantiene la funcionalidad original) */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
          <div className="bg-white rounded-lg shadow-2xl border-2 border-gray-400 w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Agregar Nuevo Usuario</h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Mostrar contraseña generada si existe */}
              {generatedPassword && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4">
                  <div className="flex items-center mb-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-green-800">
                        ¡Usuario creado exitosamente!
                      </h3>
                      <p className="text-sm text-green-600 mt-1">
                        Se ha generado una contraseña temporal para el usuario.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border border-green-300 rounded-md p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contraseña temporal:
                        </label>
                        <div className="text-lg font-mono bg-gray-50 px-3 py-2 rounded border text-gray-900">
                          {generatedPassword}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(generatedPassword)}
                        className="ml-4 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Importante:</strong> Comparte esta contraseña con el usuario. Podrá cambiarla en la app después del primer login.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        resetForm();
                        setIsModalOpen(false);
                        window.location.reload();
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {/* Formulario - solo mostrar si no hay contraseña generada */}
              {!generatedPassword && (
                <form onSubmit={handleSubmit} className="space-y-6">
                {/* Información básica */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6758C2] focus:border-transparent text-gray-900 bg-white"
                      placeholder="usuario@ejemplo.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6758C2] focus:border-transparent text-gray-900 bg-white"
                      placeholder="Nombre completo"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6758C2] focus:border-transparent text-gray-900 bg-white"
                      placeholder="0999999999"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cédula
                    </label>
                    <input
                      type="text"
                      value={formData.cedula}
                      onChange={(e) => setFormData({...formData, cedula: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6758C2] focus:border-transparent text-gray-900 bg-white"
                      placeholder="1234567890"
                      maxLength={10}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6758C2] focus:border-transparent text-gray-900 bg-white"
                    placeholder="Dirección completa"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Nacimiento
                    </label>
                    <input
                      type="text"
                      value={formData.birthday}
                      onChange={(e) => setFormData({...formData, birthday: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6758C2] focus:border-transparent text-gray-900 bg-white"
                      placeholder="DD/MM/YYYY o DDMMYYYY"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Talla de Zapato
                    </label>
                    <input
                      type="text"
                      value={formData.shoe_size}
                      onChange={(e) => setFormData({...formData, shoe_size: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6758C2] focus:border-transparent text-gray-900 bg-white"
                      placeholder="38, 39, 40..."
                    />
                  </div>
                </div>

                {/* Sección de paquetes */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <PackageIcon className="h-5 w-5 mr-2 text-[#6758C2]" />
                    Asignar Paquete (Opcional)
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Seleccionar Paquete
                      </label>
                      <select
                        value={formData.package_id}
                        onChange={(e) => setFormData({...formData, package_id: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6758C2] focus:border-transparent text-gray-900 bg-white"
                      >
                        <option value="">Sin paquete</option>
                        {packages.map(pkg => (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.name} - ${pkg.price} ({pkg.class_credits} créditos)
                          </option>
                        ))}
                      </select>
                    </div>

                    {formData.package_id && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            ID de Transacción
                          </label>
                          <input
                            type="text"
                            value={formData.transaction_id}
                            onChange={(e) => setFormData({...formData, transaction_id: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6758C2] focus:border-transparent text-gray-900 bg-white"
                            placeholder="ID de transacción"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Código de Autorización
                          </label>
                          <input
                            type="text"
                            value={formData.authorization_code}
                            onChange={(e) => setFormData({...formData, authorization_code: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6758C2] focus:border-transparent text-gray-900 bg-white"
                            placeholder="Código de autorización"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Botones */}
                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-[#6758C2] text-white rounded-md hover:bg-[#5A4AB8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Creando...' : 'Crear Usuario'}
                  </button>
                </div>
              </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
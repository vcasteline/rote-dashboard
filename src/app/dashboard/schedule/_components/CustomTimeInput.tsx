'use client';

import { useState } from 'react';

// Icono de reloj simple
const ClockIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

interface CustomTimeInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  name?: string;
  id?: string;
}

export default function CustomTimeInput({
  value = '',
  onChange,
  placeholder = '00:00',
  disabled = false,
  required = false,
  className = '',
  name,
  id
}: CustomTimeInputProps) {
  const [focused, setFocused] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          type="time"
          id={id}
          name={name}
          value={value}
          onChange={handleInputChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          style={{
            // Ocultar el icono nativo del input de tiempo
            WebkitAppearance: 'none',
            MozAppearance: 'textfield',
          }}
          className={`
            w-full px-3 py-2 pr-10 bg-white border border-gray-300 rounded-md shadow-sm
            focus:outline-none focus:ring-2 focus:ring-[#D7BAF6] focus:border-[#D7BAF6]
            disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50
            text-gray-900 placeholder-gray-500
            ${focused ? 'ring-2 ring-[#D7BAF6] border-[#D7BAF6]' : 'hover:border-gray-400'}
            [&::-webkit-calendar-picker-indicator]:hidden
            [&::-webkit-inner-spin-button]:hidden
            [&::-webkit-outer-spin-button]:hidden
          `}
        />
        
        {/* Icono de reloj */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <ClockIcon className="h-5 w-5 text-gray-400" />
        </div>
      </div>
    </div>
  );
} 
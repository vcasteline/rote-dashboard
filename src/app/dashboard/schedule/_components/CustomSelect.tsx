'use client';

import { useState, useRef, useEffect } from 'react';

// Iconos SVG simples
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  name?: string;
  id?: string;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  disabled = false,
  required = false,
  className = '',
  name,
  id
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown cuando se hace click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const selectedOption = options.find(option => option.value === value);
  
  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={selectRef}>
      {/* Input oculto para formularios */}
      <input
        type="hidden"
        name={name}
        value={value}
        required={required}
      />
      
      {/* Botón principal del selector */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isOpen ? 'ring-2 ring-indigo-500 border-indigo-500' : ''}
          ${disabled ? 'bg-gray-50' : 'hover:border-gray-400'}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        id={id}
      >
        <div className="flex items-center justify-between">
          <span className={`block truncate ${selectedOption ? 'text-gray-900' : 'text-gray-500'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDownIcon
            className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown de opciones */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          <ul className="py-1" role="listbox">
            {options.map((option) => (
              <li
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`
                  relative cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-indigo-50
                  ${value === option.value ? 'bg-indigo-50 text-indigo-900' : 'text-gray-900'}
                `}
                role="option"
                aria-selected={value === option.value}
              >
                <span className={`block truncate ${value === option.value ? 'font-medium' : 'font-normal'}`}>
                  {option.label}
                </span>
                
                {value === option.value && (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-indigo-600">
                    <CheckIcon className="h-5 w-5" />
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 
import React from 'react';
import { MapPin } from 'lucide-react';
import { cn } from '../lib/utils';

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function AddressInput(props: AddressInputProps) {
  return (
    <div className="space-y-4">
      <div className="relative group">
        <MapPin size={16} className="absolute left-4 top-4 text-text-light opacity-40 group-focus-within:opacity-100 transition-all" />
        <textarea
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder}
          className={cn(
            "w-full pl-12 pr-4 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all h-32 resize-none",
            props.className
          )}
        />
      </div>
    </div>
  );
}


'use client';

import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

interface Props {
  label: string;
  placeholder?: string;
  defaultValue?: string;
  onAddressSelect: (address: string, lat: number, lng: number) => void;
  error?: string;
  countryCode?: string; // e.g. 'KE'
  className?: string;
  disabled?: boolean;
}

export default function GoogleAddressPicker({ 
  label, 
  placeholder, 
  defaultValue = '', 
  onAddressSelect, 
  error,
  countryCode,
  className,
  disabled = false
}: Props) {
  const isGoogleAvailable = typeof window !== 'undefined' && !!window.google;
  
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: countryCode ? { country: countryCode } : undefined,
    },
    debounce: 300,
    defaultValue,
    initOnMount: isGoogleAvailable && !disabled
  });

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    if (isGoogleAvailable && !disabled) {
        setIsOpen(true);
    }
    // Still notify parent of text change even if google is off
    onAddressSelect(e.target.value, 0, 0);
  };

  const handleSelect = async (suggestion: any) => {
    const { description } = suggestion;
    setValue(description, false);
    clearSuggestions();
    setIsOpen(false);

    try {
      const results = await getGeocode({ address: description });
      const { lat, lng } = await getLatLng(results[0]);
      onAddressSelect(description, lat, lng);
    } catch (error) {
      console.error("Error: ", error);
      onAddressSelect(description, 0, 0);
    }
  };

  const useFallback = !isGoogleAvailable || disabled || !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }} className={className}>
      <label className="label">{label}</label>
      <div style={{ position: 'relative' }}>
        <MapPin size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          value={value}
          onChange={handleInput}
          disabled={!ready && !useFallback}
          placeholder={placeholder || "Start typing address..."}
          className={`input ${error ? 'error' : ''}`}
          style={{ paddingLeft: '2.5rem' }}
          onFocus={() => !useFallback && setIsOpen(true)}
        />
      </div>
      
      {isOpen && status === "OK" && !useFallback && (
        <div style={{ 
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 99999, 
          marginTop: '0.5rem', background: '#ffffff', border: '1px solid var(--border)', 
          borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', overflow: 'hidden' 
        }}>
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {data.map((suggestion) => (
              <div 
                key={suggestion.place_id} 
                onClick={() => handleSelect(suggestion)}
                style={{ padding: '0.75rem 1rem', cursor: 'pointer', fontSize: '0.9rem', transition: 'background 0.2s', color: 'var(--text-primary)' }}
                className="table-row-hover"
              >
                <div style={{ fontWeight: 600 }}>{suggestion.structured_formatting.main_text}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{suggestion.structured_formatting.secondary_text}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

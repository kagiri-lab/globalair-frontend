'use client';

import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { useState, useMemo } from 'react';

interface Props {
  pickup?: { lat: number; lng: number; address: string };
  destination?: { lat: number; lng: number; address: string };
}

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '12px'
};

export default function ShipmentMap({ pickup, destination }: Props) {
  const [selectedMarker, setSelectedMarker] = useState<any>(null);

  const center = useMemo(() => {
    if (pickup) return pickup;
    if (destination) return destination;
    return { lat: -1.286389, lng: 36.817223 }; // Default Nairobi
  }, [pickup, destination]);

  const options = {
    disableDefaultUI: false,
    zoomControl: true,
    styles: [
        {
          "featureType": "administrative",
          "elementType": "geometry",
          "stylers": [{ "visibility": "off" }]
        },
        {
          "featureType": "poi",
          "stylers": [{ "visibility": "off" }]
        },
        {
          "featureType": "road",
          "elementType": "labels.icon",
          "stylers": [{ "visibility": "off" }]
        },
        {
          "featureType": "transit",
          "stylers": [{ "visibility": "off" }]
        }
      ]
  };

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      zoom={12}
      center={center}
      options={options}
    >
      {pickup && (
        <Marker
          position={pickup}
          label="P"
          title="Pickup Location"
          onClick={() => setSelectedMarker({ ...pickup, type: 'Pickup' })}
        />
      )}

      {destination && (
        <Marker
          position={destination}
          label="D"
          title="Destination Location"
          onClick={() => setSelectedMarker({ ...destination, type: 'Destination' })}
        />
      )}

      {selectedMarker && (
        <InfoWindow
          position={selectedMarker}
          onCloseClick={() => setSelectedMarker(null)}
        >
          <div style={{ padding: '0.5rem' }}>
            <p style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.2rem', color: '#141c2e' }}>{selectedMarker.type}</p>
            <p style={{ fontSize: '0.75rem', color: '#4b5563', maxWidth: '200px' }}>{selectedMarker.address}</p>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}

export const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const sortItemsByDistance = (items: any[], userLocation: { lat: number, lng: number } | null) => {
    if (!userLocation) return items;
    return [...items].sort((a, b) => {
        const latA = a.latitude ?? a.centerLatitude ?? a.pinLatitude ?? a.lat;
        const lngA = a.longitude ?? a.centerLongitude ?? a.pinLongitude ?? a.lng;
        
        const latB = b.latitude ?? b.centerLatitude ?? b.pinLatitude ?? b.lat;
        const lngB = b.longitude ?? b.centerLongitude ?? b.pinLongitude ?? b.lng;
        
        const distA = getDistance(userLocation.lat, userLocation.lng, latA, lngA);
        const distB = getDistance(userLocation.lat, userLocation.lng, latB, lngB);
        return distA - distB;
    });
};

export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function calculateAverageSpeed(history: any[]): number {
  if (!history || history.length < 2) return 30; // Default speed in km/h

  let totalDistance = 0;
  let totalTimeHours = 0;

  // Use the last 5 points for "current" average speed if available
  const recentHistory = history.slice(-5);

  for (let i = 1; i < recentHistory.length; i++) {
    const p1 = recentHistory[i - 1];
    const p2 = recentHistory[i];
    
    const dist = getDistance(p1.lat, p1.lng, p2.lat, p2.lng);
    const timeDiffMs = new Date(p2.timestamp).getTime() - new Date(p1.timestamp).getTime();
    
    if (timeDiffMs > 0) {
      totalDistance += dist;
      totalTimeHours += timeDiffMs / (1000 * 60 * 60);
    }
  }

  if (totalTimeHours === 0) return 30;
  
  const speed = totalDistance / totalTimeHours;
  // Sanity check: if speed is too low (stuck) or too high (glitch), return default
  if (speed < 2 || speed > 100) return 30;
  
  return speed;
}

export function calculateETA(
  currentLat: number, 
  currentLng: number, 
  destLat: number, 
  destLng: number, 
  speedKmH: number
): number {
  const distance = getDistance(currentLat, currentLng, destLat, destLng);
  const timeHours = distance / speedKmH;
  return Math.ceil(timeHours * 60); // Return in minutes, rounded up
}

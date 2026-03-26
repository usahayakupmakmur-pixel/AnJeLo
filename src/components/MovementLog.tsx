import React from 'react';

interface MovementLogProps {
  history: {
    lat: number;
    lng: number;
    timestamp: string;
  }[];
}

export function MovementLog({ history }: MovementLogProps) {
  if (!history || history.length === 0) {
    return <p className="text-gray-500 italic text-sm">No movement history recorded yet.</p>;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <div className="max-h-60 overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Time</th>
              <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Location (Lat, Lng)</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[...history].reverse().map((loc, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                  {new Date(loc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-xs font-mono text-gray-500">
                  {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-gray-50 px-4 py-2 text-[10px] text-gray-400 text-right border-t">
        Total points: {history.length}
      </div>
    </div>
  );
}

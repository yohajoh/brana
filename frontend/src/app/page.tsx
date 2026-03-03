'use client';

import { useEffect, useState } from 'react';

interface BackendData {
  message: string;
  timestamp: string;
  items: string[];
}

export default function Home() {
  const [data, setData] = useState<BackendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/data');
        if (!response.ok) {
          throw new Error('Failed to fetch data from backend');
        }
        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700">
        <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Fullstack Connectivity Test
        </h1>

        {loading && (
          <div className="flex items-center space-x-2 animate-pulse">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <p className="text-gray-400">Fetching data from backend...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg mb-6">
            <p className="font-semibold text-red-400">Error:</p>
            <p>{error}</p>
            <p className="text-sm mt-2 opacity-75">Make sure the backend is running on http://localhost:5000</p>
          </div>
        )}

        {data && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
              <p className="text-gray-400 text-sm uppercase tracking-wider mb-1 font-semibold">Message</p>
              <p className="text-xl text-blue-300">{data.message}</p>
            </div>

            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
              <p className="text-gray-400 text-sm uppercase tracking-wider mb-1 font-semibold">Server Timestamp</p>
              <p className="font-mono text-purple-300">{new Date(data.timestamp).toLocaleString()}</p>
            </div>

            <div>
              <p className="text-gray-400 text-sm uppercase tracking-wider mb-3 font-semibold">Items from DB (Mock)</p>
              <div className="grid grid-cols-2 gap-3">
                {data.items.map((item, index) => (
                  <div 
                    key={index} 
                    className="bg-gray-700/50 p-3 rounded-md border border-gray-600 hover:border-blue-500 transition-colors cursor-default"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

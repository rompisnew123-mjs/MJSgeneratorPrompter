import React, { useState, useEffect } from 'react';

export const Footer: React.FC = () => {
  const [time, setTime] = useState('Memuat waktu...');
  const [visitorCount, setVisitorCount] = useState(0);
  const [appUrl, setAppUrl] = useState('');

  useEffect(() => {
    // Update clock every second
    const timerId = setInterval(() => {
        const now = new Date();
        const options: Intl.DateTimeFormatOptions = {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        };
        setTime(now.toLocaleString('id-ID', options));
    }, 1000);

    // Get visitor count from localStorage
    // FIX: Initialize count as a number directly to avoid type errors. The `parseInt` combined with `|| '0'` safely converts the stored string (or null) to a number.
    let count = parseInt(localStorage.getItem('visitorCount') || '0', 10);
    if (sessionStorage.getItem('isNewVisitor') === null) {
      count += 1;
      localStorage.setItem('visitorCount', count.toString());
      sessionStorage.setItem('isNewVisitor', 'false');
    }
    setVisitorCount(count);

    // Set App URL
    if (window.location.protocol.startsWith('http')) {
        setAppUrl(window.location.href);
    } else {
        setAppUrl("Hanya tersedia saat di-hosting");
    }


    return () => clearInterval(timerId);
  }, []);

  return (
    <footer className="text-center py-6 text-gray-400 text-sm border-t border-gray-800 mt-10">
        <div id="footer-info" className="mb-3 space-x-2">
            <span id="clock">{time}</span>
            <span>•</span>
            <span>Pengunjung: <span id="visitor-count">{visitorCount.toLocaleString('id-ID')}</span></span>
        </div>
        <div className="mb-2">
            <span>Dibuat oleh: </span><a href="https://www.facebook.com/RomanArzha/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">MASJAWASYNDROM</a>
        </div>
        <div>
            <span className="break-all">URL Aplikasi: <span id="app-url" className="text-gray-500">{appUrl}</span></span>
        </div>
    </footer>
  );
};

'use client';

import { useState, useEffect } from 'react';
import { EncodePanel, DecodePanel, AnalyzePanel } from '@/components';

type Tab = 'encode' | 'decode' | 'analyze';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('encode');
  const [currentTime, setCurrentTime] = useState('00:00:00');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { 
      category: 'STEGO_TOOLS', 
      expanded: true,
      items: [
        { id: 'encode', label: 'ENCODE_MESSAGE' },
        { id: 'decode', label: 'DECODE_MESSAGE' },
        { id: 'analyze', label: 'ANALYZE_IMAGE' },
      ]
    },
    { category: 'CRYPTO_TOOLS', expanded: false, items: [] },
    { category: 'HASH_TOOLS', expanded: false, items: [] },
    { category: 'UTILITIES', expanded: false, items: [] },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#00FF41] font-mono flex flex-col">
      {/* Header / Status Bar */}
      <header className="border-b border-[#00FF41] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold tracking-wider">STEGO_VAULT</h1>
          <span className="text-[#00aa2a]">SYSTEM: <span className="text-[#00FF41]">ONLINE</span></span>
        </div>
        <div className="flex items-center gap-8 text-sm">
          <span>USER: <span className="text-[#00FF41]">OPERATOR</span></span>
          <span>SERVER: <span className="text-[#00FF41]">LOCAL</span></span>
          <span className="font-bold">{currentTime}</span>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="border-b border-[#00aa2a] px-4 py-1 text-sm">
        <span className="text-[#00aa2a]">HOME {'>'} STEGO_TOOLS {'>'} </span>
        <span className="text-[#00FF41]">{activeTab.toUpperCase()}</span>
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-52 border-r border-[#00FF41] flex-shrink-0">
          <nav className="py-2">
            {menuItems.map((menu) => (
              <div key={menu.category}>
                <button 
                  className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-[#00FF41]/10"
                  onClick={() => {}}
                >
                  <span>{menu.expanded ? '▼' : '▶'}</span>
                  <span>{menu.category}</span>
                </button>
                {menu.expanded && menu.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as Tab)}
                    className={`w-full px-4 py-1.5 pl-8 text-left text-sm transition-colors ${
                      activeTab === item.id 
                        ? 'bg-[#00FF41] text-[#0a0a0a] font-bold' 
                        : 'text-[#00aa2a] hover:text-[#00FF41] hover:bg-[#00FF41]/10'
                    }`}
                  >
                    {'>'} {item.label}
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Tool Title */}
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2">
              // {activeTab === 'encode' ? 'LSB_STEGANOGRAPHY_ENCODER' : 
                  activeTab === 'decode' ? 'LSB_STEGANOGRAPHY_DECODER' : 
                  'STEGANALYSIS_TOOLKIT'}
            </h2>
            <div className="border-t border-[#00FF41]"></div>
          </div>

          {activeTab === 'encode' && <EncodePanel />}
          {activeTab === 'decode' && <DecodePanel />}
          {activeTab === 'analyze' && <AnalyzePanel />}
        </main>
      </div>

      {/* Footer Status */}
      <footer className="border-t border-[#00aa2a] px-4 py-1 text-xs text-[#00aa2a] flex justify-between">
        <span>STEGO_VAULT V1.0 | LSB_ENCODING | AES-256-GCM</span>
        <span>ALL_PROCESSING_LOCAL | NO_DATA_UPLOADED</span>
      </footer>
    </div>
  );
}

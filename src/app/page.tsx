'use client';

import { useState, useEffect } from 'react';
import { EncodePanel, DecodePanel, AnalyzePanel } from '@/components';
import { AudioEncodePanel, AudioDecodePanel, AudioAnalyzePanel } from '@/components';

type Tab =
  | 'encode'
  | 'decode'
  | 'analyze'
  | 'audio-encode'
  | 'audio-decode'
  | 'audio-analyze';

const TAB_TITLES: Record<Tab, string> = {
  encode: 'LSB_STEGANOGRAPHY_ENCODER',
  decode: 'LSB_STEGANOGRAPHY_DECODER',
  analyze: 'STEGANALYSIS_TOOLKIT',
  'audio-encode': 'AUDIO_LSB_ENCODER',
  'audio-decode': 'AUDIO_LSB_DECODER',
  'audio-analyze': 'AUDIO_STEGANALYSIS_TOOLKIT',
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('encode');
  const [currentTime, setCurrentTime] = useState('00:00:00');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    STEGO_TOOLS: true,
    AUDIO_TOOLS: false,
    CRYPTO_TOOLS: false,
    HASH_TOOLS: false,
    UTILITIES: false,
  });

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    {
      category: 'STEGO_TOOLS',
      items: [
        { id: 'encode', label: 'ENCODE_MESSAGE' },
        { id: 'decode', label: 'DECODE_MESSAGE' },
        { id: 'analyze', label: 'ANALYZE_IMAGE' },
      ],
    },
    {
      category: 'AUDIO_TOOLS',
      items: [
        { id: 'audio-encode', label: 'ENCODE_IN_AUDIO' },
        { id: 'audio-decode', label: 'DECODE_FROM_AUDIO' },
        { id: 'audio-analyze', label: 'ANALYZE_AUDIO' },
      ],
    },
    { category: 'CRYPTO_TOOLS', items: [] },
    { category: 'HASH_TOOLS', items: [] },
    { category: 'UTILITIES', items: [] },
  ];

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const isAudioTab = activeTab.startsWith('audio-');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#00FF41] font-mono flex flex-col">
      <header className="border-b border-[#00FF41] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold tracking-wider">STEGO_VAULT</h1>
          <span className="text-[#00aa2a]">
            SYSTEM: <span className="text-[#00FF41]">ONLINE</span>
          </span>
        </div>
        <div className="flex items-center gap-8 text-sm">
          <span>USER: <span className="text-[#00FF41]">OPERATOR</span></span>
          <span>MODE: <span className="text-[#00FF41]">{isAudioTab ? 'AUDIO' : 'IMAGE'}</span></span>
          <span className="font-bold">{currentTime}</span>
        </div>
      </header>

      <div className="border-b border-[#00aa2a] px-4 py-1 text-sm">
        <span className="text-[#00aa2a]">
          HOME {'>'} {isAudioTab ? 'AUDIO_TOOLS' : 'STEGO_TOOLS'} {'> '}
        </span>
        <span className="text-[#00FF41]">{activeTab.toUpperCase()}</span>
      </div>

      <div className="flex flex-1">
        <aside className="w-52 border-r border-[#00FF41] flex-shrink-0">
          <nav className="py-2">
            {menuItems.map((menu) => (
              <div key={menu.category}>
                <button
                  className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-[#00FF41]/10"
                  onClick={() => toggleCategory(menu.category)}
                >
                  <span>{expandedCategories[menu.category] ? '▼' : '▶'}</span>
                  <span>{menu.category}</span>
                  {menu.category === 'AUDIO_TOOLS' && (
                    <span className="ml-auto text-[10px] border border-[#00aa2a] px-1 text-[#00aa2a]">
                      NEW
                    </span>
                  )}
                </button>

                {expandedCategories[menu.category] &&
                  menu.items.map((item) => (
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

        <main className="flex-1 p-6 overflow-auto">
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2">{"// "}{TAB_TITLES[activeTab]}</h2>
            <div className="border-t border-[#00FF41]" />
          </div>

          {activeTab === 'encode' && <EncodePanel />}
          {activeTab === 'decode' && <DecodePanel />}
          {activeTab === 'analyze' && <AnalyzePanel />}
          {activeTab === 'audio-encode' && <AudioEncodePanel />}
          {activeTab === 'audio-decode' && <AudioDecodePanel />}
          {activeTab === 'audio-analyze' && <AudioAnalyzePanel />}
        </main>
      </div>

      <footer className="border-t border-[#00aa2a] px-4 py-1 text-xs text-[#00aa2a] flex justify-between">
        <span>STEGO_VAULT V2.0 | IMAGE + AUDIO LSB | AES-256-GCM</span>
        <span>ALL_PROCESSING_LOCAL | NO_DATA_UPLOADED | WEB_AUDIO_API</span>
      </footer>
    </div>
  );
}

'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useMemo } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { NetworkMap } from '@/components/NetworkMap';
import { 
  Activity, Cpu, Database, HardDrive, 
  Layers, Lock, Server, Share2, 
  Terminal, Zap, Filter, Search, MoreHorizontal,
  Wifi, Globe, User
} from 'lucide-react';
import { INITIAL_NODES, Node } from '@/lib/types';

export default function Dashboard() {
  const [isReady, setIsReady] = useState(false);
  const [nodes, setNodes] = useState<Node[]>(INITIAL_NODES);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'syncing' | 'idle'>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await sdk.actions.ready();
      } catch (e) {
        console.error("Farcaster SDK error:", e);
      }
      setIsReady(true);
    };
    init();
  }, []);

  const filteredNodes = useMemo(() => {
    let result = nodes;
    
    // Status Filter
    if (statusFilter !== 'all') {
      result = result.filter(node => node.status === statusFilter);
    }

    // Search Filter
    if (!searchQuery.trim()) return result;
    const query = searchQuery.toLowerCase();
    return result.filter(node => 
      node.label.toLowerCase().includes(query) ||
      node.ip.toLowerCase().includes(query) ||
      node.version.toLowerCase().includes(query) ||
      node.peerId.toLowerCase().includes(query)
    );
  }, [nodes, searchQuery, statusFilter]);

  if (!isReady) return null;

  return (
    <main className="flex flex-col h-screen max-h-screen bg-slate-950 overflow-hidden font-sans">
      {/* Top Header */}
      <header className="h-14 flex-shrink-0 border-b border-white/5 bg-slate-950/80 backdrop-blur-md flex items-center justify-between px-6 z-30">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-gradient-to-br from-[#627EEA] to-[#A0B0FF] rounded-lg flex items-center justify-center shadow-lg shadow-[#627EEA]/20">
            <Layers size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              AETHER NODE SYSTEMS
            </h1>
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-[#00FFA3] animate-pulse" />
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Global Mainnet Active</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-6 px-4 py-1.5 bg-white/5 rounded-full border border-white/5 mr-2">
            <HeaderStat label="TOTAL NODES" value="1,242" color="#00FFA3" />
            <HeaderStat label="TXN / SEC" value="14.2k" color="#627EEA" />
            <HeaderStat label="PEERS" value={`${nodes.length}`} color="#F59E0B" />
          </div>
          <div className="relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#627EEA] transition-colors" />
            <input 
              type="text" 
              placeholder="SEARCH NODES (NAME, IP, VERSION)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-[#627EEA]/50 focus:bg-white/10 transition-all font-mono"
            />
          </div>
          
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 gap-1">
            {(['all', 'active', 'syncing', 'idle'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-tighter transition-all ${
                  statusFilter === status 
                    ? 'bg-[#627EEA] text-white shadow-lg shadow-[#627EEA]/20' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <button className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all text-slate-400">
            <Filter size={16} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-grow flex gap-4 p-4 overflow-hidden relative">
        {/* Left Sidebar - Quick Access */}
        <aside className="w-72 flex-shrink-0 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1 hidden lg:flex">
          <section className="bg-slate-900 border border-white/5 rounded-2xl p-5 space-y-4 flex flex-col max-h-[60%]">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Network Neighbors</h3>
              <span className="text-[9px] font-mono text-[#00FFA3] bg-[#00FFA3]/10 px-2 rounded-full uppercase">
                {filteredNodes.length} Matches
              </span>
            </div>
            <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1">
              {filteredNodes.map(node => (
                <div 
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`p-3 rounded-xl border flex flex-col gap-1 transition-all cursor-pointer ${selectedNodeId === node.id ? 'bg-[#627EEA]/10 border-[#627EEA]/30 ring-1 ring-[#627EEA]/20' : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${node.status === 'active' ? 'bg-[#00FFA3]' : node.status === 'syncing' ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'}`} />
                      <span className="text-[11px] font-bold text-white tracking-tight">{node.label}</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase">{node.version}</span>
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 pl-3.5">
                    <span>{node.ip}</span>
                    <span className="flex items-center gap-1"><Zap size={8} className="text-[#627EEA]" /> {node.latency}ms</span>
                  </div>
                </div>
              ))}
              {filteredNodes.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">No nodes found</p>
                </div>
              )}
            </div>
          </section>

          <section className="bg-slate-900 border border-white/5 rounded-2xl p-5 flex-grow overflow-hidden flex flex-col">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2 flex justify-between items-center">
              System Logs
              <MoreHorizontal size={14} className="cursor-pointer hover:text-white" />
            </h3>
            <div className="mt-4 flex-grow font-mono text-[9px] text-slate-500 overflow-y-auto custom-scrollbar space-y-2">
              <p className="text-white/40"><span className="text-[#627EEA]">[14:12:02]</span> Initializing libp2p stack...</p>
              <p><span className="text-[#00FFA3]">[14:12:05]</span> Handshake successful with peer 0x71...f2</p>
              {searchQuery && <p className="text-[#627EEA] animate-pulse"><span className="text-white/50">[FILTER]</span> Searching for protocol matching "{searchQuery}"...</p>}
              <p><span className="text-[#F59E0B]">[14:12:08]</span> Inbound sync bottleneck detected</p>
              <p><span className="text-[#627EEA]">[14:12:12]</span> Routing table refreshed (124 nodes)</p>
              <p><span className="text-white/40">[14:12:15]</span> Checkpoint validation started...</p>
              <p><span className="text-[#00FFA3]">[14:12:20]</span> Block #14,242,120 verified</p>
            </div>
          </section>
        </aside>

        {/* Center - Network Map */}
        <section className="flex-grow bg-slate-900 border border-white/5 rounded-2xl overflow-hidden shadow-2xl relative">
          <NetworkMap 
            nodes={nodes} 
            searchQuery={searchQuery} 
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            selectedNodeId={selectedNodeId} 
            onNodeSelect={setSelectedNodeId} 
          />
        </section>
      </div>

      {/* Bottom Footer - Real-time Status */}
      <footer className="h-10 flex-shrink-0 border-t border-white/5 bg-slate-950 px-6 flex items-center justify-between z-30">
        <div className="flex gap-6">
          <FooterStat label="NETWORK" value="AETHER-ALPHA-1" />
          <FooterStat label="PROTOCOL" value="V2.4.1" />
          <FooterStat label="REGION" value="GLOBAL-LB" />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00FFA3] shadow-[0_0_8px_#00FFA3]" />
            <span className="text-[10px] font-bold text-white uppercase tracking-tighter">ALL SYSTEMS OPERATIONAL</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function HeaderStat({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[8px] text-slate-500 font-bold tracking-widest">{label}</span>
      <span className="text-[11px] font-mono font-bold text-white tracking-widest flex items-center gap-1.5">
        <div className="w-1 h-1 rounded-full" style={{ backgroundColor: color }} />
        {value}
      </span>
    </div>
  );
}

function SidebarItem({ icon, label, value, active = false }: { icon: React.ReactNode, label: string, value: string, active?: boolean }) {
  return (
    <div className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${active ? 'bg-[#627EEA]/10 border-[#627EEA]/20 text-white' : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'}`}>
      <div className="flex items-center gap-3">
        <div className={active ? 'text-[#627EEA]' : ''}>{icon}</div>
        <span className="text-[11px] font-bold tracking-tight">{label}</span>
      </div>
      <span className="text-[10px] font-mono font-bold opacity-80">{value}</span>
    </div>
  );
}

function FooterStat({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-slate-600 font-bold tracking-wider">{label}</span>
      <span className="text-[10px] font-mono font-bold text-slate-400">{value}</span>
    </div>
  );
}

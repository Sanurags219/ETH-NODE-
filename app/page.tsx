'use client';

import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { motion, AnimatePresence } from 'motion/react';
import { useBlockNumber, useAccount } from 'wagmi';
import { 
  Activity, 
  Cpu, 
  Database, 
  Layers, 
  Network, 
  Settings, 
  Terminal as TerminalIcon, 
  Zap,
  Globe,
  Shield,
  BarChart3,
  Wifi,
  WifiOff
} from 'lucide-react';

const LOG_ENTRIES = [
  "Imported new chain segment",
  "Peer 0x4f2a... connected",
  "Syncing beacon headers...",
  "New payload received [0x18452...]",
  "Block validation successful",
  "State healing in progress (23.1%)",
  "P2P handshakes: 12 active",
  "Snapshot verified [root=0x34...]",
  "Database compaction started"
];

type ConnectionStatus = 'connected' | 'syncing' | 'disconnected';

export default function NodeDashboard() {
  const [isReady, setIsReady] = useState(false);
  const { data: blockNumber, status: blockStatus } = useBlockNumber({ watch: true });
  const { isConnected } = useAccount();
  const [logs, setLogs] = useState<string[]>([]);
  const [uptime, setUptime] = useState("142d 18h 32m");
  const [status, setStatus] = useState<ConnectionStatus>('connected');

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

    const interval = setInterval(() => {
      const randomLog = LOG_ENTRIES[Math.floor(Math.random() * LOG_ENTRIES.length)];
      setLogs(prev => [randomLog, ...prev].slice(0, 10));
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Update status based on block number loading state or explicit mock for demo
  useEffect(() => {
    if (blockStatus === 'pending') {
      setStatus('syncing');
    } else if (blockStatus === 'error') {
      setStatus('disconnected');
    } else {
      setStatus('connected');
    }
  }, [blockStatus]);

  if (!isReady) return null;

  return (
    <div className="flex h-screen w-full bg-[#05070A] overflow-hidden" style={{ background: 'radial-gradient(circle at 70% 20%, #1A1C2E 0%, #05070A 100%)' }}>
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 p-6 flex flex-col shrink-0">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-8 h-8 bg-[#627EEA] rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-brand/40">
            Ξ
          </div>
          <div className="font-bold text-lg tracking-tight">
            AETHER <span className="font-light opacity-60">NODE</span>
          </div>
        </div>

        <nav className="flex-grow space-y-1">
          <SidebarItem icon={<BarChart3 size={18} />} label="Dashboard" active />
          <SidebarItem icon={<Globe size={18} />} label="Peers List" />
          <SidebarItem icon={<Shield size={18} />} label="Staking" />
          <SidebarItem icon={<Activity size={18} />} label="Execution Client" />
          <SidebarItem icon={<Layers size={18} />} label="Consensus" />
          <SidebarItem icon={<Settings size={18} />} label="Settings" />
        </nav>

        <div className="glass p-4 mt-auto">
          <div className="text-[10px] uppercase tracking-widest text-[#94A3B8] mb-1">Version</div>
          <div className="text-xs font-mono">Geth v1.13.5-stable</div>
          <div className="flex items-center gap-2 mt-3">
            <StatusIndicator status={status} />
            <span className={`text-xs ${
              status === 'connected' ? 'text-[#00FFA3]' : 
              status === 'syncing' ? 'text-[#F59E0B]' : 
              'text-[#EF4444]'
            }`}>
              {status === 'connected' ? 'Mainnet Online' : 
               status === 'syncing' ? 'Syncing Chain...' : 
               'Node Disconnected'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
        <header className="flex justify-between items-end mb-8">
          <div className="space-y-1">
            <h1 className="text-3xl font-light text-white">Node Overview</h1>
            <p className="text-sm text-[#94A3B8]">
              Local instance: <span className="text-white font-mono">eth-node-v1-primary</span>
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-[#94A3B8] mb-1">Network Uptime</div>
            <div className="text-lg font-semibold text-white">{uptime}</div>
          </div>
        </header>

        {/* Top Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <StatCard 
            label="Sync Progress" 
            value={status === 'syncing' ? "88.4%" : "100%"} 
            highlight={status === 'syncing'} 
            progress={status === 'syncing' ? 88.4 : 100} 
          />
          <StatCard 
            label="Active Peers" 
            value={status === 'disconnected' ? "0" : "64"} 
            subValue="/ 100" 
          />
          <StatCard 
            label="Current Block" 
            value={blockNumber ? `#${blockNumber.toLocaleString()}` : "Loading..."} 
            valueClassName="text-xl"
          />
          <StatCard 
            label="Gas Price" 
            value="14" 
            subValue="Gwei" 
          />
        </section>

        {/* Performance & Logs */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow min-h-[400px]">
          <div className="lg:col-span-2 glass p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-semibold uppercase tracking-widest">Performance Metrics</h3>
              <div className="flex gap-4 text-[11px] text-[#94A3B8]">
                <span>CPU: 42%</span>
                <span>RAM: 18.2GB</span>
              </div>
            </div>
            
            <div className="flex-grow border-b border-white/10 flex items-end gap-1.5 pb-2">
              {[40, 65, 55, 85, 70, 95, 75, 60, 80, 45, 90, 50, 70, 85, 60].map((h, i) => (
                <motion.div 
                  key={i} 
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 1, delay: i * 0.05 }}
                  className={`flex-1 rounded-sm ${i === 5 ? 'bg-[#627EEA]' : 'bg-brand/30'}`}
                />
              ))}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-5">
              <div className="p-3 bg-black/20 rounded-lg">
                <div className="text-[9px] uppercase tracking-widest text-[#94A3B8] mb-1">Disk Usage</div>
                <div className="text-sm">
                  842GB <span className="opacity-50">/ 2TB SSD</span>
                </div>
              </div>
              <div className="p-3 bg-black/20 rounded-lg">
                <div className="text-[9px] uppercase tracking-widest text-[#94A3B8] mb-1">Bandwidth (24h)</div>
                <div className="text-sm">
                  124GB In / 42GB Out
                </div>
              </div>
            </div>
          </div>

          <div className="glass p-6 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4">
              <TerminalIcon size={16} className="text-brand" />
              <h3 className="text-sm font-semibold uppercase tracking-widest">Execution Logs</h3>
            </div>
            <div className="flex-grow overflow-hidden relative">
              <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[#161B22] to-transparent z-10 pointer-events-none" />
              <div className="space-y-1 pt-2">
                <AnimatePresence initial={false}>
                  {logs.map((log, i) => (
                    <motion.div 
                      key={`${log}-${i}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-[11px] font-mono py-1 border-b border-white/5 flex items-center gap-2"
                    >
                      <span className="text-brand">[{new Date().toLocaleTimeString('en-GB')}]</span>
                      <span className="text-white/80">{log}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {logs.length === 0 && (
                  <div className="text-[11px] text-[#94A3B8] font-mono">Connecting to P2P network...</div>
                )}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 text-[11px] text-brand hover:text-brand/80 cursor-pointer transition-colors">
              View detailed terminal →
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatusIndicator({ status }: { status: ConnectionStatus }) {
  const color = status === 'connected' ? 'text-[#00FFA3]' : status === 'syncing' ? 'text-[#F59E0B]' : 'text-[#EF4444]';
  
  return (
    <div className={`relative flex items-center justify-center`}>
      <div className={`status-pulse ${color} bg-current`} />
      {status === 'syncing' && (
        <motion.div 
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`absolute inset-0 rounded-full ${color} bg-current opacity-50`}
        />
      )}
    </div>
  );
}

function SidebarItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={`
      flex items-center gap-4 px-4 py-3 rounded-lg cursor-pointer transition-all duration-200 group
      ${active ? 'bg-brand/20 text-brand border-l-2 border-brand' : 'text-slate-400 hover:bg-white/5 hover:text-white'}
    `}>
      <span className={active ? 'text-brand' : 'text-slate-500 group-hover:text-brand'}>{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function StatCard({ label, value, subValue, highlight = false, progress, valueClassName = "text-2xl" }: { 
  label: string, 
  value: string, 
  subValue?: string, 
  highlight?: boolean,
  progress?: number,
  valueClassName?: string
}) {
  return (
    <div className={`glass p-5 transition-transform hover:-translate-y-1 ${highlight ? 'neon-glow' : ''}`}>
      <div className="text-[10px] uppercase tracking-widest text-[#94A3B8] mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={`${valueClassName} font-semibold text-white`}>{value}</span>
        {subValue && <span className="text-sm text-[#94A3B8] font-normal">{subValue}</span>}
      </div>
      {progress !== undefined && (
        <div className="h-1 bg-white/10 rounded-full mt-3 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-brand to-success"
          />
        </div>
      )}
    </div>
  );
}

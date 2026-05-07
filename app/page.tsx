'use client';

import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { motion, AnimatePresence } from 'motion/react';
import { useBlockNumber, useAccount, useChainId } from 'wagmi';
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
  WifiOff,
  Info,
  Clock,
  ArrowUpRight,
  TrendingUp
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
  const chainId = useChainId();
  const [logs, setLogs] = useState<string[]>([]);
  const [uptime, setUptime] = useState("142d 18h 32m");
  const [status, setStatus] = useState<ConnectionStatus>('connected');
  const [syncSpeed, setSyncSpeed] = useState("0 KB/s");
  const [etc, setEtc] = useState("Ready");
  const [showDetails, setShowDetails] = useState(false);

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

  // Update status and network mock data
  useEffect(() => {
    if (blockStatus === 'pending') {
      setStatus('syncing');
      setSyncSpeed(`${(Math.random() * 5 + 2).toFixed(1)} MB/s`);
      setEtc("~12m");
    } else if (blockStatus === 'error') {
      setStatus('disconnected');
      setSyncSpeed("0 KB/s");
      setEtc("N/A");
    } else {
      setStatus('connected');
      setSyncSpeed(`${(Math.random() * 50 + 10).toFixed(1)} KB/s`); // Idle bandwidth
      setEtc("Synchronized");
    }
  }, [blockStatus, blockNumber]);

  const networkName = chainId === 8453 ? "Base" : chainId === 1 ? "Ethereum" : "Unknown Network";

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

        <div className="glass p-4 mt-auto relative overflow-hidden group">
          <div className="text-[10px] uppercase tracking-widest text-[#94A3B8] mb-1">Version</div>
          <div className="text-xs font-mono">Geth v1.13.5-stable</div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <StatusIndicator status={status} />
              <span className={`text-xs font-medium ${
                status === 'connected' ? 'text-[#00FFA3]' : 
                status === 'syncing' ? 'text-[#F59E0B]' : 
                'text-[#EF4444]'
              }`}>
                {status === 'connected' ? 'Online' : 
                 status === 'syncing' ? 'Syncing' : 
                 'Offline'}
              </span>
            </div>
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="p-1 hover:bg-white/10 rounded-md transition-colors text-[#94A3B8] hover:text-white"
            >
              <Info size={14} />
            </button>
          </div>

          <AnimatePresence>
            {showDetails && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3 pt-3 border-t border-white/10 space-y-2 overflow-hidden"
              >
                <DetailRow label="Network" value={networkName} />
                <DetailRow label="Sync Speed" value={syncSpeed} />
                <DetailRow label="ETC" value={etc} />
              </motion.div>
            )}
          </AnimatePresence>
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
          <div className="hidden md:flex gap-8">
             <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-[#94A3B8] mb-1">Current Network</div>
              <div className="flex items-center gap-2 justify-end">
                <Globe size={14} className="text-brand" />
                <span className="text-sm font-semibold">{networkName}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-[#94A3B8] mb-1">Network Uptime</div>
              <div className="text-lg font-semibold text-white">{uptime}</div>
            </div>
          </div>
        </header>

        {/* Connection Health Banner (Visible when syncing or offline) */}
        <AnimatePresence>
          {status !== 'connected' && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-8 p-4 rounded-xl border flex items-center justify-between ${
                status === 'syncing' ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30' : 'bg-[#EF4444]/10 border-[#EF4444]/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${status === 'syncing' ? 'bg-[#F59E0B]/20 text-[#F59E0B]' : 'bg-[#EF4444]/20 text-[#EF4444]'}`}>
                  {status === 'syncing' ? <TrendingUp size={20} /> : <WifiOff size={20} />}
                </div>
                <div>
                  <h4 className="font-semibold text-sm">
                    {status === 'syncing' ? 'Synchronizing with Beacon Chain' : 'Connection Interrupted'}
                  </h4>
                  <p className="text-xs opacity-70">
                    {status === 'syncing' ? `Downloading blocks from ${networkName} network at ${syncSpeed}` : 'Retrying P2P handshake in 5s...'}
                  </p>
                </div>
              </div>
              {status === 'syncing' && (
                <div className="text-right">
                  <div className="text-[9px] uppercase tracking-widest opacity-60">Estimated Time</div>
                  <div className="text-sm font-mono flex items-center gap-2">
                    <Clock size={12} />
                    {etc}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <StatCard 
            label="Sync Progress" 
            value={status === 'syncing' ? "88.4%" : "100%"} 
            highlight={status === 'syncing'} 
            progress={status === 'syncing' ? 88.4 : 100} 
            icon={<TrendingUp size={14} className={status === 'syncing' ? 'text-warning' : 'text-success'} />}
          />
          <StatCard 
            label="Active Peers" 
            value={status === 'disconnected' ? "0" : "64"} 
            subValue="/ 100" 
            icon={<Network size={14} className="text-[#627EEA]" />}
          />
          <StatCard 
            label="Current Block" 
            value={blockNumber ? `#${blockNumber.toLocaleString()}` : "Loading..."} 
            valueClassName="text-xl"
            icon={<Layers size={14} className="text-[#627EEA]" />}
          />
          <StatCard 
            label="Gas Price" 
            value="14" 
            subValue="Gwei" 
            icon={<Zap size={14} className="text-brand" />}
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
              <div className="space-y-1 pt-2 custom-scrollbar overflow-y-auto">
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
            <div className="mt-4 pt-4 border-t border-white/10 text-[11px] text-brand hover:text-brand/80 cursor-pointer transition-colors flex items-center justify-between">
              <span>View detailed terminal</span>
              <ArrowUpRight size={12} />
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
    <div className="relative flex items-center justify-center">
      <div className={`status-pulse ${color} bg-current`} />
      {(status === 'syncing' || status === 'connected') && (
        <motion.div 
          animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: status === 'syncing' ? 1.5 : 3, repeat: Infinity }}
          className={`absolute inset-0 rounded-full ${color} bg-current opacity-40`}
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

function DetailRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center text-[11px]">
      <span className="text-[#94A3B8]">{label}</span>
      <span className="font-mono text-white">{value}</span>
    </div>
  );
}

function StatCard({ label, value, subValue, highlight = false, progress, valueClassName = "text-2xl", icon }: { 
  label: string, 
  value: string, 
  subValue?: string, 
  highlight?: boolean,
  progress?: number,
  valueClassName?: string,
  icon?: React.ReactNode
}) {
  return (
    <div className={`glass p-5 transition-transform hover:-translate-y-1 ${highlight ? 'neon-glow' : ''}`}>
      <div className="flex justify-between items-start mb-1">
        <div className="text-[10px] uppercase tracking-widest text-[#94A3B8]">{label}</div>
        {icon && <div className="opacity-60">{icon}</div>}
      </div>
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
            className={`h-full ${progress === 100 ? 'bg-success' : 'bg-gradient-to-r from-brand to-warning'}`}
          />
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, useMemo } from 'react';
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
  TrendingUp,
  HardDrive
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

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

interface MetricData {
  time: string;
  timestamp: number;
  cpu: number;
  ram: number;
}

export default function NodeDashboard() {
  const [isReady, setIsReady] = useState(false);
  const { data: blockNumber, status: blockStatus } = useBlockNumber({ watch: true });
  const chainId = useChainId();
  const [logs, setLogs] = useState<string[]>([]);
  const [uptime] = useState("142d 18h 32m");
  const [status, setStatus] = useState<ConnectionStatus>('connected');
  const [syncSpeed, setSyncSpeed] = useState("0 KB/s");
  const [etc, setEtc] = useState("Ready");
  const [showDetails, setShowDetails] = useState(false);
  
  // Historical metrics state
  const [metrics, setMetrics] = useState<MetricData[]>([]);

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

    // Initialize metrics with some random historical data
    const initialMetrics: MetricData[] = [];
    const now = Date.now();
    for (let i = 60; i >= 0; i--) {
      const ts = now - i * 60000;
      initialMetrics.push({
        time: new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: ts,
        cpu: Math.floor(Math.random() * 30 + 30),
        ram: parseFloat((Math.random() * 2 + 16).toFixed(1))
      });
    }
    setMetrics(initialMetrics);

    const interval = setInterval(() => {
      const randomLog = LOG_ENTRIES[Math.floor(Math.random() * LOG_ENTRIES.length)];
      setLogs(prev => [randomLog, ...prev].slice(0, 10));

      // Add new metric point
      const newTs = Date.now();
      setMetrics(prev => {
        const next = [...prev, {
          time: new Date(newTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: newTs,
          cpu: Math.floor(Math.random() * 20 + 35),
          ram: parseFloat((Math.random() * 0.5 + 17.8).toFixed(1))
        }];
        return next.slice(-60); // Keep last hour
      });
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
      setSyncSpeed(`${(Math.random() * 50 + 10).toFixed(1)} KB/s`);
      setEtc("Synchronized");
    }
  }, [blockStatus, blockNumber]);

  const networkName = chainId === 8453 ? "Base" : chainId === 1 ? "Ethereum" : "Unknown Network";

  // Data for Recharts
  const currentCPU = metrics.length > 0 ? metrics[metrics.length - 1].cpu : 0;
  const currentRAM = metrics.length > 0 ? metrics[metrics.length - 1].ram : 0;

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

        {/* Real-time Monitoring Charts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="glass p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-brand" />
                <h3 className="text-sm font-semibold uppercase tracking-widest">CPU Usage (%)</h3>
              </div>
              <div className="text-xl font-mono text-brand font-bold">{currentCPU}%</div>
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics}>
                  <defs>
                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#627EEA" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#627EEA" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis 
                    dataKey="time" 
                    hide 
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    stroke="#94A3B8" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#161B22', border: '1px solid #ffffff20', borderRadius: '8px' }}
                    itemStyle={{ color: '#627EEA' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="cpu" 
                    stroke="#627EEA" 
                    fillOpacity={1} 
                    fill="url(#colorCpu)" 
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-success" />
                <h3 className="text-sm font-semibold uppercase tracking-widest">Memory usage (GB)</h3>
              </div>
              <div className="text-xl font-mono text-success font-bold">{currentRAM} GB</div>
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics}>
                  <defs>
                    <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00FFA3" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00FFA3" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis 
                    dataKey="time" 
                    hide 
                  />
                  <YAxis 
                    domain={[0, 32]} 
                    stroke="#94A3B8" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => `${val}G`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#161B22', border: '1px solid #ffffff20', borderRadius: '8px' }}
                    itemStyle={{ color: '#00FFA3' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="ram" 
                    stroke="#00FFA3" 
                    fillOpacity={1} 
                    fill="url(#colorRam)" 
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Footer info & Logs */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 glass p-6">
            <div className="flex items-center gap-2 mb-6">
              <HardDrive size={16} className="text-brand" />
              <h3 className="text-sm font-semibold uppercase tracking-widest">System Health</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <HealthItem label="Entropy" value="4,096 bits" status="good" />
              <HealthItem label="File Descriptors" value="1,402 / 10,000" status="good" />
              <HealthItem label="Storage Latency" value="0.4ms" status="good" />
              <HealthItem label="P2P Bandwidth" value="1.2 MB/s" status="good" />
            </div>
            <div className="mt-8">
              <div className="text-[10px] uppercase tracking-widest text-[#94A3B8] mb-2">Storage (SSD)</div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden flex">
                <div className="h-full bg-brand w-[42%]" />
                <div className="h-full bg-slate-700 w-[58%]" />
              </div>
              <div className="flex justify-between mt-2 text-[11px]">
                <span className="text-white">842 GB Used</span>
                <span className="text-[#94A3B8]">1.15 TB available</span>
              </div>
            </div>
          </div>

          <div className="glass p-6 flex flex-col h-full min-h-[300px]">
            <div className="flex items-center gap-2 mb-4">
              <TerminalIcon size={16} className="text-brand" />
              <h3 className="text-sm font-semibold uppercase tracking-widest">Execution Logs</h3>
            </div>
            <div className="flex-grow overflow-hidden relative">
              <div className="space-y-1 custom-scrollbar overflow-y-auto max-h-[200px]">
                <AnimatePresence initial={false}>
                  {logs.map((log, i) => (
                    <motion.div 
                      key={`${log}-${i}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-[11px] font-mono py-1 border-b border-white/5 flex items-center gap-2"
                    >
                      <span className="text-brand">[{new Date().toLocaleTimeString('en-GB')}]</span>
                      <span className="text-white/80 line-clamp-1">{log}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 text-[11px] text-brand hover:text-brand/80 cursor-pointer transition-colors flex items-center justify-between">
              <span>View full log history</span>
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

function HealthItem({ label, value, status }: { label: string, value: string, status: 'good' | 'warning' | 'critical' }) {
  const statusColor = status === 'good' ? 'text-success' : status === 'warning' ? 'text-warning' : 'text-error';
  return (
    <div>
      <div className="text-[9px] uppercase tracking-widest text-[#94A3B8] mb-1">{label}</div>
      <div className={`text-sm font-semibold ${statusColor}`}>{value}</div>
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

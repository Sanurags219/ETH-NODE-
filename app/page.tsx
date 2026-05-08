'use client';

import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { motion, AnimatePresence } from 'motion/react';
import { useBlockNumber, useChainId } from 'wagmi';
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
  HardDrive,
  HeartPulse,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search
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
import NetworkMap from '@/components/NetworkMap';

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
type HealthStatus = 'checking' | 'healthy' | 'warning' | 'critical';

interface MetricData {
  time: string;
  timestamp: number;
  cpu: number;
  ram: number;
}

interface HealthCheck {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  timestamp: string;
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
  
  // Health check state
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('healthy');
  const [lastCheck, setLastCheck] = useState<string>(new Date().toLocaleTimeString());
  const [isChecking, setIsChecking] = useState(false);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([
    { id: '1', name: 'Database Integrity', status: 'passed', message: 'All levels verified', timestamp: new Date().toLocaleTimeString() },
    { id: '2', name: 'P2P Handshake', status: 'passed', message: '64 active peers detected', timestamp: new Date().toLocaleTimeString() },
    { id: '3', name: 'Block Finality', status: 'passed', message: 'Validating latest state', timestamp: new Date().toLocaleTimeString() },
  ]);

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

    // Initialize metrics
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

      const newTs = Date.now();
      setMetrics(prev => {
        const next = [...prev, {
          time: new Date(newTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: newTs,
          cpu: Math.floor(Math.random() * 20 + 35),
          ram: parseFloat((Math.random() * 0.5 + 17.8).toFixed(1))
        }];
        return next.slice(-60);
      });
    }, 4000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const runHealthCheck = async () => {
    setIsChecking(true);
    setHealthStatus('checking');
    
    // Simulate check delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newTimestamp = new Date().toLocaleTimeString();
    const updatedChecks: HealthCheck[] = [
      { 
        id: '1', 
        name: 'Database Integrity', 
        status: Math.random() > 0.05 ? 'passed' : 'warning', 
        message: Math.random() > 0.05 ? 'All levels verified' : 'Minor fragmentation detected',
        timestamp: newTimestamp 
      },
      { 
        id: '2', 
        name: 'P2P Handshake', 
        status: status === 'disconnected' ? 'failed' : 'passed', 
        message: status === 'disconnected' ? 'No peers found' : 'Healthy peer count',
        timestamp: newTimestamp 
      },
      { 
        id: '3', 
        name: 'Block Finality', 
        status: status === 'syncing' ? 'warning' : 'passed', 
        message: status === 'syncing' ? 'Synchronizing headers' : 'State is final',
        timestamp: newTimestamp 
      },
    ];

    setHealthChecks(updatedChecks);
    setLastCheck(newTimestamp);
    
    const hasFailed = updatedChecks.some(c => c.status === 'failed');
    const hasWarning = updatedChecks.some(c => c.status === 'warning');
    
    if (hasFailed) setHealthStatus('critical');
    else if (hasWarning) setHealthStatus('warning');
    else setHealthStatus('healthy');
    
    setIsChecking(false);
  };

  // Update status based on block monitoring
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

  const networkName = chainId === 8453 ? "Base" : chainId === 1 ? "Ethereum" : "Mainnet";
  const currentCPU = metrics.length > 0 ? metrics[metrics.length - 1].cpu : 0;
  const currentRAM = metrics.length > 0 ? metrics[metrics.length - 1].ram : 0;

  if (!isReady) return null;

  return (
    <div className="flex h-screen w-full bg-[#05070A] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 p-6 flex flex-col shrink-0">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 bg-[#627EEA] rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-[#627EEA]/40">
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
          <SidebarItem icon={<Layers size={18} />} label="Execution" />
          <SidebarItem icon={<Activity size={18} />} label="Metrics" />
          <SidebarItem icon={<Settings size={18} />} label="Settings" />
        </nav>

        <div className="glass p-4 mt-auto">
          <div className="flex items-center gap-2 mb-2">
            <StatusIndicator status={status} />
            <span className={`text-xs font-medium ${
              status === 'connected' ? 'text-[#00FFA3]' : 
              status === 'syncing' ? 'text-[#F59E0B]' : 
              'text-[#EF4444]'
            }`}>
              {status === 'connected' ? 'Online' : status === 'syncing' ? 'Syncing' : 'Offline'}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono flex justify-between">
            <span>Uptime</span>
            <span>{uptime}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
        <header className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-light text-white">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">
              Network: <span className="text-white">{networkName}</span> • Instance: <span className="text-white font-mono">eth-primary-01</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`px-4 py-1.5 rounded-full glass border flex items-center gap-2 ${
              healthStatus === 'healthy' ? 'border-[#00FFA3]/20 bg-[#00FFA3]/5' : 
              healthStatus === 'warning' ? 'border-[#F59E0B]/20 bg-[#F59E0B]/5' : 
              'border-[#EF4444]/20 bg-[#EF4444]/5'
            }`}>
              <HeartPulse size={14} className={
                healthStatus === 'healthy' ? 'text-[#00FFA3]' : 
                healthStatus === 'warning' ? 'text-[#F59E0B]' : 
                'text-[#EF4444]'
              } />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {healthStatus === 'checking' ? 'System Checking...' : `System ${healthStatus}`}
              </span>
            </div>
            <button 
              onClick={runHealthCheck}
              disabled={isChecking}
              className="p-2 glass hover:bg-white/10 rounded-lg transition-all"
            >
              <RefreshCw size={18} className={isChecking ? "animate-spin text-[#627EEA]" : "text-white"} />
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <StatCard label="Block Height" value={blockNumber ? `#${blockNumber.toLocaleString()}` : "Loading..."} icon={<Layers size={14} className="text-[#627EEA]" />} />
          <StatCard label="Active Peers" value={status === 'disconnected' ? "0" : "64"} icon={<Network size={14} className="text-[#627EEA]" />} />
          <StatCard label="Sync Progress" value={status === 'syncing' ? "88.4%" : "100%"} progress={status === 'syncing' ? 88.4 : 100} icon={<Activity size={14} className="text-[#627EEA]" />} />
          <StatCard label="Peer Latency" value="38ms" icon={<Zap size={14} className="text-[#00FFA3]" />} />
        </section>

        {/* Network Map Integration */}
        <NetworkMap />

        {/* Resource Monitoring */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="glass p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-[#627EEA]" />
                <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Total CPU Load</h3>
              </div>
              <div className="text-xl font-mono text-[#627EEA] font-bold">{currentCPU}%</div>
            </div>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics}>
                  <defs>
                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#627EEA" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#627EEA" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="cpu" stroke="#627EEA" fillOpacity={1} fill="url(#colorCpu)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-[#00FFA3]" />
                <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Memory usage</h3>
              </div>
              <div className="text-xl font-mono text-[#00FFA3] font-bold">{currentRAM} GB</div>
            </div>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics}>
                  <defs>
                    <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00FFA3" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00FFA3" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="ram" stroke="#00FFA3" fillOpacity={1} fill="url(#colorRam)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* System & Logs */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} className="text-[#627EEA]" />
              <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Security Report</h3>
            </div>
            <div className="space-y-3">
              {healthChecks.map((check) => (
                <div key={check.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="mt-0.5">
                    {check.status === 'passed' ? <CheckCircle2 size={16} className="text-[#00FFA3]" /> : 
                     check.status === 'warning' ? <AlertTriangle size={16} className="text-[#F59E0B]" /> : 
                     <XCircle size={16} className="text-[#EF4444]" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{check.name}</div>
                    <div className="text-[10px] text-slate-500">{check.message}</div>
                  </div>
                  <div className="ml-auto text-[9px] font-mono text-slate-600">{check.timestamp}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TerminalIcon size={16} className="text-[#627EEA]" />
                <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Live system logs</h3>
              </div>
              <button className="text-[10px] text-[#627EEA] hover:underline">View All</button>
            </div>
            <div className="space-y-1.5 h-[160px] overflow-hidden">
              <AnimatePresence initial={false}>
                {logs.map((log, i) => (
                  <motion.div 
                    key={`${log}-${i}`}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-[10px] font-mono p-1 border-b border-white/5 flex gap-3"
                  >
                    <span className="text-[#627EEA] shrink-0 opacity-60">[{new Date().toLocaleTimeString()}]</span>
                    <span className="text-slate-300 truncate">{log}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all ${
      active ? 'bg-[#627EEA]/10 text-[#627EEA] border border-[#627EEA]/20' : 'text-slate-500 hover:text-white hover:bg-white/5'
    }`}>
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function StatusIndicator({ status }: { status: ConnectionStatus }) {
  const color = status === 'connected' ? 'bg-[#00FFA3]' : status === 'syncing' ? 'bg-[#F59E0B]' : 'bg-[#EF4444]';
  return (
    <div className={`w-2 h-2 rounded-full ${color} ${status !== 'disconnected' ? 'animate-pulse' : ''}`} />
  );
}

function StatCard({ label, value, icon, progress }: { label: string, value: string, icon: React.ReactNode, progress?: number }) {
  return (
    <div className="glass p-5">
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] uppercase tracking-widest text-slate-500">{label}</span>
        {icon}
      </div>
      <div className="text-xl font-bold text-white mb-2">{value}</div>
      {progress !== undefined && (
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className={`h-full ${progress === 100 ? 'bg-[#00FFA3]' : 'bg-[#F59E0B]'}`}
          />
        </div>
      )}
    </div>
  );
}

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

    // Periodic health check every 30 seconds
    const healthInterval = setInterval(runHealthCheck, 30000);

    return () => {
      clearInterval(interval);
      clearInterval(healthInterval);
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
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full glass border ${
              healthStatus === 'healthy' ? 'border-success/30 bg-success/5' : 
              healthStatus === 'warning' ? 'border-warning/30 bg-warning/5' : 
              'border-error/30 bg-error/5'
            }`}>
              <HeartPulse size={14} className={
                healthStatus === 'healthy' ? 'text-success' : 
                healthStatus === 'warning' ? 'text-warning' : 
                'text-error'
              } />
              <span className="text-xs font-medium uppercase tracking-wider">
                {healthStatus === 'checking' ? 'System Checking...' : `System ${healthStatus}`}
              </span>
            </div>
            <button 
              onClick={runHealthCheck}
              disabled={isChecking}
              className="p-2 glass hover:bg-white/10 rounded-lg transition-all disabled:opacity-50"
            >
              <RefreshCw size={18} className={isChecking ? "animate-spin text-brand" : "text-white"} />
            </button>
          </div>
        </header>

        {/* Global Stats */}
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
            label="Integrity Health" 
            value={healthStatus.charAt(0).toUpperCase() + healthStatus.slice(1)} 
            valueClassName="text-xl"
            icon={<HeartPulse size={14} className={healthStatus === 'healthy' ? 'text-success' : 'text-warning'} />}
          />
        </section>

        <NetworkMap />

        {/* Charts Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="glass p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-brand" />
                <h3 className="text-sm font-semibold uppercase tracking-widest">CPU Load</h3>
              </div>
              <div className="text-xl font-mono text-brand font-bold">{currentCPU}%</div>
            </div>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics}>
                  <defs>
                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#627EEA" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#627EEA" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
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
                <h3 className="text-sm font-semibold uppercase tracking-widest">Mem Committed</h3>
              </div>
              <div className="text-xl font-mono text-success font-bold">{currentRAM} GB</div>
            </div>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics}>
                  <defs>
                    <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00FFA3" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00FFA3" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
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

        {/* Health Check Details & Logs */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Health Checks */}
          <div className="glass p-6 flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-brand" />
                <h3 className="text-sm font-semibold uppercase tracking-widest">Integrity Report</h3>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Last: {lastCheck}</span>
            </div>
            
            <div className="space-y-3 flex-grow">
              {healthChecks.map((check) => (
                <div key={check.id} className="p-3 bg-black/30 rounded-xl border border-white/5 flex items-start gap-3">
                  <div className="mt-1">
                    {check.status === 'passed' ? <CheckCircle2 size={16} className="text-success" /> : 
                     check.status === 'warning' ? <AlertTriangle size={16} className="text-warning" /> : 
                     <XCircle size={16} className="text-error" />}
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white">{check.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono italic">{check.status.toUpperCase()}</span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">{check.message}</p>
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={runHealthCheck}
              className={`mt-4 w-full py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                isChecking ? 'bg-brand/10 text-brand' : 'bg-brand text-white hover:bg-brand/90'
              }`}
            >
              {isChecking ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
              {isChecking ? 'Verifying Integrity...' : 'Run Integrity Scan'}
            </button>
          </div>

          {/* System Info */}
          <div className="glass p-6 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-6">
              <HardDrive size={16} className="text-brand" />
              <h3 className="text-sm font-semibold uppercase tracking-widest">Node Resources</h3>
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] uppercase tracking-widest text-slate-500">SSD Storage (NVMe)</span>
                  <span className="text-xs font-mono text-white">42%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '42%' }}
                    className="h-full bg-brand" 
                  />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-slate-500 italic">
                  <span>842GB Used</span>
                  <span>1.15TB Available</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <HealthItem label="Entropy" value="4,096 bits" status="good" />
                <HealthItem label="I/O Wait" value="0.04ms" status="good" />
                <HealthItem label="Net In (24h)" value="124.5 GB" status="good" />
                <HealthItem label="Net Out (24h)" value="42.1 GB" status="good" />
              </div>
            </div>
          </div>

          {/* Logs */}
          <div className="glass p-6 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4">
              <TerminalIcon size={16} className="text-brand" />
              <h3 className="text-sm font-semibold uppercase tracking-widest">Live Logs</h3>
            </div>
            <div className="flex-grow overflow-hidden relative">
              <div className="space-y-1 custom-scrollbar overflow-y-auto max-h-[180px]">
                <AnimatePresence initial={false}>
                  {logs.map((log, i) => (
                    <motion.div 
                      key={`${log}-${i}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-[10px] font-mono py-1 border-b border-white/5 flex items-center gap-2"
                    >
                      <span className="text-brand opacity-60">[{new Date().toLocaleTimeString('en-GB')}]</span>
                      <span className="text-white/80 line-clamp-1">{log}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 text-[10px] text-brand hover:text-brand/80 cursor-pointer transition-colors flex items-center justify-between font-bold">
              <span>EXPLORE TERMINAL</span>
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
      <div className={`text-xs font-bold leading-none ${statusColor}`}>{value}</div>
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

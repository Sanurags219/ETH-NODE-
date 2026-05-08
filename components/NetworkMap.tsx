'use client';

/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/refs */

import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Filter, X, Globe, Users, Zap, Shield, 
  Clock, Network, Activity, ChevronDown, ChevronUp, 
  Loader2, Signal, Cpu, HardDrive, Info, Terminal
} from 'lucide-react';

interface NodeHistory {
  timestamp: string;
  status: 'active' | 'syncing' | 'idle';
  latency: number;
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  group: number;
  label: string;
  latency: number;
  location: string;
  ip: string;
  status: 'active' | 'syncing' | 'idle';
  lastSeen: string;
  uptime: string;
  cpuLimit: number;
  memoryLimit: number;
  version: string;
  os: string;
  history: NodeHistory[];
  peerId: string;
  listenAddrs: string[];
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  value: number;
}

const generateMockHistory = (baseLatency: number): NodeHistory[] => {
  const history: NodeHistory[] = [];
  const now = new Date();
  for (let i = 0; i < 10; i++) {
    const time = new Date(now.getTime() - i * 3600000 * 2);
    history.push({
      timestamp: time.toISOString(),
      status: Math.random() > 0.1 ? 'active' : 'idle',
      latency: Math.max(5, baseLatency + Math.floor(Math.random() * 20) - 10)
    });
  }
  return history;
};

const INITIAL_NODES: Node[] = [
  { 
    id: 'local-node', group: 1, label: 'Local Node', latency: 0, 
    location: 'San Francisco, US', ip: '192.168.1.42', status: 'active', 
    lastSeen: 'Now', uptime: '142d 18h', cpuLimit: 90, memoryLimit: 85,
    version: 'v2.4.1-alpha', os: 'Alpine Linux 3.18',
    history: generateMockHistory(5),
    peerId: '12D3KooW...sf9w',
    listenAddrs: ['/ip4/127.0.0.1/tcp/4001', '/ip4/192.168.1.42/tcp/4001']
  },
  { 
    id: 'peer-1', group: 2, label: 'Peer 0x71...f2', latency: 45, 
    location: 'London, UK', ip: '85.12.33.210', status: 'active', 
    lastSeen: '2s ago', uptime: '12d 4h', cpuLimit: 80, memoryLimit: 75,
    version: 'v2.3.9-stable', os: 'Ubuntu 22.04 LTS',
    history: generateMockHistory(45),
    peerId: '12D3KooL...P9x7',
    listenAddrs: ['/ip4/85.12.33.210/tcp/4001']
  },
  { 
    id: 'peer-2', group: 2, label: 'Peer 0x3a...11', latency: 120, 
    location: 'Tokyo, JP', ip: '103.4.112.5', status: 'idle', 
    lastSeen: '15s ago', uptime: '3d 2h', cpuLimit: 70, memoryLimit: 60,
    version: 'v2.3.8-stable', os: 'Debian 12',
    history: generateMockHistory(120),
    peerId: '12D3KooK...Lm22',
    listenAddrs: ['/ip4/103.4.112.5/tcp/4001']
  },
  { 
    id: 'peer-3', group: 2, label: 'Peer 0xbc...44', latency: 15, 
    location: 'New York, US', ip: '162.243.12.8', status: 'active', 
    lastSeen: 'Now', uptime: '45d 11h', cpuLimit: 95, memoryLimit: 90,
    version: 'v2.4.0-rc1', os: 'Alpine Linux 3.19',
    history: generateMockHistory(15),
    peerId: '12D3KooJ...Qq55',
    listenAddrs: ['/ip4/162.243.12.8/tcp/4001']
  },
  { 
    id: 'peer-4', group: 2, label: 'Peer 0x92...8e', latency: 85, 
    location: 'Berlin, DE', ip: '94.23.4.156', status: 'syncing', 
    lastSeen: 'Syncing', uptime: '0d 12h', cpuLimit: 75, memoryLimit: 70,
    version: 'v2.3.9-stable', os: 'Ubuntu 20.04 LTS',
    history: generateMockHistory(85),
    peerId: '12D3KooH...As11',
    listenAddrs: ['/ip4/94.23.4.156/tcp/4001']
  }
];

const INITIAL_LINKS: Link[] = [
  { source: 'local-node', target: 'peer-1', value: 1 },
  { source: 'local-node', target: 'peer-2', value: 1 },
  { source: 'local-node', target: 'peer-3', value: 1 },
  { source: 'local-node', target: 'peer-4', value: 1 },
];

export function NetworkMap() {
  const [nodes, setNodes] = useState<Node[]>(INITIAL_NODES);
  const [links, setLinks] = useState<Link[]>(INITIAL_LINKS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'syncing' | 'idle'>('all');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<number | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticStep, setDiagnosticStep] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);
  const prevNodesRef = useRef<Node[]>([]);

  // Simulation setup
  useEffect(() => {
    if (!svgRef.current) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const simulation = d3.forceSimulation<Node>(nodes)
      .force('link', d3.forceLink<Node, Link>(links).id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    simulationRef.current = simulation;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g');

    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#627EEA')
      .attr('stroke-opacity', 0.2)
      .attr('stroke-width', 1);

    const node = g.append('g')
      .selectAll('.node')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .on('click', (event, d) => setSelectedNode(d))
      .call(d3.drag<any, Node>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    node.append('circle')
      .attr('r', 8)
      .attr('fill', d => d.status === 'active' ? '#00FFA3' : d.status === 'syncing' ? '#F59E0B' : '#EF4444')
      .attr('stroke', '#FFF')
      .attr('stroke-width', 1.5)
      .attr('class', 'cursor-pointer transition-all hover:scale-125');

    node.append('text')
      .text(d => d.label)
      .attr('x', 12)
      .attr('y', 4)
      .attr('fill', '#94A3B8')
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .attr('class', 'pointer-events-none select-none');

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as Node).x!)
        .attr('y1', d => (d.source as Node).y!)
        .attr('x2', d => (d.target as Node).x!)
        .attr('y2', d => (d.target as Node).y!);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [nodes, links]);

  useEffect(() => {
    if (selectedNode) {
      if (pingResult !== null) setPingResult(null);
      if (isPinging) setIsPinging(false);
      if (showHistory) setShowHistory(false);
      if (showMoreDetails) setShowMoreDetails(false);
    }
  }, [selectedNode]);

  const handlePing = () => {
    setIsPinging(true);
    setPingResult(null);
    setTimeout(() => {
      setIsPinging(false);
      setPingResult(Math.floor(Math.random() * 80) + 10);
    }, 1500);
  };

  const handleRunDiagnostic = () => {
    setIsDiagnosing(true);
    setDiagnosticStep(1);
    const steps = [1, 2, 3];
    steps.forEach((step, i) => {
      setTimeout(() => {
        setDiagnosticStep(step);
        if (step === 3) {
          setTimeout(() => {
            setIsDiagnosing(false);
            setDiagnosticStep(0);
          }, 1000);
        }
      }, (i + 1) * 1500);
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden relative border border-white/5 rounded-2xl">
      <div className="p-4 border-b border-white/5 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between z-10 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#627EEA]/10 rounded-xl">
            <Globe size={18} className="text-[#627EEA]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">GLOBAL PEER TOPOLOGY</h2>
            <p className="text-[10px] text-slate-500 font-medium">8 NODES DETECTED • 2 SYNCING</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="PEER ID / IP..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-[#627EEA]/50 w-48 transition-all"
            />
          </div>
          <button className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-400">
            <Filter size={14} />
          </button>
        </div>
      </div>

      <div className="flex-grow relative overflow-hidden group">
        <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
        
        {/* Node Inspector Overlay */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div 
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 h-full w-[360px] bg-slate-900 border-l border-white/10 backdrop-blur-xl shadow-2xl p-6 z-20 flex flex-col custom-scrollbar overflow-y-auto"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full animate-pulse ${selectedNode.status === 'active' ? 'bg-[#00FFA3]' : selectedNode.status === 'syncing' ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'}`} />
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">{selectedNode.label}</h3>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span className="font-mono">{selectedNode.ip}</span>
                      <span>•</span>
                      <span>{selectedNode.location}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedNode(null)}
                  className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="UPTIME" value={selectedNode.uptime} icon={<Clock size={12} />} />
                  <StatCard label="LATENCY" value={`${selectedNode.latency}ms`} icon={<Zap size={12} />} color="#627EEA" />
                </div>

                <div className="pt-6 border-t border-white/5 space-y-6 text-sm">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-4 font-bold">Health Snapshot</div>
                    <div className="space-y-4">
                      <HealthBar label="CPU Usage" value={selectedNode.status === 'active' ? 42 : selectedNode.status === 'syncing' ? 94 : 5} limit={selectedNode.cpuLimit} color="#627EEA" />
                      <HealthBar label="Memory Consumption" value={selectedNode.status === 'syncing' ? 88 : 14} limit={selectedNode.memoryLimit} color={selectedNode.status === 'syncing' ? '#F59E0B' : '#00FFA3'} />
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                          <div className="text-[8px] text-slate-500 uppercase tracking-tighter mb-1 font-bold">Disk Read/Write</div>
                          <div className="text-[11px] font-mono text-white">
                            {selectedNode.status === 'syncing' ? '142.4 MB/s' : '1.2 MB/s'}
                          </div>
                        </div>
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                          <div className="text-[8px] text-slate-500 uppercase tracking-tighter mb-1 font-bold">Network Drops</div>
                          <div className="text-[11px] font-mono text-[#00FFA3]">0.002%</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={handlePing}
                      disabled={isPinging}
                      className="flex-grow py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isPinging ? <Loader2 size={12} className="animate-spin" /> : <Signal size={12} className="text-[#627EEA]" />}
                      PING TEST
                    </button>
                    <button 
                      onClick={() => setShowHistory(!showHistory)}
                      className={`flex-grow py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold text-white flex items-center justify-center gap-2 transition-all ${showHistory ? 'ring-1 ring-[#627EEA]/50 bg-white/10' : ''}`}
                    >
                      <Clock size={12} className={showHistory ? 'text-[#627EEA]' : ''} />
                      HISTORY
                    </button>
                    <button 
                      onClick={() => setShowMoreDetails(!showMoreDetails)}
                      className={`flex-grow py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold text-white flex items-center justify-center gap-2 transition-all ${showMoreDetails ? 'ring-1 ring-[#627EEA]/50 bg-white/10' : ''}`}
                    >
                      <Info size={12} className={showMoreDetails ? 'text-[#627EEA]' : ''} />
                      DETAILS
                    </button>
                  </div>

                  {pingResult !== null && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`p-3 border rounded-xl flex justify-between items-center ${pingResult < 50 ? 'bg-[#00FFA3]/5 border-[#00FFA3]/20' : 'bg-[#F59E0B]/5 border-[#F59E0B]/20'}`}>
                      <span className="text-[10px] text-slate-400 font-medium">Ping Latency</span>
                      <span className={`text-xs font-mono font-bold tracking-wider ${pingResult < 50 ? 'text-[#00FFA3]' : 'text-[#F59E0B]'}`}>{pingResult}ms</span>
                    </motion.div>
                  )}

                  <AnimatePresence>
                    {showHistory && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-4 pt-2">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="text-[10px] uppercase tracking-widest text-[#627EEA] font-bold">Node History</div>
                            <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5">
                              {(['24h', '7d', '30d'] as const).map(range => (
                                <button key={range} onClick={() => setTimeRange(range)} className={`px-2 py-1 text-[8px] font-bold rounded-md transition-all ${timeRange === range ? 'bg-[#627EEA] text-white' : 'text-slate-500 hover:text-slate-300'}`}>{range.toUpperCase()}</button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">{selectedNode.history.map((event, idx) => (
                            <div key={idx} className="flex gap-3 relative">
                              {idx !== selectedNode.history.length - 1 && <div className="absolute left-1.5 top-4 bottom-0 w-[1px] bg-white/5" />}
                              <div className={`mt-1.5 w-3 h-3 rounded-full flex-shrink-0 z-10 ${event.status === 'active' ? 'bg-[#00FFA3]/20 border border-[#00FFA3]/50' : 'bg-slate-500/20 border border-slate-500/50'}`}><div className={`w-1 h-1 rounded-full m-auto mt-0.5 ${event.status === 'active' ? 'bg-[#00FFA3]' : 'bg-slate-400'}`} /></div>
                              <div className="flex-grow space-y-1 pb-3">
                                <div className="flex justify-between items-center"><span className="text-[9px] font-bold text-white uppercase tracking-tight">STATUS: {event.status.toUpperCase()}</span><span className="text-[8px] font-mono text-slate-500">{new Date(event.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
                                <div className="flex items-center gap-2"><Zap size={8} className="text-[#627EEA]" /><span className="text-[9px] font-mono text-slate-400">Latency: {event.latency}ms</span></div>
                              </div>
                            </div>
                          ))}</div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {showMoreDetails && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-4 pt-2">
                        <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/5">
                          <div>
                            <div className="text-[10px] uppercase tracking-widest text-[#627EEA] mb-3 font-bold flex items-center gap-2"><Cpu size={10} /> Software & Environment</div>
                            <div className="grid grid-cols-2 gap-3 text-[10px]">
                              <div className="p-2 bg-black/20 rounded-lg border border-white/5"><div className="text-slate-500 mb-1">VERSION</div><div className="font-mono text-white">{selectedNode.version}</div></div>
                              <div className="p-2 bg-black/20 rounded-lg border border-white/5"><div className="text-slate-500 mb-1">OPERATING SYSTEM</div><div className="text-white">{selectedNode.os}</div></div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-white/5">
                            <div className="text-[10px] uppercase tracking-widest text-[#627EEA] mb-3 font-bold flex items-center gap-2"><Network size={10} /> P2P Network Config</div>
                            <div className="space-y-2">
                              <div className="p-2 bg-black/20 rounded-lg border border-white/5 text-[10px]">
                                <div className="text-slate-500 mb-1">CORE PEER ID</div>
                                <div className="font-mono text-white overflow-hidden text-ellipsis whitespace-nowrap">{selectedNode.peerId}</div>
                              </div>
                              <div className="p-2 bg-black/20 rounded-lg border border-white/5 text-[10px]">
                                <div className="text-slate-500 mb-1">PROTOCOLS / LISTEN ADDRESSES</div>
                                <div className="space-y-1 mt-1 font-mono text-white/80">
                                  {selectedNode.listenAddrs.map((addr, i) => <div key={i} className="text-[9px] bg-slate-800/50 p-1 rounded px-2">{addr}</div>)}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-[10px]">
                                <div className="p-2 bg-black/20 rounded-lg border border-white/5"><div className="text-slate-500 mb-1">ENCRYPTION</div><div className="text-white">AES-256-GCM</div></div>
                                <div className="p-2 bg-black/20 rounded-lg border border-white/5"><div className="text-slate-500 mb-1">RELAY MODE</div><div className="text-white">Autonat / Proxy</div></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button onClick={handleRunDiagnostic} disabled={isDiagnosing} className="w-full py-4 bg-[#627EEA] hover:bg-[#5068D0] disabled:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-[#627EEA]/20 flex items-center justify-center gap-3">
                    {isDiagnosing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        {diagnosticStep === 1 ? 'CHECKING STATE...' : diagnosticStep === 2 ? 'VERIFYING P2P...' : 'FINALIZING...'}
                      </>
                    ) : (
                      <>
                        <Terminal size={14} />
                        RUN FULL DIAGNOSTIC
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color = '#94A3B8' }: { label: string, value: string, icon: React.ReactNode, color?: string }) {
  return (
    <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center gap-3">
      <div className="p-2 bg-slate-800 rounded-lg text-slate-400">{icon}</div>
      <div>
        <div className="text-[8px] text-slate-500 uppercase tracking-tighter font-bold">{label}</div>
        <div className="text-xs font-mono font-bold text-white tracking-widest" style={{ color }}>{value}</div>
      </div>
    </div>
  );
}

function HealthBar({ label, value, limit, color }: { label: string, value: number, limit?: number, color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-[9px] uppercase tracking-wider text-slate-500 font-bold">
        <div className="flex items-center gap-2"><span>{label}</span>{limit && <span className="text-[7px] text-slate-600 font-normal">LIMIT: {limit}%</span>}</div>
        <span className="font-mono" style={{ color }}>{value}%</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden relative">
        <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} className="h-full relative z-10" style={{ backgroundColor: color }} />
        {limit && <div className="absolute top-0 bottom-0 w-0.5 bg-white/20 z-20" style={{ left: `${limit}%` }} title={`Threshold: ${limit}%`} />}
      </div>
    </div>
  );
}

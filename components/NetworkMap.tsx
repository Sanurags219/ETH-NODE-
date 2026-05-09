'use client';

/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/refs */

import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  Search, Filter, X, Globe, Users, Zap, Shield, 
  Clock, Network, Activity, ChevronDown, ChevronUp, 
  Loader2, Signal, Cpu, HardDrive, Info, Terminal
} from 'lucide-react';
import { Node, Link, INITIAL_LINKS } from '@/lib/types';

interface NetworkMapProps {
  nodes: Node[];
  searchQuery: string;
  statusFilter: 'all' | 'active' | 'syncing' | 'idle';
  selectedNodeId: string | null;
  onNodeSelect: (id: string | null) => void;
}

export function NetworkMap({ nodes, searchQuery, statusFilter, selectedNodeId, onNodeSelect }: NetworkMapProps) {
  const [links] = useState<Link[]>(INITIAL_LINKS);
  const [pingResult, setPingResult] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticStep, setDiagnosticStep] = useState(0);
  const [diagnosticResults, setDiagnosticResults] = useState<{ step: number; label: string; status: 'success' | 'warning'; detail: string }[]>([]);
  const [activeTab, setActiveTab] = useState<'health' | 'history' | 'network'>('health');
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);

  const selectedNode = useMemo(() => 
    nodes.find(n => n.id === selectedNodeId) || null
  , [nodes, selectedNodeId]);

  const isMatch = (node: Node) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || (
      node.label.toLowerCase().includes(query) ||
      node.ip.toLowerCase().includes(query) ||
      node.version.toLowerCase().includes(query) ||
      node.peerId.toLowerCase().includes(query)
    );
    const matchesStatus = statusFilter === 'all' || node.status === statusFilter;
    return matchesSearch && matchesStatus;
  };

  // Simulation setup
  useEffect(() => {
    if (!svgRef.current) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const simulation = d3.forceSimulation<Node>(nodes)
      .force('link', d3.forceLink<Node, Link>(links).id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(45));

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
      .on('click', (event, d) => onNodeSelect(d.id))
      .call(d3.drag<any, Node>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Outer glow for matching nodes
    const pulseGlow = node.append('circle')
      .attr('r', 12)
      .attr('fill', 'none')
      .attr('stroke', '#627EEA')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0)
      .attr('class', 'pulse-glow');

    // Main node circle
    node.append('circle')
      .attr('r', 9)
      .attr('fill', '#1E293B')
      .attr('stroke', d => d.status === 'active' ? '#00FFA3' : d.status === 'syncing' ? '#F59E0B' : '#94A3B8')
      .attr('stroke-width', 2)
      .attr('class', 'cursor-pointer transition-all hover:scale-110');

    // Status Badge (Orbit Dot)
    node.append('circle')
      .attr('r', 4)
      .attr('cx', 8)
      .attr('cy', -8)
      .attr('fill', '#0F172A')
      .attr('stroke', 'rgba(255,255,255,0.2)')
      .attr('stroke-width', 0.5);

    node.append('circle')
      .attr('r', 2.5)
      .attr('cx', 8)
      .attr('cy', -8)
      .attr('fill', d => d.status === 'active' ? '#00FFA3' : d.status === 'syncing' ? '#F59E0B' : '#94A3B8')
      .attr('class', d => d.status === 'syncing' ? 'animate-pulse' : '');

    node.append('text')
      .text(d => d.label)
      .attr('x', 14)
      .attr('y', 4)
      .attr('fill', '#94A3B8')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .attr('class', 'pointer-events-none select-none tracking-tight');

    simulation.on('tick', () => {
      // Apply search and status filtering styles
      const hasFilter = searchQuery.trim().length > 0 || statusFilter !== 'all';
      
      link.attr('stroke-opacity', d => {
        const sourceMatch = isMatch(d.source as Node);
        const targetMatch = isMatch(d.target as Node);
        if (hasFilter) {
          return (sourceMatch && targetMatch) ? 0.4 : 0.05;
        }
        return 0.2;
      });

      node.style('opacity', d => {
        if (hasFilter && !isMatch(d)) return 0.2;
        return 1;
      });

      pulseGlow
        .attr('stroke-opacity', d => {
          if (hasFilter && isMatch(d)) return 0.5;
          if (selectedNodeId === d.id) return 0.8;
          return 0;
        })
        .attr('r', d => {
          if (hasFilter && isMatch(d)) return 12 + Math.sin(Date.now() / 200) * 2;
          if (selectedNodeId === d.id) return 14;
          return 12;
        });

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
  }, [nodes, links, searchQuery, statusFilter, selectedNodeId]);

  useEffect(() => {
    if (selectedNodeId) {
      if (pingResult !== null) setPingResult(null);
      if (isPinging) setIsPinging(false);
      setDiagnosticResults([]);
      setActiveTab('health');
    }
  }, [selectedNodeId]);

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
    setDiagnosticResults([]);
    
    const steps = [
      { step: 1, label: 'Kernel Integrity', detail: 'Checksum verified with root set.' },
      { step: 2, label: 'DHT Routing Info', detail: '24 nodes found in closest bucket.' },
      { step: 3, label: 'Consensus Sync', detail: 'Head block matches stable height.' }
    ];

    steps.forEach((s, i) => {
      setTimeout(() => {
        setDiagnosticStep(s.step);
        setDiagnosticResults(prev => [...prev, { ...s, status: i === 1 && Math.random() > 0.7 ? 'warning' : 'success' }]);
        
        if (s.step === 3) {
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
            <h2 className="text-sm font-bold text-white tracking-tight uppercase">Topology Inspector</h2>
            <p className="text-[10px] text-slate-500 font-medium tracking-wide">
              {statusFilter !== 'all' || searchQuery ? `SHOWING ${nodes.filter(n => isMatch(n)).length} FILTERED RESULTS` : `${nodes.length} PERSISTENT PEERS ACTIVE`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(statusFilter !== 'all' || searchQuery) && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#627EEA]/10 border border-[#627EEA]/20 rounded-full">
              <span className="text-[8px] font-bold text-[#627EEA] uppercase tracking-tighter">Filter Active</span>
              <div className="w-1 h-1 rounded-full bg-[#627EEA] animate-ping" />
            </div>
          )}
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
                  <div className={`w-3 h-3 rounded-full animate-pulse ${selectedNode.status === 'active' ? 'bg-[#00FFA3]' : selectedNode.status === 'syncing' ? 'bg-[#F59E0B]' : 'bg-[#94A3B8]'}`} />
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
                  onClick={() => onNodeSelect(null)}
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

                <div className="pt-4 border-t border-white/5">
                  <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 mb-6">
                    <button onClick={() => setActiveTab('health')} className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'health' ? 'bg-[#627EEA] text-white' : 'text-slate-500 hover:text-white'}`}>
                      <Activity size={12} /> HEALTH
                    </button>
                    <button onClick={() => setActiveTab('history')} className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'history' ? 'bg-[#627EEA] text-white' : 'text-slate-500 hover:text-white'}`}>
                      <Clock size={12} /> HISTORY
                    </button>
                    <button onClick={() => setActiveTab('network')} className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'network' ? 'bg-[#627EEA] text-white' : 'text-slate-500 hover:text-white'}`}>
                      <Network size={12} /> NETWORK
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {activeTab === 'health' && (
                      <motion.div 
                        key="health"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                      >
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

                        <button 
                          onClick={handlePing}
                          disabled={isPinging}
                          className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                          {isPinging ? <Loader2 size={12} className="animate-spin" /> : <Signal size={12} className="text-[#627EEA]" />}
                          RUN LIVE PING TEST
                        </button>

                        {pingResult !== null && (
                          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`p-4 border rounded-xl flex justify-between items-center ${pingResult < 50 ? 'bg-[#00FFA3]/5 border-[#00FFA3]/20' : 'bg-[#F59E0B]/5 border-[#F59E0B]/20'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${pingResult < 50 ? 'bg-[#00FFA3]/10' : 'bg-[#F59E0B]/10'}`}>
                                <Zap size={14} className={pingResult < 50 ? 'text-[#00FFA3]' : 'text-[#F59E0B]'} />
                              </div>
                              <span className="text-[10px] text-slate-400 font-medium tracking-tight">RESPONSE TIME</span>
                            </div>
                            <span className={`text-sm font-mono font-bold tracking-wider ${pingResult < 50 ? 'text-[#00FFA3]' : 'text-[#F59E0B]'}`}>{pingResult}ms</span>
                          </motion.div>
                        )}
                      </motion.div>
                    )}

                    {activeTab === 'history' && (
                      <motion.div 
                        key="history"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                      >
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="text-[10px] uppercase tracking-widest text-[#627EEA] font-bold">Latency (30m intervals)</div>
                            <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5">
                              {(['24h', '7d', '30d'] as const).map(range => (
                                <button key={range} onClick={() => setTimeRange(range)} className={`px-2 py-1 text-[8px] font-bold rounded-md transition-all ${timeRange === range ? 'bg-[#627EEA] text-white' : 'text-slate-500 hover:text-slate-300'}`}>{range.toUpperCase()}</button>
                              ))}
                            </div>
                          </div>

                          <div className="h-[120px] w-full mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={selectedNode.history}>
                                <defs>
                                  <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#627EEA" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#627EEA" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                <XAxis dataKey="timestamp" hide />
                                <YAxis hide domain={[0, 'dataMax + 20']} />
                                <Tooltip 
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      return (
                                        <div className="bg-slate-800 border border-white/10 p-2 rounded-lg shadow-xl text-[10px]">
                                          <p className="text-slate-400 font-medium">{new Date(payload[0].payload.timestamp).toLocaleTimeString()}</p>
                                          <p className="text-[#627EEA] font-bold">{payload[0].value}ms</p>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Area type="monotone" dataKey="latency" stroke="#627EEA" fillOpacity={1} fill="url(#colorLatency)" strokeWidth={2} />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>

                          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                            {[...selectedNode.history].reverse().map((event, idx) => (
                              <div key={idx} className="flex gap-3 relative">
                                {idx !== selectedNode.history.length - 1 && <div className="absolute left-1.5 top-4 bottom-0 w-[1px] bg-white/5" />}
                                <div className={`mt-1.5 w-3 h-3 rounded-full flex-shrink-0 z-10 ${event.status === 'active' ? 'bg-[#00FFA3]/20 border border-[#00FFA3]/50' : 'bg-slate-500/20 border border-slate-500/50'}`}><div className={`w-1 h-1 rounded-full m-auto mt-0.5 ${event.status === 'active' ? 'bg-[#00FFA3]' : 'bg-slate-400'}`} /></div>
                                <div className="flex-grow space-y-1 pb-3">
                                  <div className="flex justify-between items-center"><span className="text-[9px] font-bold text-white uppercase tracking-tight">STATUS: {event.status.toUpperCase()}</span><span className="text-[8px] font-mono text-slate-500">{new Date(event.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
                                  <div className="flex items-center gap-2"><Zap size={8} className="text-[#627EEA]" /><span className="text-[9px] font-mono text-slate-400">Latency: {event.latency}ms</span></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'network' && (
                      <motion.div 
                        key="network"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                      >
                        <div className="space-y-5 p-4 bg-white/5 rounded-xl border border-white/5">
                          <div>
                            <div className="text-[10px] uppercase tracking-widest text-[#627EEA] mb-3 font-bold flex items-center gap-2 px-1"><Cpu size={10} /> Runtime Environment</div>
                            <div className="grid grid-cols-2 gap-3 text-[10px]">
                              <div className="p-3 bg-black/20 rounded-lg border border-white/5"><div className="text-slate-500 mb-1">VERSION</div><div className="font-mono text-white font-bold">{selectedNode.version}</div></div>
                              <div className="p-3 bg-black/20 rounded-lg border border-white/5"><div className="text-slate-500 mb-1">OS</div><div className="text-white truncate font-bold" title={selectedNode.os}>{selectedNode.os}</div></div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-white/5">
                            <div className="text-[10px] uppercase tracking-widest text-[#627EEA] mb-3 font-bold flex items-center gap-2 px-1"><Network size={10} /> P2P Network Config</div>
                            <div className="space-y-3">
                              <div className="p-3 bg-black/20 rounded-lg border border-white/5 text-[10px]">
                                <div className="text-slate-500 mb-2 font-bold uppercase tracking-tighter">Core Peer Identity</div>
                                <div className="font-mono text-white break-all bg-white/5 p-2 rounded leading-relaxed border border-white/5 select-all">{selectedNode.peerId}</div>
                              </div>
                              
                              <div className="p-3 bg-black/20 rounded-lg border border-white/5 text-[10px]">
                                <div className="text-slate-500 mb-2 font-bold uppercase tracking-tighter">Multiaddress Listeners</div>
                                <div className="space-y-1.5 font-mono text-white/80">
                                  {selectedNode.listenAddrs.map((addr, i) => (
                                    <div key={i} className="text-[9px] bg-slate-800/50 p-1.5 rounded-md px-3 border border-white/5 truncate flex items-center gap-2">
                                      <div className="w-1 h-1 rounded-full bg-slate-500" />
                                      {addr}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                                  <div className="text-[8px] text-slate-500 uppercase mb-1 font-bold">DHT / Routing</div>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${selectedNode.dhtStatus === 'active' ? 'bg-[#00FFA3]' : 'bg-[#F59E0B]'}`} />
                                    <span className="text-[10px] font-bold text-white uppercase">{selectedNode.dhtStatus}</span>
                                  </div>
                                </div>
                                <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                                  <div className="text-[8px] text-slate-500 uppercase mb-1 font-bold">TCP Connections</div>
                                  <div className="text-[10px] font-mono text-white">{selectedNode.connections.inbound} IN / {selectedNode.connections.outbound} OUT</div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                                  <div className="text-[8px] text-slate-500 uppercase mb-1 font-bold">AutoNAT Status</div>
                                  <div className="text-[10px] font-bold text-[#00FFA3]">PUBLICLY REACHABLE</div>
                                </div>
                                <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                                  <div className="text-[8px] text-slate-500 uppercase mb-1 font-bold">Relay Service</div>
                                  <div className="text-[10px] font-bold text-white">HOP ENABLED</div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                                  <div className="text-[8px] text-slate-500 uppercase mb-1 font-bold">Encryption</div>
                                  <div className="text-[10px] font-bold text-white flex items-center gap-2">
                                    <Shield size={10} className="text-[#00FFA3]" /> TLS 1.3 / Noise
                                  </div>
                                </div>
                                <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                                  <div className="text-[8px] text-slate-500 uppercase mb-1 font-bold">Throttling</div>
                                  <div className="text-[10px] font-mono text-white">{selectedNode.bandwidth.up} UP / {selectedNode.bandwidth.down} DN</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {diagnosticResults.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-6 space-y-3"
                  >
                    <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center justify-between px-1 mb-2">
                      <span>Diagnostic Report</span>
                      <Activity size={10} className="text-[#627EEA]" />
                    </div>
                    <div className="space-y-2.5">
                      {diagnosticResults.map((res, i) => (
                        <motion.div 
                          key={i}
                          initial={{ x: -10, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: i * 0.1 }}
                          className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-start gap-3"
                        >
                          <div className={`mt-0.5 p-1 rounded-md ${res.status === 'success' ? 'bg-[#00FFA3]/10 text-[#00FFA3]' : 'bg-[#F59E0B]/10 text-[#F59E0B]'}`}>
                            {res.status === 'success' ? <Signal size={12} /> : <Activity size={12} />}
                          </div>
                          <div className="flex-grow">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[11px] font-bold text-white leading-none">{res.label}</span>
                              <span className={`text-[8px] font-bold uppercase tracking-tighter ${res.status === 'success' ? 'text-[#00FFA3]' : 'text-[#F59E0B]'}`}>
                                {res.status.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-[9px] text-slate-400 font-mono leading-relaxed">{res.detail}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                <button 
                  onClick={handleRunDiagnostic} 
                  disabled={isDiagnosing} 
                  className="w-full py-4 mt-4 bg-[#627EEA] hover:bg-[#5068D0] disabled:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-[#627EEA]/20 flex items-center justify-center gap-3 relative overflow-hidden"
                >
                  {isDiagnosing && (
                    <motion.div 
                      initial={{ left: '-100%' }}
                      animate={{ left: '100%' }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      className="absolute top-0 bottom-0 w-1/2 bg-white/20 skew-x-12"
                    />
                  )}
                  {isDiagnosing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span className="animate-pulse">
                        {diagnosticStep === 1 ? 'CHECKING STATE...' : diagnosticStep === 2 ? 'VERIFYING P2P...' : 'FINALIZING...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Terminal size={14} />
                      RUN FULL CORE DIAGNOSTIC
                    </>
                  )}
                </button>
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

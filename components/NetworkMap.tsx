'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, X, Globe, Users, Zap, Shield, Clock, Network, Activity } from 'lucide-react';

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
}

interface Link extends d3.SimulationLinkDatum<Node> {
  value: number;
}

const INITIAL_NODES: Node[] = [
  { 
    id: 'local-node', group: 1, label: 'Local Node', latency: 0, 
    location: 'San Francisco, US', ip: '192.168.1.42', status: 'active', 
    lastSeen: 'Now', uptime: '142d 18h' 
  },
  { 
    id: 'peer-1', group: 2, label: 'Peer 0x71...f2', latency: 45, 
    location: 'London, UK', ip: '82.14.22.103', status: 'active', 
    lastSeen: '2s ago', uptime: '12d 4h' 
  },
  { 
    id: 'peer-2', group: 2, label: 'Peer 0x3a...11', latency: 120, 
    location: 'Tokyo, JP', ip: '114.162.3.99', status: 'active', 
    lastSeen: '15s ago', uptime: '3d 2h' 
  },
  { 
    id: 'peer-3', group: 2, label: 'Peer 0xbc...44', latency: 15, 
    location: 'New York, US', ip: '104.28.18.22', status: 'active', 
    lastSeen: 'Now', uptime: '45d 11h' 
  },
  { 
    id: 'peer-4', group: 2, label: 'Peer 0x92...8e', latency: 85, 
    location: 'Berlin, DE', ip: '172.67.74.1', status: 'syncing', 
    lastSeen: 'Syncing', uptime: '0d 12h' 
  },
  { 
    id: 'peer-5', group: 2, label: 'Peer 0x11...cd', latency: 210, 
    location: 'Sydney, AU', ip: '1.1.1.1', status: 'idle', 
    lastSeen: '2m ago', uptime: '8d 14h' 
  },
  { 
    id: 'peer-6', group: 2, label: 'Peer 0xef...22', latency: 60, 
    location: 'Paris, FR', ip: '185.199.108.153', status: 'active', 
    lastSeen: '5s ago', uptime: '14d 6h' 
  },
  { 
    id: 'peer-7', group: 2, label: 'Peer 0x44...9a', latency: 30, 
    location: 'Toronto, CA', ip: '142.251.33.110', status: 'active', 
    lastSeen: '1s ago', uptime: '90d 1h' 
  },
];

const INITIAL_LINKS: Link[] = [
  { source: 'local-node', target: 'peer-1', value: 1 },
  { source: 'local-node', target: 'peer-2', value: 1 },
  { source: 'local-node', target: 'peer-3', value: 1 },
  { source: 'local-node', target: 'peer-4', value: 1 },
  { source: 'local-node', target: 'peer-5', value: 1 },
  { source: 'local-node', target: 'peer-6', value: 1 },
  { source: 'local-node', target: 'peer-7', value: 1 },
];

export default function NetworkMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [nodes] = useState<Node[]>(INITIAL_NODES);
  const [links] = useState<Link[]>(INITIAL_LINKS);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'syncing' | 'idle'>('all');

  const filteredNodes = nodes.filter(node => {
    const matchesSearch = 
      node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || node.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const filteredLinks = links.filter(link => {
    const sourceId = typeof link.source === 'string' ? link.source : (link.source as Node).id;
    const targetId = typeof link.target === 'string' ? link.target : (link.target as Node).id;
    return filteredNodes.find(n => n.id === sourceId) && filteredNodes.find(n => n.id === targetId);
  });

  useEffect(() => {
    if (!svgRef.current) return;

    const width = svgRef.current.clientWidth;
    const height = 400;

    const svg = d3.select(svgRef.current)
      .attr('viewBox', [0, 0, width, height]);

    svg.selectAll('*').remove();

    const simulation = d3.forceSimulation<Node>(filteredNodes)
      .force('link', d3.forceLink<Node, Link>(filteredLinks).id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = svg.append('g')
      .attr('stroke', '#ffffff20')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(filteredLinks)
      .join('line')
      .attr('stroke-width', d => Math.sqrt(d.value) * 1.5);

    const node = svg.append('g')
      .selectAll('g')
      .data(filteredNodes)
      .join('g')
      .attr('class', 'node-group cursor-pointer')
      .call(d3.drag<SVGGElement, Node>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any)
      .on('click', (event, d) => setSelectedNode(d))
      .on('mouseover', (event, d) => {
        setHoveredNode(d);
        setTooltipPos({ x: event.pageX, y: event.pageY });
      })
      .on('mousemove', (event) => {
        setTooltipPos({ x: event.pageX, y: event.pageY });
      })
      .on('mouseout', () => {
        setHoveredNode(null);
      });

    // Glow effect filter
    const defs = svg.append('defs');
    const filter = defs.append('filter')
      .attr('id', 'glow');
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Add ripple effect for active nodes
    node.append('circle')
      .attr('r', d => d.id === 'local-node' ? 14 : 9)
      .attr('class', d => d.status === 'active' || d.id === 'local-node' ? 'node-ripple' : d.status === 'syncing' ? 'node-sync' : '')
      .attr('fill', d => {
        if (d.id === 'local-node') return '#627EEA';
        if (d.status === 'active') return '#00FFA3';
        if (d.status === 'syncing') return '#F59E0B';
        return 'transparent';
      })
      .attr('opacity', d => d.status === 'idle' ? 0 : 0.4);

    node.append('circle')
      .attr('r', d => d.id === 'local-node' ? 14 : 9)
      .attr('fill', d => {
        if (d.id === 'local-node') return '#627EEA';
        if (d.status === 'active') return '#00FFA3';
        if (d.status === 'syncing') return '#F59E0B';
        return '#94A3B8';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('filter', d => d.status === 'active' || d.id === 'local-node' ? 'url(#glow)' : 'none');

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as Node).x!)
        .attr('y1', d => (d.source as Node).y!)
        .attr('x2', d => (d.target as Node).x!)
        .attr('y2', d => (d.target as Node).y!);

      node
        .attr('transform', d => `translate(${d.x},${d.y})`);
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
  }, [filteredNodes, filteredLinks]);

  return (
    <section className="mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Globe size={18} className="text-[#627EEA]" />
          <h2 className="text-lg font-light text-white">Network Topology</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group/search">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/search:text-[#627EEA] transition-colors" />
            <input 
              type="text" 
              placeholder="Search by IP, Location..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#627EEA]/50 focus:bg-white/10 transition-all w-[240px]"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="relative">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <Filter size={14} className="text-slate-500" />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent text-xs text-white focus:outline-none appearance-none pr-4 cursor-pointer"
              >
                <option value="all" className="bg-[#05070A]">All Nodes</option>
                <option value="active" className="bg-[#05070A]">Active</option>
                <option value="syncing" className="bg-[#05070A]">Syncing</option>
                <option value="idle" className="bg-[#05070A]">Idle</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 ml-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#627EEA]" />
              <span className="text-[10px] text-slate-400">Local</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00FFA3]" />
              <span className="text-[10px] text-slate-400">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />
              <span className="text-[10px] text-slate-400">Syncing</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass p-4 relative h-[420px] overflow-hidden">
          <svg 
            ref={svgRef} 
            className="w-full h-full cursor-grab active:cursor-grabbing"
          />
        </div>

        <div className="glass p-6 flex flex-col min-h-[420px]">
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-6 flex items-center gap-2 text-slate-400">
            <Users size={16} className="text-[#627EEA]" />
            Node Connection Inspector
          </h3>
          
          <AnimatePresence mode="wait">
            {selectedNode ? (
              <motion.div
                key={selectedNode.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 flex-grow"
              >
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#627EEA] mb-1 font-bold">Node Identifier</div>
                  <div className="text-lg font-mono text-white truncate">{selectedNode.label}</div>
                  <div className="text-xs text-slate-500 font-mono mt-1">{selectedNode.ip}</div>
                </div>

                <div className="grid grid-cols-2 gap-y-6 gap-x-4 pt-6 border-t border-white/5">
                  <InspectorItem 
                    icon={<Zap size={14} className={selectedNode.latency < 50 ? 'text-[#00FFA3]' : 'text-[#F59E0B]'} />}
                    label="Latency"
                    value={`${selectedNode.latency}ms`}
                  />
                  <InspectorItem 
                    icon={<Globe size={14} className="text-brand shadow-sm" />}
                    label="Region"
                    value={selectedNode.location}
                  />
                  <InspectorItem 
                    icon={<Activity size={14} className={selectedNode.status === 'active' ? 'text-[#00FFA3]' : 'text-[#F59E0B]'} />}
                    label="Status"
                    value={selectedNode.status.toUpperCase()}
                    valueClassName={selectedNode.status === 'active' ? 'text-[#00FFA3]' : 'text-[#F59E0B]'}
                  />
                  <InspectorItem 
                    icon={<Clock size={14} className="text-slate-400" />}
                    label="Last Seen"
                    value={selectedNode.lastSeen}
                  />
                  <InspectorItem 
                    icon={<Shield size={14} className="text-[#627EEA]" />}
                    label="Uptime"
                    value={selectedNode.uptime}
                  />
                  <InspectorItem 
                    icon={<Network size={14} className="text-slate-400" />}
                    label="P2P Protocol"
                    value="libp2p v1.2"
                  />
                </div>

                <div className="pt-6 mt-auto">
                  <button className="w-full py-3 bg-[#627EEA] hover:bg-[#5068D0] text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-[#627EEA]/20">
                    DIAGNOSE CONNECTION
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-center">
                <div className="p-6 rounded-full bg-white/5 mb-4 border border-white/5">
                  <Globe size={48} className="text-slate-600 animate-pulse" />
                </div>
                <p className="text-sm text-slate-500 max-w-[200px]">Select a node in the network topology to view detailed link state</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {hoveredNode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed z-[60] pointer-events-none"
            style={{ 
              left: tooltipPos.x + 15, 
              top: tooltipPos.y + 15 
            }}
          >
            <div className="bg-[#0A0D12]/90 backdrop-blur-md border border-white/10 rounded-lg p-3 shadow-2xl min-w-[180px]">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  hoveredNode.status === 'active' ? 'bg-[#00FFA3]' : 
                  hoveredNode.status === 'syncing' ? 'bg-[#F59E0B]' : 'bg-slate-400'
                }`} />
                <span className="text-xs font-bold text-white truncate">{hoveredNode.label}</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center gap-4">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500">IP Address</span>
                  <span className="text-[10px] font-mono text-slate-300">{hoveredNode.ip}</span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500">Location</span>
                  <span className="text-[10px] text-slate-300">{hoveredNode.location}</span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500">Status</span>
                  <span className={`text-[9px] font-bold uppercase tracking-tight ${
                    hoveredNode.status === 'active' ? 'text-[#00FFA3]' : 
                    hoveredNode.status === 'syncing' ? 'text-[#F59E0B]' : 'text-slate-400'
                  }`}>
                    {hoveredNode.status}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function InspectorItem({ icon, label, value, valueClassName = "text-white" }: { 
  icon: React.ReactNode, 
  label: string, 
  value: string,
  valueClassName?: string 
}) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className="flex items-center gap-2">
        {icon}
        <span className={`text-sm font-medium ${valueClassName}`}>{value}</span>
      </div>
    </div>
  );
}

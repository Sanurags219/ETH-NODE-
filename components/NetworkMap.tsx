'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'motion/react';
import { Globe, Users, Zap } from 'lucide-react';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  group: number;
  label: string;
  latency: number;
  location: string;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  value: number;
}

const INITIAL_NODES: Node[] = [
  { id: 'local-node', group: 1, label: 'Local Node', latency: 0, location: 'San Francisco, US' },
  { id: 'peer-1', group: 2, label: 'Peer 0x71...f2', latency: 45, location: 'London, UK' },
  { id: 'peer-2', group: 2, label: 'Peer 0x3a...11', latency: 120, location: 'Tokyo, JP' },
  { id: 'peer-3', group: 2, label: 'Peer 0xbc...44', latency: 15, location: 'New York, US' },
  { id: 'peer-4', group: 2, label: 'Peer 0x92...8e', latency: 85, location: 'Berlin, DE' },
  { id: 'peer-5', group: 2, label: 'Peer 0x11...cd', latency: 210, location: 'Sydney, AU' },
  { id: 'peer-6', group: 2, label: 'Peer 0xef...22', latency: 60, location: 'Paris, FR' },
  { id: 'peer-7', group: 2, label: 'Peer 0x44...9a', latency: 30, location: 'Toronto, CA' },
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
  const [nodes] = useState<Node[]>(INITIAL_NODES);
  const [links] = useState<Link[]>(INITIAL_LINKS);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = svgRef.current.clientWidth;
    const height = 400;

    const svg = d3.select(svgRef.current)
      .attr('viewBox', [0, 0, width, height]);

    svg.selectAll('*').remove();

    const simulation = d3.forceSimulation<Node>(nodes)
      .force('link', d3.forceLink<Node, Link>(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = svg.append('g')
      .attr('stroke', '#ffffff20')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', d => Math.sqrt(d.value));

    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag<SVGGElement, Node>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any)
      .on('click', (event, d) => setSelectedNode(d));

    node.append('circle')
      .attr('r', d => d.id === 'local-node' ? 12 : 8)
      .attr('fill', d => d.id === 'local-node' ? '#627EEA' : '#00FFA3')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .style('filter', d => d.id === 'local-node' ? 'drop-shadow(0 0 8px rgba(98, 126, 234, 0.6))' : 'none');

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
  }, [nodes, links]);

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Globe size={18} className="text-brand" />
        <h2 className="text-lg font-light text-white">Network Topology</h2>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass p-4 relative h-[400px]">
          <svg 
            ref={svgRef} 
            className="w-full h-full cursor-grab active:cursor-grabbing"
          />
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
              <div className="w-2 h-2 rounded-full bg-[#627EEA] shadow-[0_0_8px_#627EEA]" />
              <span className="text-[10px] text-white uppercase tracking-wider">Local Instance</span>
            </div>
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
              <div className="w-2 h-2 rounded-full bg-[#00FFA3] shadow-[0_0_8px_#00FFA3]" />
              <span className="text-[10px] text-white uppercase tracking-wider">Active Peer</span>
            </div>
          </div>
        </div>

        <div className="glass p-6">
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-6 flex items-center gap-2">
            <Users size={16} className="text-brand" />
            Peer Details
          </h3>
          
          <AnimatePresence mode="wait">
            {selectedNode ? (
              <motion.div
                key={selectedNode.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Identity</div>
                  <div className="text-lg font-mono text-white truncate">{selectedNode.label}</div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Latency</div>
                    <div className="flex items-center gap-2 text-white">
                      <Zap size={14} className={selectedNode.latency < 50 ? 'text-success' : 'text-warning'} />
                      <span className="font-mono text-sm">{selectedNode.latency}ms</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Location</div>
                    <div className="text-white text-sm truncate">{selectedNode.location}</div>
                  </div>
                </div>

                <div className="pt-4 mt-2">
                  <button className="w-full py-2 bg-brand/10 hover:bg-brand/20 border border-brand/30 text-brand text-xs font-bold rounded-lg transition-all">
                    INSPECT HANDSHAKE
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                <Globe size={48} className="mb-4 text-slate-600" />
                <p className="text-sm">Select a node on the map to visualize its connection state</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

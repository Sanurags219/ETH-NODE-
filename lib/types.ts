import * as d3 from 'd3';

export interface NodeHistory {
  timestamp: string;
  status: 'active' | 'syncing' | 'idle';
  latency: number;
}

export interface Node extends d3.SimulationNodeDatum {
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
  dhtStatus: 'active' | 'client' | 'refreshing';
  connections: { inbound: number, outbound: number };
  bandwidth: { up: string, down: string };
}

export interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  value: number;
}

export const generateMockHistory = (baseLatency: number): NodeHistory[] => {
  const history: NodeHistory[] = [];
  const now = new Date();
  for (let i = 0; i < 20; i++) {
    const time = new Date(now.getTime() - (19 - i) * 1800000);
    history.push({
      timestamp: time.toISOString(),
      status: Math.random() > 0.1 ? 'active' : 'idle',
      latency: Math.max(5, baseLatency + Math.floor(Math.random() * 20) - 10)
    });
  }
  return history;
};

export const INITIAL_NODES: Node[] = [
  { 
    id: 'local-node', group: 1, label: 'Local Node', latency: 0, 
    location: 'San Francisco, US', ip: '192.168.1.42', status: 'active', 
    lastSeen: 'Now', uptime: '142d 18h', cpuLimit: 90, memoryLimit: 85,
    version: 'v2.4.1-alpha', os: 'Alpine Linux 3.18',
    history: generateMockHistory(5),
    peerId: '12D3KooW...sf9w',
    listenAddrs: ['/ip4/127.0.0.1/tcp/4001', '/ip4/192.168.1.42/tcp/4001'],
    dhtStatus: 'active',
    connections: { inbound: 42, outbound: 15 },
    bandwidth: { up: '1.2 Mbps', down: '4.5 Mbps' }
  },
  { 
    id: 'peer-1', group: 2, label: 'Peer 0x71...f2', latency: 45, 
    location: 'London, UK', ip: '85.12.33.210', status: 'active', 
    lastSeen: '2s ago', uptime: '12d 4h', cpuLimit: 80, memoryLimit: 75,
    version: 'v2.3.9-stable', os: 'Ubuntu 22.04 LTS',
    history: generateMockHistory(45),
    peerId: '12D3KooL...P9x7',
    listenAddrs: ['/ip4/85.12.33.210/tcp/4001'],
    dhtStatus: 'active',
    connections: { inbound: 12, outbound: 8 },
    bandwidth: { up: '450 Kbps', down: '1.1 Mbps' }
  },
  { 
    id: 'peer-2', group: 2, label: 'Peer 0x3a...11', latency: 120, 
    location: 'Tokyo, JP', ip: '103.4.112.5', status: 'idle', 
    lastSeen: '15s ago', uptime: '3d 2h', cpuLimit: 70, memoryLimit: 60,
    version: 'v2.3.8-stable', os: 'Debian 12',
    history: generateMockHistory(120),
    peerId: '12D3KooK...Lm22',
    listenAddrs: ['/ip4/103.4.112.5/tcp/4001'],
    dhtStatus: 'refreshing',
    connections: { inbound: 2, outbound: 3 },
    bandwidth: { up: '12 Kbps', down: '45 Kbps' }
  },
  { 
    id: 'peer-3', group: 2, label: 'Peer 0xbc...44', latency: 15, 
    location: 'New York, US', ip: '162.243.12.8', status: 'active', 
    lastSeen: 'Now', uptime: '45d 11h', cpuLimit: 95, memoryLimit: 90,
    version: 'v2.4.0-rc1', os: 'Alpine Linux 3.19',
    history: generateMockHistory(15),
    peerId: '12D3KooJ...Qq55',
    listenAddrs: ['/ip4/162.243.12.8/tcp/4001'],
    dhtStatus: 'active',
    connections: { inbound: 28, outbound: 12 },
    bandwidth: { up: '890 Kbps', down: '2.4 Mbps' }
  },
  { 
    id: 'peer-4', group: 2, label: 'Peer 0x92...8e', latency: 85, 
    location: 'Berlin, DE', ip: '94.23.4.156', status: 'syncing', 
    lastSeen: 'Syncing', uptime: '0d 12h', cpuLimit: 75, memoryLimit: 70,
    version: 'v2.3.9-stable', os: 'Ubuntu 20.04 LTS',
    history: generateMockHistory(85),
    peerId: '12D3KooH...As11',
    listenAddrs: ['/ip4/94.23.4.156/tcp/4001'],
    dhtStatus: 'client',
    connections: { inbound: 5, outbound: 15 },
    bandwidth: { up: '2.1 Mbps', down: '8.2 Mbps' }
  }
];

export const INITIAL_LINKS: Link[] = [
  { source: 'local-node', target: 'peer-1', value: 1 },
  { source: 'local-node', target: 'peer-2', value: 1 },
  { source: 'local-node', target: 'peer-3', value: 1 },
  { source: 'local-node', target: 'peer-4', value: 1 },
];

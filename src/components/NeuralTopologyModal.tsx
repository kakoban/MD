import React, { useEffect, useRef, useState, useMemo } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Share2, Search, Filter, Compass } from 'lucide-react';
import { MarkdownDoc } from '../types';
import { getEffectiveFolderPath, getFolderTheme } from '../utils/docTree';

interface GraphNode {
  id: string;
  title: string;
  folder: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  connectionsCount: number;
}

interface GraphLink {
  source: string;
  target: string;
}

interface NeuralTopologyModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: MarkdownDoc[];
  activeDocId?: string;
  onSelectDoc: (id: string) => void;
}

export const NeuralTopologyModal: React.FC<NeuralTopologyModalProps> = ({
  isOpen,
  onClose,
  documents,
  activeDocId,
  onSelectDoc,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFolder, setFilterFolder] = useState<string>('all');
  const [onlyNeighbors, setOnlyNeighbors] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // Transform graph data
  const { initialNodes, links, titleToIdMap } = useMemo(() => {
    const titleMap = new Map<string, string>();
    documents.forEach((d) => {
      titleMap.set(d.title.trim().toLowerCase(), d.id);
    });

    const linkList: GraphLink[] = [];
    const connectionCounts: Record<string, number> = {};

    documents.forEach((doc) => {
      const matches = [...doc.content.matchAll(/(?:!\[\[|\[\[)([^\]\n|#]+)/g)];
      matches.forEach((m) => {
        const targetTitle = m[1].trim().toLowerCase();
        const targetId = titleMap.get(targetTitle);
        if (targetId && targetId !== doc.id) {
          linkList.push({ source: doc.id, target: targetId });
          connectionCounts[doc.id] = (connectionCounts[doc.id] || 0) + 1;
          connectionCounts[targetId] = (connectionCounts[targetId] || 0) + 1;
        }
      });
    });

    const nodesList: GraphNode[] = documents.map((doc, idx) => {
      const connections = connectionCounts[doc.id] || 0;
      const angle = (idx / documents.length) * 2 * Math.PI;
      const dist = 100 + Math.random() * 150;
      return {
        id: doc.id,
        title: doc.title || 'سند',
        folder: getEffectiveFolderPath(doc.folderPath),
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        radius: Math.max(6, Math.min(18, 7 + connections * 2)),
        connectionsCount: connections,
      };
    });

    return { initialNodes: nodesList, links: linkList, titleToIdMap: titleMap };
  }, [documents]);

  const availableFolders = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((d) => set.add(getEffectiveFolderPath(d.folderPath)));
    return Array.from(set);
  }, [documents]);

  // Canvas simulation state refs
  const simNodesRef = useRef<GraphNode[]>([]);
  const simTransformRef = useRef({ x: 0, y: 0, scale: 1 });
  const isDraggingCanvasRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const draggedNodeRef = useRef<GraphNode | null>(null);

  // Initialize node positions
  useEffect(() => {
    if (isOpen) {
      simNodesRef.current = initialNodes.map((n) => ({ ...n }));
      simTransformRef.current = { x: 0, y: 0, scale: 1 };
    }
  }, [isOpen, initialNodes]);

  // Main Canvas Render & Physics Loop
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
    };
    resize();
    window.addEventListener('resize', resize);

    const step = () => {
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;
      const nodes = simNodesRef.current;
      const transform = simTransformRef.current;

      // 1. Force simulation (Repulsion)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const distSq = dx * dx + dy * dy + 1;
          const dist = Math.sqrt(distSq);
          if (dist < 300) {
            const force = 800 / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            nodes[i].vx -= fx;
            nodes[i].vy -= fy;
            nodes[j].vx += fx;
            nodes[j].vy += fy;
          }
        }
      }

      // 2. Spring force along links
      links.forEach((link) => {
        const source = nodes.find((n) => n.id === link.source);
        const target = nodes.find((n) => n.id === link.target);
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetDist = 90;
          const force = (dist - targetDist) * 0.035;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          source.vx += fx;
          source.vy += fy;
          target.vx -= fx;
          target.vy -= fy;
        }
      });

      // 3. Center pull & damping
      nodes.forEach((n) => {
        if (n === draggedNodeRef.current) return;
        n.vx -= n.x * 0.012;
        n.vy -= n.y * 0.012;
        n.vx *= 0.82;
        n.vy *= 0.82;
        n.x += n.vx;
        n.y += n.vy;
      });

      // 4. Render
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      // Apply pan/zoom
      ctx.translate(width / 2 + transform.x, height / 2 + transform.y);
      ctx.scale(transform.scale, transform.scale);

      // Draw Links
      ctx.lineWidth = 1.2;
      links.forEach((link) => {
        const source = nodes.find((n) => n.id === link.source);
        const target = nodes.find((n) => n.id === link.target);
        if (source && target) {
          const isRelatedToActive = source.id === activeDocId || target.id === activeDocId;
          ctx.strokeStyle = isRelatedToActive ? 'rgba(0, 97, 255, 0.65)' : 'rgba(255, 255, 255, 0.12)';
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
        }
      });

      // Draw Nodes
      nodes.forEach((n) => {
        const isActive = n.id === activeDocId;
        const isHovered = hoveredNode?.id === n.id;
        const matchesSearch = searchQuery && n.title.toLowerCase().includes(searchQuery.toLowerCase());

        // Node Glow for active/hovered
        if (isActive || isHovered || matchesSearch) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 6, 0, 2 * Math.PI);
          ctx.fillStyle = isActive ? 'rgba(0, 97, 255, 0.35)' : 'rgba(245, 158, 11, 0.35)';
          ctx.fill();
        }

        // Node Circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, 2 * Math.PI);
        if (isActive) {
          ctx.fillStyle = '#0061FF';
        } else if (n.folder === 'عمومی') {
          ctx.fillStyle = '#94a3b8';
        } else {
          ctx.fillStyle = '#38bdf8';
        }
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.font = '11px Vazirmatn, sans-serif';
        ctx.fillStyle = isActive ? '#60a5fa' : isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.75)';
        ctx.textAlign = 'center';
        ctx.fillText(n.title.slice(0, 20), n.x, n.y + n.radius + 14);
      });

      ctx.restore();

      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [isOpen, links, activeDocId, hoveredNode, searchQuery]);

  // Mouse interaction helpers
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const width = rect.width;
    const height = rect.height;
    const transform = simTransformRef.current;

    const x = (mouseX - width / 2 - transform.x) / transform.scale;
    const y = (mouseY - height / 2 - transform.y) / transform.scale;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    const clickedNode = simNodesRef.current.find((n) => {
      const dx = n.x - coords.x;
      const dy = n.y - coords.y;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 4;
    });

    if (clickedNode) {
      draggedNodeRef.current = clickedNode;
    } else {
      isDraggingCanvasRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);

    if (draggedNodeRef.current) {
      draggedNodeRef.current.x = coords.x;
      draggedNodeRef.current.y = coords.y;
      draggedNodeRef.current.vx = 0;
      draggedNodeRef.current.vy = 0;
      return;
    }

    if (isDraggingCanvasRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      simTransformRef.current.x += dx;
      simTransformRef.current.y += dy;
      return;
    }

    const hovered = simNodesRef.current.find((n) => {
      const dx = n.x - coords.x;
      const dy = n.y - coords.y;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 4;
    });
    setHoveredNode(hovered || null);
  };

  const handleMouseUp = () => {
    draggedNodeRef.current = null;
    isDraggingCanvasRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.88;
    const newScale = Math.min(3, Math.max(0.3, simTransformRef.current.scale * factor));
    simTransformRef.current.scale = newScale;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    const clicked = simNodesRef.current.find((n) => {
      const dx = n.x - coords.x;
      const dy = n.y - coords.y;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 4;
    });

    if (clicked) {
      onSelectDoc(clicked.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl h-[85vh] rounded-3xl bg-[#0b0f17] border border-neutral-800 shadow-2xl flex flex-col overflow-hidden text-white relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/80 bg-neutral-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#0061FF]/15 text-[#0061FF] border border-[#0061FF]/30 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">گراف عصبی اسناد (Neural Topology)</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono font-bold">
                  {documents.length} گره · {links.length} اتصال
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">نمایش تعاملی پیوندهای دوطرفه و ساختار سرفصل‌ها</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Filter */}
            <div className="relative hidden sm:block">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute start-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در گره‌ها..."
                className="ps-8 pe-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#0061FF] w-48"
              />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative overflow-hidden bg-[#070a0f] cursor-grab active:cursor-grabbing">
          <canvas
            ref={canvasRef}
            className="w-full h-full block"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            onClick={handleCanvasClick}
          />

          {/* Floating Zoom & Reset Toolbar */}
          <div className="absolute bottom-5 end-5 flex items-center gap-1.5 p-1 rounded-xl bg-neutral-900/90 border border-neutral-800 shadow-xl backdrop-blur-md">
            <button
              type="button"
              onClick={() => {
                simTransformRef.current.scale = Math.min(3, simTransformRef.current.scale * 1.2);
              }}
              className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
              title="بزرگ‌نمایی"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                simTransformRef.current.scale = Math.max(0.3, simTransformRef.current.scale * 0.8);
              }}
              className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
              title="کوچک‌نمایی"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                simTransformRef.current = { x: 0, y: 0, scale: 1 };
              }}
              className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-300 hover:text-[#0061FF] transition-colors"
              title="مرکز کردن گراف"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Hover Tooltip Card */}
          {hoveredNode && (
            <div className="absolute top-5 start-5 p-3 rounded-2xl bg-neutral-900/95 border border-neutral-700 shadow-2xl pointer-events-none text-xs max-w-xs animate-in fade-in duration-100 backdrop-blur-md">
              <div className="font-bold text-white mb-1 truncate">{hoveredNode.title}</div>
              <div className="text-[11px] text-neutral-400 space-y-1">
                <div>پوشه: <span className="text-amber-400 font-semibold">{hoveredNode.folder}</span></div>
                <div>تعداد اتصالات: <span className="text-emerald-400 font-mono font-bold">{hoveredNode.connectionsCount}</span></div>
                <div className="text-[10px] text-sky-400 pt-1">برای گشودن سند کلیک کنید</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

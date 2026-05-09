import React, { useState, useEffect, useMemo } from 'react';
import { Search, Info, CheckCircle, XCircle, BookOpen, Users, Mail, Link as LinkIcon, Map, LayoutGrid } from 'lucide-react';
import Papa from 'papaparse';

// --- CONFIGURACIÓN DE GOOGLE SHEETS ---
// Reemplaza esto con tu URL de "Publicar en la web" (formato CSV)
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSyRGxkESfDbdjENmccJDgqS8XhAkCpKw3Sc6pP79wQazOzGT9i1tycFTbMr0WolKx9YqaioomE2S-R/pub?gid=1739515987&single=true&output=csv"; 

const COLORS = {
  'Semillero': '#10b981', // Emerald 500
  'Colectiva': '#8b5cf6', // Violet 500
  'Grupo de Estudio': '#f59e0b', // Amber 500
  'Mesa de Trabajo': '#ef4444', // Red 500
  'Otro': '#64748b'
};

export default function App() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('map'); // 'map' o 'directory'
  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => {
    Papa.parse(SHEET_URL, {
      download: true,
      header: true,
      complete: (results) => {
        const formattedData = results.data
          .filter(row => row.Nombre) // Filtra filas vacías
          .map(row => ({
            id: row.ID ? row.ID.trim() : Math.random().toString(),
            name: row.Nombre,
            type: row.Tipo || 'Otro',
            area: row.Area || 'General',
            description: row.Descripcion || 'Sin descripción.',
            requirements: row.Requisitos || 'Consultar con el grupo.',
            contact: row.Contacto || 'No especificado',
            accepting: (row.AceptaIntegrantes || '').toUpperCase().includes('SÍ'),
            connections: row.Conexiones ? row.Conexiones.split(',').map(s => s.trim()) : []
          }));
        setGroups(formattedData);
        setLoading(false);
      },
      error: (error) => {
        console.error("Error cargando el Excel:", error);
        setLoading(false);
      }
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
        <p className="text-slate-600 font-medium">Cargando Mapeo de Psicología...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* HEADER */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md">Ψ</div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">Vocerías Psicología</h1>
              <p className="text-sm text-slate-500">Mapeo de Colectivas y Semilleros UNAL</p>
            </div>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button onClick={() => setActiveTab('map')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'map' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-600 hover:text-slate-900'}`}>
              <Map size={16} /> Red Interactiva
            </button>
            <button onClick={() => setActiveTab('directory')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'directory' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-600 hover:text-slate-900'}`}>
              <LayoutGrid size={16} /> Directorio
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {activeTab === 'map' ? (
          <NetworkMap data={groups} onSelectNode={setSelectedGroup} />
        ) : (
          <Directory data={groups} onSelectCard={setSelectedGroup} />
        )}
      </main>

      {/* MODAL DETALLES */}
      {selectedGroup && (
        <GroupModal group={selectedGroup} allGroups={groups} onClose={() => setSelectedGroup(null)} />
      )}
    </div>
  );
}

// --- VISTA 1: RED INTERACTIVA ---
function NetworkMap({ data, onSelectNode }) {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  useEffect(() => {
    const handleResize = () => {
      const container = document.getElementById('map-container');
      if (container) setDimensions({ width: container.clientWidth, height: Math.max(600, window.innerHeight - 200) });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const nodes = useMemo(() => {
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;
    const grouped = data.reduce((acc, group) => {
      if (!acc[group.type]) acc[group.type] = [];
      acc[group.type].push(group);
      return acc;
    }, {});

    const placedNodes = [{ id: 'center', name: 'Psicología UNAL', type: 'Centro', x: cx, y: cy, radius: 40, color: '#0f172a' }];
    
    Object.keys(grouped).forEach((type, tIdx) => {
      const items = grouped[type];
      const orbitRadius = 130 + (tIdx * 90); 
      items.forEach((item, i) => {
        const angle = (i / items.length) * 2 * Math.PI - Math.PI / 2 + (tIdx * 0.5);
        placedNodes.push({
          ...item,
          x: cx + orbitRadius * Math.cos(angle),
          y: cy + orbitRadius * Math.sin(angle),
          radius: 25,
          color: COLORS[type] || COLORS['Otro']
        });
      });
    });
    return placedNodes;
  }, [data, dimensions]);

  const links = useMemo(() => {
    const linkArray = [];
    nodes.forEach(node => {
      if (node.id !== 'center') linkArray.push({ source: 'center', target: node.id, isCenterLink: true });
      if (node.connections) {
        node.connections.forEach(targetId => {
          if (!linkArray.find(l => (l.source === targetId && l.target === node.id))) {
             linkArray.push({ source: node.id, target: targetId, isCenterLink: false });
          }
        });
      }
    });
    return linkArray;
  }, [nodes]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col h-full">
      <div className="mb-4 flex flex-wrap gap-4 justify-center text-sm">
        {Object.entries(COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
            <span className="text-slate-600">{type}</span>
          </div>
        ))}
      </div>
      
      <div id="map-container" className="relative w-full flex-grow overflow-hidden bg-slate-50 rounded-xl border border-slate-100" style={{ minHeight: '600px' }}>
        <svg width={dimensions.width} height={dimensions.height} className="absolute inset-0">
          {links.map((link, idx) => {
            const sNode = nodes.find(n => n.id === link.source);
            const tNode = nodes.find(n => n.id === link.target);
            if (!sNode || !tNode) return null;
            const isHovered = hoveredNode === sNode.id || hoveredNode === tNode.id;
            const isFaded = hoveredNode && !isHovered && !link.isCenterLink;

            return (
              <line key={`link-${idx}`} x1={sNode.x} y1={sNode.y} x2={tNode.x} y2={tNode.y}
                stroke={link.isCenterLink ? '#e2e8f0' : (isHovered ? '#64748b' : '#cbd5e1')}
                strokeWidth={link.isCenterLink ? 1 : (isHovered ? 3 : 2)}
                strokeDasharray={link.isCenterLink ? "4 4" : "none"}
                className={`transition-all duration-300 ${isFaded ? 'opacity-20' : 'opacity-100'}`}
              />
            );
          })}

          {nodes.map(node => {
            const isCenter = node.id === 'center';
            const isHovered = hoveredNode === node.id;
            const isConn = hoveredNode && nodes.find(n => n.id === hoveredNode)?.connections?.includes(node.id) || (node.connections?.includes(hoveredNode));
            const isFaded = hoveredNode && !isHovered && !isConn && !isCenter;

            return (
              <g key={node.id} transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => setHoveredNode(node.id)} onMouseLeave={() => setHoveredNode(null)}
                onClick={() => !isCenter && onSelectNode(node)}
                className={`transition-all duration-300 ${!isCenter ? 'cursor-pointer' : ''} ${isFaded ? 'opacity-30' : 'opacity-100'}`}
              >
                <circle r={isHovered && !isCenter ? node.radius + 5 : node.radius} fill={node.color} stroke={isCenter ? 'none' : '#fff'} strokeWidth="3" className="shadow-lg transition-all duration-300" />
                {isCenter && <text textAnchor="middle" dy=".3em" fill="white" className="font-bold text-xl">Ψ</text>}
                <text textAnchor="middle" dy={node.radius + 20} fill={isCenter ? '#0f172a' : '#334155'} className={`text-xs md:text-sm font-semibold transition-opacity duration-300 ${isCenter ? 'opacity-100' : 'opacity-80'}`} style={{ pointerEvents: 'none' }}>
                  {isCenter ? node.name : (node.name.length > 20 ? node.name.substring(0,20)+'...' : node.name)}
                </text>
                {!isCenter && node.accepting && <circle cx={15} cy={-15} r={6} fill="#22c55e" stroke="#fff" strokeWidth="2" />}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// --- VISTA 2: DIRECTORIO ---
function Directory({ data, onSelectCard }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('Todos');
  const [filterAccepting, setFilterAccepting] = useState(false);

  const types = ['Todos', ...new Set(data.map(g => g.type))];

  const filteredData = data.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) || group.area.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'Todos' || group.type === filterType;
    const matchesAccepting = !filterAccepting || group.accepting;
    return matchesSearch && matchesType && matchesAccepting;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="Buscar por nombre o área..." className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-4 flex-wrap">
          <select className="border border-slate-300 rounded-lg px-4 py-2 bg-white text-slate-700 outline-none" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-100">
            <input type="checkbox" className="rounded text-emerald-600 w-4 h-4" checked={filterAccepting} onChange={(e) => setFilterAccepting(e.target.checked)} />
            <span className="text-sm font-medium">Convocatoria Abierta</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredData.map(group => (
          <div key={group.id} onClick={() => onSelectCard(group)} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all cursor-pointer flex flex-col group">
            <div className="h-2 w-full" style={{ backgroundColor: COLORS[group.type] || COLORS['Otro'] }}></div>
            <div className="p-6 flex flex-col flex-grow">
              <div className="flex justify-between items-start mb-3">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{group.type}</span>
                {group.accepting ? (
                   <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md"><CheckCircle size={12} /> Abierto</span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md"><XCircle size={12} /> Cerrado</span>
                )}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-emerald-700">{group.name}</h3>
              <p className="text-sm text-emerald-600 font-medium mb-4 flex items-center gap-1"><BookOpen size={14} /> {group.area}</p>
              <p className="text-slate-600 text-sm line-clamp-3 mb-6 flex-grow">{group.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- MODAL DE DETALLES ---
function GroupModal({ group, allGroups, onClose }) {
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => document.body.style.overflow = 'unset'; }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="h-3 w-full sticky top-0" style={{ backgroundColor: COLORS[group.type] || COLORS['Otro'] }}></div>
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full p-2 z-10"><XCircle size={24} /></button>

        <div className="p-6 sm:p-8">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 mb-4">{group.type}</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">{group.name}</h2>
          
          <div className="space-y-6">
            <section>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2"><Info size={20} className="text-emerald-600"/> Descripción</h3>
              <p className="text-slate-700 bg-slate-50 p-4 rounded-xl border">{group.description}</p>
            </section>
            
            <section>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2"><Users size={20} className="text-emerald-600"/> Requisitos</h3>
              <p className="text-slate-700 bg-slate-50 p-4 rounded-xl border">{group.requirements}</p>
            </section>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <section>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2"><Mail size={20} className="text-emerald-600"/> Contacto</h3>
                <a href={`mailto:${group.contact}`} className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 font-medium">{group.contact}</a>
              </section>

              {group.connections && group.connections.length > 0 && (
                <section>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2"><LinkIcon size={20} className="text-emerald-600"/> Conexiones</h3>
                  <div className="flex flex-wrap gap-2">
                    {group.connections.map(id => {
                      const tg = allGroups.find(g => g.id === id);
                      if(!tg) return null;
                      return <span key={id} className="px-3 py-1 bg-slate-100 border rounded-lg text-sm">{tg.name}</span>
                    })}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
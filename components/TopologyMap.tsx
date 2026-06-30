'use client';

import { Device } from '@/types';
import {
    Router, Laptop, Smartphone, Server, Printer, HelpCircle,
    ZoomIn, ZoomOut, Move, Info, X, Activity,
    Wifi, HardDrive, Camera, SunMedium, Zap, Tv, Box
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import DeviceDetailModal from '@/components/DeviceDetailModal';

// Tipi per la gestione della mappa
interface Point { x: number; y: number }

export default function TopologyMap({ devices, className }: { devices: Device[]; className?: string }) {
    // Stati per la gestione interfaccia
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
    const [detailDevice, setDetailDevice] = useState<Device | null>(null);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
    const [nodePositions, setNodePositions] = useState<Record<string, Point>>({});

    // Stati per il drag & drop
    const [isDraggingMap, setIsDraggingMap] = useState(false);
    const [draggingNode, setDraggingNode] = useState<string | null>(null);
    const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });

    // ...
    // Note: I will only replace the top part here.


    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Layout Gerarchico: Router -> Dispositivi
    useEffect(() => {
        if (!devices.length) return;

        const newPositions: Record<string, Point> = {};
        const centerX = 400;
        const centerY = 300;

        // 1. Identifica il Gateway / Router
        const gateway = devices.find(d =>
            d.device_type === 'gateway' ||
            d.device_type === 'router' ||
            d.ip_address.endsWith('.1') ||
            d.ip_address.endsWith('.254')
        );

        // Se non trovi un gateway esplicito, prendi il primo o un finto nodo "Internet"
        const rootId = gateway ? gateway.ip_address : 'internet';

        // Posiziona Root
        newPositions[rootId] = { x: centerX, y: centerY };

        // 2. Posiziona gli altri dispositivi in orbita
        const others = devices.filter(d => d.ip_address !== rootId);
        const radius = 250;

        others.forEach((device, index) => {
            if (!newPositions[device.ip_address]) {
                const angle = (index / Math.max(others.length, 1)) * 2 * Math.PI;
                // Variazione raggio per evitare sovrapposizioni perfette
                const r = radius + (index % 2 === 0 ? 30 : -30);
                newPositions[device.ip_address] = {
                    x: centerX + Math.cos(angle) * r,
                    y: centerY + Math.sin(angle) * r
                };
            }
        });

        // Mantieni posizioni manuali se esistono (per drag).
        // setState in effect è voluto: il layout va ricalcolato quando cambia la lista device.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setNodePositions(prev => ({ ...newPositions, ...prev }));
    }, [devices]);

    const handleMouseDown = (e: React.MouseEvent, nodeId?: string) => {
        if (nodeId) {
            e.stopPropagation();
            setDraggingNode(nodeId);
            const dev = devices.find(d => d.ip_address === nodeId);
            if (dev) setSelectedDevice(dev);
        } else {
            setIsDraggingMap(true);
        }
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (draggingNode) {
            const dx = (e.clientX - dragStart.x) / scale;
            const dy = (e.clientY - dragStart.y) / scale;
            setNodePositions(prev => ({
                ...prev,
                [draggingNode]: {
                    x: prev[draggingNode].x + dx,
                    y: prev[draggingNode].y + dy
                }
            }));
            setDragStart({ x: e.clientX, y: e.clientY });
        } else if (isDraggingMap) {
            setOffset(prev => ({
                x: prev.x + (e.clientX - dragStart.x),
                y: prev.y + (e.clientY - dragStart.y)
            }));
            setDragStart({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseUp = () => {
        setDraggingNode(null);
        setIsDraggingMap(false);
    };

    // Gestione Zoom con rotella (Passive: false per evitare errori React)
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setScale(s => Math.min(Math.max(s * delta, 0.5), 3));
        };

        container.addEventListener('wheel', onWheel, { passive: false });
        return () => container.removeEventListener('wheel', onWheel);
    }, []);

    const getDeviceIcon = (device?: Device) => {
        if (!device) return HelpCircle;
        switch (device.device_type) {
            case 'router':
            case 'gateway': return Router;
            case 'access_point': return Wifi;
            case 'server':
            case 'database_server':
            case 'vm': return Server;
            case 'nas': return HardDrive;
            case 'mobile':
            case 'tablet': return Smartphone;
            case 'printer': return Printer;
            case 'camera': return Camera;
            case 'inverter': return SunMedium;
            case 'ev_charger': return Zap;
            case 'media':
            case 'tv': return Tv;
            case 'container': return Box;
            case 'iot_device': return Activity;
            default: return Laptop;
        }
    };

    // Helper per trovare il nodo "Router" per le linee
    const getRootPos = () => {
        const gateway = devices.find(d =>
            d.device_type === 'gateway' ||
            d.device_type === 'router' ||
            d.ip_address.endsWith('.1') ||
            d.ip_address.endsWith('.254')
        );
        const rootId = gateway ? gateway.ip_address : 'internet';
        return nodePositions[rootId] || { x: 400, y: 300 };
    };

    return (
        <div className={`bg-white dark:bg-gray-800 shadow rounded-lg flex flex-col overflow-hidden relative group ${className || 'h-[500px]'}`}>
            <div className="absolute bottom-4 left-4 flex space-x-2 bg-white/90 dark:bg-gray-800/90 p-2 rounded-lg shadow-lg backdrop-blur z-10 border border-gray-200 dark:border-gray-700">
                <button onClick={() => setScale(s => Math.min(s + 0.1, 3))} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Zoom In">
                    <ZoomIn className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
                <button onClick={() => setScale(s => Math.max(s - 0.1, 0.5))} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Zoom Out">
                    <ZoomOut className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
                <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Reset View">
                    <Move className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
            </div>

            <div
                ref={containerRef}
                className="flex-1 relative overflow-hidden bg-slate-50 dark:bg-[#0f172a] cursor-grab active:cursor-grabbing"
                onMouseDown={(e) => handleMouseDown(e)}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}

            >
                {/* Background Grid */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
                    style={{
                        backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
                        backgroundSize: `${20 * scale}px ${20 * scale}px`,
                        backgroundPosition: `${offset.x}px ${offset.y}px`
                    }}
                />

                <svg
                    ref={svgRef}
                    className="w-full h-full"
                    viewBox="0 0 800 600"
                    preserveAspectRatio="xMidYMid slice"
                >
                    <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
                        {/* Connessioni: Tutte verso il Router/Gateway */}
                        {devices.map(device => {
                            const pos = nodePositions[device.ip_address];
                            const rootPos = getRootPos(); // Collega al root

                            // Non collegare root a se stesso
                            if (!pos || (Math.abs(pos.x - rootPos.x) < 1 && Math.abs(pos.y - rootPos.y) < 1)) return null;

                            return (
                                <line
                                    key={`link-${device.ip_address}`}
                                    x1={rootPos.x} y1={rootPos.y}
                                    x2={pos.x} y2={pos.y}
                                    stroke={device.is_active ? "#6366f1" : "#94a3b8"}
                                    strokeWidth="1"
                                    strokeOpacity="0.3"
                                    strokeDasharray={device.is_active ? "" : "4,4"}
                                />
                            );
                        })}

                        {/* Nodi */}
                        {devices.map(device => {
                            const pos = nodePositions[device.ip_address];
                            const Icon = getDeviceIcon(device);
                            if (!pos) return null;

                            const isSelected = selectedDevice?.ip_address === device.ip_address;
                            const isGateway = device.device_type === 'gateway' || device.device_type === 'router';

                            return (
                                <g
                                    key={device.ip_address}
                                    transform={`translate(${pos.x}, ${pos.y})`}
                                    onMouseDown={(e) => handleMouseDown(e, device.ip_address)}
                                    className="cursor-pointer transition-all duration-300"
                                >
                                    {/* Halo for Gateway */}
                                    {isGateway && (
                                        <circle r="40" fill="#6366f1" opacity="0.1" className="animate-pulse" />
                                    )}

                                    {/* Selection Ring */}
                                    <circle
                                        r={isGateway ? 30 : 22}
                                        fill={isSelected ? "#6366f1" : (device.is_active ? (isGateway ? "#ffffff" : "#ffffff") : "#f8fafc")}
                                        className={`transition-colors duration-300 shadow-sm ${isSelected ? '' : 'hover:fill-indigo-50 dark:fill-gray-800 dark:hover:fill-gray-700'}`}
                                        stroke={isSelected ? "#6366f1" : (device.is_active ? (isGateway ? "#6366f1" : "#cbd5e1") : "#e2e8f0")}
                                        strokeWidth={isGateway ? 3 : 2}
                                    />

                                    {/* Icon */}
                                    <foreignObject
                                        x={isGateway ? -15 : -10}
                                        y={isGateway ? -15 : -10}
                                        width={isGateway ? 30 : 20}
                                        height={isGateway ? 30 : 20}
                                        className="pointer-events-none"
                                    >
                                        <Icon
                                            width="100%"
                                            height="100%"
                                            className={`${isSelected ? 'text-white' : (device.is_active ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400')}`}
                                        />
                                    </foreignObject>

                                    {/* Label: nome/vendor/tipo + IP */}
                                    {(() => {
                                        const vendorOk = device.vendor && device.vendor !== 'Unknown' && device.vendor !== 'MAC privato (randomizzato)';
                                        let primary = device.hostname?.split('.')[0] || (vendorOk ? device.vendor : '') || device.device_type?.replace('_', ' ') || device.ip_address;
                                        if (primary.length > 18) primary = primary.slice(0, 16) + '…';
                                        return (
                                            <>
                                                <text
                                                    y={isGateway ? 44 : 34}
                                                    textAnchor="middle"
                                                    className={`text-[10px] font-semibold select-none pointer-events-none ${isSelected ? 'fill-indigo-600 dark:fill-indigo-400' : 'fill-slate-600 dark:fill-slate-300'}`}
                                                >
                                                    {primary}
                                                </text>
                                                <text
                                                    y={isGateway ? 55 : 45}
                                                    textAnchor="middle"
                                                    className="text-[9px] select-none pointer-events-none fill-slate-400 dark:fill-slate-500"
                                                >
                                                    {device.ip_address}
                                                </text>
                                            </>
                                        );
                                    })()}
                                </g>
                            );
                        })}
                    </g>
                </svg>

                {/* Info Panel */}
                {selectedDevice && (
                    <div className="absolute top-4 right-4 w-64 bg-white/95 dark:bg-gray-800/95 backdrop-blur shadow-xl rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all animate-in slide-in-from-right-10 fading-in z-20">
                        <div className="bg-indigo-600 dark:bg-indigo-700 p-3 flex justify-between items-center text-white">
                            <h4 className="font-semibold text-sm flex items-center">
                                <Info className="w-4 h-4 mr-2" />
                                {selectedDevice.hostname || selectedDevice.ip_address}
                            </h4>
                            <button onClick={(e) => { e.stopPropagation(); setSelectedDevice(null); }} className="hover:bg-white/20 rounded p-1">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="p-4 space-y-2 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="text-gray-500 dark:text-gray-400">IP:</div>
                                <div className="font-mono text-gray-900 dark:text-white">{selectedDevice.ip_address}</div>
                                <div className="text-gray-500 dark:text-gray-400">MAC:</div>
                                <div className="font-mono text-gray-900 dark:text-white truncate" title={selectedDevice.mac_address || undefined}>{selectedDevice.mac_address}</div>
                                <div className="text-gray-500 dark:text-gray-400">Tipo:</div>
                                <div className="capitalize text-indigo-600 dark:text-indigo-400 font-medium">{selectedDevice.device_type?.replace('_', ' ')}</div>
                                {selectedDevice.os && <>
                                    <div className="text-gray-500 dark:text-gray-400">OS:</div>
                                    <div className="text-gray-900 dark:text-white">{selectedDevice.os}</div>
                                </>}
                                {selectedDevice.vendor && <>
                                    <div className="text-gray-500 dark:text-gray-400">Vendor:</div>
                                    <div className="text-gray-900 dark:text-white truncate" title={selectedDevice.vendor}>{selectedDevice.vendor}</div>
                                </>}
                                {typeof selectedDevice.latency === 'number' && <>
                                    <div className="text-gray-500 dark:text-gray-400">Latenza:</div>
                                    <div className="text-gray-900 dark:text-white">{selectedDevice.latency} ms</div>
                                </>}
                                {selectedDevice.risk && selectedDevice.risk.level !== 'ok' && <>
                                    <div className="text-gray-500 dark:text-gray-400">Rischio:</div>
                                    <div className={`font-semibold ${selectedDevice.risk.level === 'alto' ? 'text-red-500' : selectedDevice.risk.level === 'medio' ? 'text-orange-500' : 'text-yellow-500'}`}>
                                        {selectedDevice.risk.level} ({selectedDevice.risk.score})
                                    </div>
                                </>}
                            </div>
                            {selectedDevice.open_ports && selectedDevice.open_ports.length > 0 && (
                                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                                    <div className="text-xs text-gray-500 mb-1">Porte Aperte:</div>
                                    <div className="flex flex-wrap gap-1">
                                        {selectedDevice.open_ports.slice(0, 8).map(p => (
                                            <span key={p} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">{p}</span>
                                        ))}
                                        {selectedDevice.open_ports.length > 8 && <span className="text-xs text-gray-400">...</span>}
                                    </div>
                                </div>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); setDetailDevice(selectedDevice); }}
                                className="w-full mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline text-left"
                            >
                                Dettagli completi →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {detailDevice && <DeviceDetailModal device={detailDevice} onClose={() => setDetailDevice(null)} />}
        </div>
    );
}

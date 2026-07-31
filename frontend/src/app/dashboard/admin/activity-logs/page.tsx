"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useActivityLogs } from "@/lib/hooks/useQueries";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { TanStackTable } from "@/components/ui/TanStackTable";
import { ColumnDef } from "@tanstack/react-table";
import {
  Search,
  X,
  Activity,
  Globe,
  Laptop,
  Calendar,
  User,
  SlidersHorizontal,
  Info,
  Shield,
  Layers,
  BookOpen,
  ArrowRightLeft,
  FileSpreadsheet,
  AlertTriangle,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

type LogRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  metadata: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  admin: { name: string; email: string };
};

// Simple User Agent parser
function parseUserAgent(uaString: string | null): string {
  if (!uaString) return "System Action";
  const ua = uaString.toLowerCase();
  let browser = "Web Client";
  let os = "OS";

  if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("chrome") || ua.includes("chromium")) browser = "Chrome";
  else if (ua.includes("safari")) browser = "Safari";
  else if (ua.includes("edge")) browser = "Edge";
  else if (ua.includes("opera") || ua.includes("opr")) browser = "Opera";

  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("macintosh") || ua.includes("mac os")) os = "macOS";
  else if (ua.includes("linux")) os = "Linux";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";

  return `${browser} on ${os}`;
}

// Action styles
const actionStyle = (a: string) => {
  switch (a) {
    case "CREATE":
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    case "DELETE":
      return "bg-rose-50 text-rose-700 border border-rose-100";
    case "UPDATE":
      return "bg-amber-50 text-amber-700 border border-amber-100";
    case "BLOCK":
      return "bg-red-50 text-red-700 border border-red-100";
    case "UNBLOCK":
      return "bg-indigo-50 text-indigo-700 border border-indigo-100";
    case "PROMOTE":
      return "bg-purple-50 text-purple-700 border border-purple-100";
    case "DEMOTE_TO_STUDENT":
      return "bg-blue-50 text-blue-700 border border-blue-100";
    case "TRANSFER_SUPER_ADMIN":
      return "bg-pink-50 text-pink-700 border border-pink-100";
    default:
      return "bg-[#f5f4f0] text-[#0d0d0d]/70 border border-[#e8e4dc]";
  }
};

// Entity icon picker
const getEntityIcon = (type: string) => {
  switch (type) {
    case "BOOK":
      return <BookOpen size={14} className="text-teal-600" />;
    case "DIGITAL_BOOK":
      return <BookOpen size={14} className="text-sky-600" />;
    case "USER":
      return <User size={14} className="text-indigo-600" />;
    case "SYSTEM_CONFIG":
      return <Shield size={14} className="text-amber-600" />;
    case "RENTAL":
    case "RESERVATION":
      return <ArrowRightLeft size={14} className="text-violet-600" />;
    case "CATEGORY":
    case "AUTHOR":
      return <Layers size={14} className="text-emerald-600" />;
    case "INVENTORY_ALERT":
      return <AlertTriangle size={14} className="text-red-600" />;
    case "REPORT":
      return <FileSpreadsheet size={14} className="text-pink-600" />;
    default:
      return <Activity size={14} className="text-[#0d0d0d]/65" />;
  }
};

export default function AdminActivityLogsPage() {
  const { t } = useLanguage();
  const { data, isLoading } = useActivityLogs("limit=250");
  const logs: LogRow[] = (data as unknown as { logs?: LogRow[] })?.logs || [];

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAction, setSelectedAction] = useState("ALL");
  const [selectedEntity, setSelectedEntity] = useState("ALL");
  const [selectedLog, setSelectedLog] = useState<LogRow | null>(null);

  // Derived filter categories
  const actionOptions = useMemo(() => {
    const actions = new Set(logs.map((l) => l.action));
    return ["ALL", ...Array.from(actions)].sort();
  }, [logs]);

  const entityOptions = useMemo(() => {
    const entities = new Set(logs.map((l) => l.entity_type));
    return ["ALL", ...Array.from(entities)].sort();
  }, [logs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        searchTerm === "" ||
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.admin?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.admin?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAction = selectedAction === "ALL" || log.action === selectedAction;
      const matchesEntity = selectedEntity === "ALL" || log.entity_type === selectedEntity;

      return matchesSearch && matchesAction && matchesEntity;
    });
  }, [logs, searchTerm, selectedAction, selectedEntity]);

  // Relative time helper
  const getRelativeTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  // Render metadata values cleanly, hiding any UUIDs
  const renderMetadata = (metadata: any) => {
    if (!metadata || typeof metadata !== "object") return null;

    const entries = Object.entries(metadata).filter(([key, val]) => {
      // Hide UUIDs and keys ending with id
      const isUuid = typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
      const isIdKey = key.toLowerCase().endsWith("_id") || key.toLowerCase() === "id";
      return !isUuid && !isIdKey;
    });

    if (entries.length === 0) return null;

    return (
      <div className="space-y-3 mt-2">
        {entries.map(([key, val]) => {
          let renderedValue: React.ReactNode = "";
          if (val === null || val === undefined) {
            renderedValue = <span className="text-[#0d0d0d]/30 font-medium italic">None</span>;
          } else if (typeof val === "boolean") {
            renderedValue = val ? (
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold">Yes</span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-bold">No</span>
            );
          } else if (typeof val === "object") {
            if (Array.isArray(val)) {
              renderedValue = val.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {val.map((item, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 rounded bg-[#f5f4f0] text-[10px] font-medium text-[#0d0d0d]/65 border border-[#e8e4dc]">
                      {String(item)}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[#0d0d0d]/30 italic">Empty List</span>
              );
            } else {
              // Nested object
              const nestedEntries = Object.entries(val).filter(([nk, nv]) => {
                const isNestedUuid = typeof nv === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(nv);
                return !nk.toLowerCase().endsWith("_id") && !isNestedUuid && nk !== "id";
              });
              renderedValue = nestedEntries.length > 0 ? (
                <div className="bg-[#faf9f6] border border-[#e8e4dc]/70 rounded-lg p-2.5 space-y-1.5">
                  {nestedEntries.map(([nk, nv]) => (
                    <div key={nk} className="flex justify-between items-center text-[10.5px]">
                      <span className="text-[#0d0d0d]/45 font-bold uppercase tracking-wider text-[8.5px]">{nk.replace(/_/g, " ")}</span>
                      <span className="text-[#0d0d0d]/75 font-mono">{String(nv)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-[#0d0d0d]/30 italic">Object</span>
              );
            }
          } else {
            renderedValue = <span className="text-[#0d0d0d]/70 font-mono text-[11.5px] break-all">{String(val)}</span>;
          }

          return (
            <div key={key} className="flex flex-col sm:flex-row sm:items-start justify-between gap-1.5 py-2 border-b border-[#f5f4f0] last:border-0">
              <span className="text-[10px] font-black text-[#0d0d0d]/45 uppercase tracking-wider shrink-0 mt-0.5">
                {key.replace(/_/g, " ")}
              </span>
              <div className="text-right sm:max-w-[70%]">{renderedValue}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const cols: ColumnDef<LogRow, unknown>[] = [
    {
      id: "admin",
      header: String(t("admin_activity_logs.table.admin")),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#f5f4f0] border border-[#e8e4dc] flex items-center justify-center text-[11px] font-bold text-[#0d0d0d]/60 select-none">
            {row.original.admin?.name ? row.original.admin.name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "S"}
          </div>
          <div>
            <p className="text-[13px] font-bold text-[#0d0d0d] truncate">
              {row.original.admin?.name || String(t("admin_activity_logs.system"))}
            </p>
            <p className="text-[11px] text-[#0d0d0d]/40 truncate">
              {row.original.admin?.email || "internal@system"}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "action",
      header: String(t("admin_activity_logs.table.action")),
      cell: ({ row }) => (
        <span className={`inline-flex px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${actionStyle(row.original.action)}`}>
          {row.original.action}
        </span>
      ),
    },
    {
      id: "entity",
      header: "Entity",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          {getEntityIcon(row.original.entity_type)}
          <span className="inline-flex px-1.5 py-0.5 rounded-md bg-[#f5f4f0] text-[9px] font-black uppercase text-[#0d0d0d]/50">
            {row.original.entity_type}
          </span>
        </div>
      ),
    },
    {
      id: "desc",
      header: String(t("admin_activity_logs.table.description")),
      cell: ({ row }) => (
        <span className="text-[12.5px] text-[#0d0d0d]/75 font-medium line-clamp-1 max-w-[280px]">
          {row.original.description}
        </span>
      ),
    },
    {
      id: "connection",
      header: "Device / IP",
      cell: ({ row }) => (
        <div>
          <p className="text-[12px] font-semibold text-[#0d0d0d]/65 truncate">
            {parseUserAgent(row.original.user_agent)}
          </p>
          <p className="text-[10px] text-[#0d0d0d]/35 font-mono">
            {row.original.ip_address || "local / unknown"}
          </p>
        </div>
      ),
    },
    {
      id: "time",
      header: String(t("admin_activity_logs.table.timestamp")),
      cell: ({ row }) => (
        <div>
          <p className="text-[12px] font-semibold text-[#0d0d0d]/65">{getRelativeTime(row.original.created_at)}</p>
          <p className="text-[10px] text-[#0d0d0d]/35">
            {new Date(row.original.created_at).toLocaleDateString()} {new Date(row.original.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      ),
    },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="p-2 sm:p-4 lg:p-6 space-y-5 relative">
      
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">Audit Trail</p>
          <h1 className="text-[26px] font-serif font-black text-[#0d0d0d]">{String(t("admin_activity_logs.title"))}</h1>
          <p className="text-sm text-[#0d0d0d]/45 mt-1">{String(t("admin_activity_logs.subtitle"))}</p>
        </div>
        <span className="px-4 py-2 bg-white border border-[#e8e4dc] rounded-xl text-[10px] font-black text-[#0d0d0d]/45 uppercase tracking-wider shrink-0">
          {String(t("admin_activity_logs.retention"))}
        </span>
      </motion.div>

      {/* Filters Card */}
      <motion.div variants={fadeUp} className="bg-white p-4 rounded-2xl border border-[#e8e4dc] shadow-sm flex flex-col md:flex-row gap-3 items-center">
        <div className="relative w-full md:flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0d0d0d]/35" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search logs by admin, entity, or description..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#e8e4dc] bg-[#faf9f6]/40 focus:bg-white text-xs font-medium text-[#0d0d0d] focus:border-[#0d0d0d] focus:ring-0 outline-none transition-all placeholder:text-[#0d0d0d]/30"
          />
        </div>

        <div className="flex w-full md:w-auto items-center gap-2">
          {/* Action Filter */}
          <div className="flex-1 md:w-44">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#e8e4dc] bg-[#faf9f6]/40 text-xs font-semibold text-[#0d0d0d]/70 outline-none focus:border-[#0d0d0d] transition-all cursor-pointer"
            >
              <option value="ALL">All Actions</option>
              {actionOptions.filter((act) => act !== "ALL").map((action) => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>

          {/* Entity Filter */}
          <div className="flex-1 md:w-44">
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#e8e4dc] bg-[#faf9f6]/40 text-xs font-semibold text-[#0d0d0d]/70 outline-none focus:border-[#0d0d0d] transition-all cursor-pointer"
            >
              <option value="ALL">All Entities</option>
              {entityOptions.filter((ent) => ent !== "ALL").map((entity) => (
                <option key={entity} value={entity}>{entity}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {(searchTerm !== "" || selectedAction !== "ALL" || selectedEntity !== "ALL") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedAction("ALL");
                setSelectedEntity("ALL");
              }}
              className="p-2 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition-all"
              title="Reset Filters"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </motion.div>

      {/* Main Table */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-[#e8e4dc] shadow-sm overflow-hidden">
        <TanStackTable
          data={filteredLogs}
          columns={cols}
          isLoading={isLoading}
          onRowClick={(row) => setSelectedLog(row)}
          emptyText="No matching audit logs found."
          skeletonRows={6}
        />
      </motion.div>

      {/* Side Slide-Over Drawer */}
      <AnimatePresence>
        {selectedLog && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[2147483640]"
              onClick={() => setSelectedLog(null)}
            />

            {/* Slide-over Drawer Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 35 }}
              className="fixed right-0 top-0 h-screen w-full max-w-[520px] bg-white border-l border-[#e8e4dc] shadow-2xl z-[2147483641] flex flex-col"
            >
              {/* Header */}
              <div className="p-5 border-b border-[#e8e4dc] flex items-center justify-between bg-[#faf9f6]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#e8e4dc] grid place-items-center shadow-sm">
                    {getEntityIcon(selectedLog.entity_type)}
                  </div>
                  <div>
                    <h2 className="text-[14px] font-black text-[#0d0d0d] tracking-wide uppercase">
                      {selectedLog.action.replace(/_/g, " ")}
                    </h2>
                    <p className="text-[10px] font-bold text-[#0d0d0d]/35 tracking-wider uppercase mt-0.5">
                      Target Entity: {selectedLog.entity_type}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="w-8 h-8 rounded-lg border border-[#e2e0e7] hover:border-[#0d0d0d] flex items-center justify-center text-[#0d0d0d]/40 hover:text-[#0d0d0d] bg-white transition-all"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                
                {/* Description Card */}
                <div className="bg-[#0d0d0d]/[0.02] border border-[#e8e4dc] rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-[#0d0d0d]/45">
                    <Info size={14} />
                    <span className="text-[9.5px] font-black uppercase tracking-wider">Log Description</span>
                  </div>
                  <p className="text-[14px] font-medium text-[#0d0d0d]/80 leading-relaxed font-serif">
                    {selectedLog.description}
                  </p>
                </div>

                {/* Operator Details */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 text-[#0d0d0d]/45 px-1">
                    <User size={14} />
                    <span className="text-[9.5px] font-black uppercase tracking-wider">Performed By</span>
                  </div>
                  <div className="bg-white border border-[#e8e4dc] rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#f5f4f0] border border-[#e8e4dc] flex items-center justify-center text-[12px] font-bold text-[#0d0d0d]/60 select-none">
                      {selectedLog.admin?.name ? selectedLog.admin.name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "S"}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[#0d0d0d]">
                        {selectedLog.admin?.name || "System"}
                      </p>
                      <p className="text-[11px] text-[#0d0d0d]/45 font-medium mt-0.5">
                        {selectedLog.admin?.email || "internal@system.org"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Connection details */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 text-[#0d0d0d]/45 px-1">
                    <Globe size={14} />
                    <span className="text-[9.5px] font-black uppercase tracking-wider">Connection & Device</span>
                  </div>
                  <div className="bg-white border border-[#e8e4dc] rounded-2xl p-4 grid grid-cols-2 gap-4">
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-black text-[#0d0d0d]/35 uppercase tracking-wider">IP Address</p>
                      <p className="text-[12.5px] font-mono font-semibold text-[#0d0d0d]/70 mt-0.5">
                        {selectedLog.ip_address || "local / unknown"}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-black text-[#0d0d0d]/35 uppercase tracking-wider">Browser & Device</p>
                      <p className="text-[12.5px] font-semibold text-[#0d0d0d]/70 mt-0.5">
                        {parseUserAgent(selectedLog.user_agent)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 text-[#0d0d0d]/45 px-1">
                    <Calendar size={14} />
                    <span className="text-[9.5px] font-black uppercase tracking-wider">Timestamp</span>
                  </div>
                  <div className="bg-white border border-[#e8e4dc] rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[12.5px] font-semibold text-[#0d0d0d]/70">
                        {new Date(selectedLog.created_at).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'medium' })}
                      </p>
                      <p className="text-[11px] text-[#0d0d0d]/40 font-medium mt-0.5">
                        Exact time of request execution
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-[#f5c518]/10 border border-[#f5c518]/25 text-[#a18100] text-[10.5px] font-black uppercase tracking-wider select-none shrink-0">
                      {getRelativeTime(selectedLog.created_at)}
                    </span>
                  </div>
                </div>

                {/* Metadata details */}
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5 text-[#0d0d0d]/45 px-1">
                      <SlidersHorizontal size={14} />
                      <span className="text-[9.5px] font-black uppercase tracking-wider">Associated Parameters</span>
                    </div>
                    <div className="bg-white border border-[#e8e4dc] rounded-2xl p-4">
                      {renderMetadata(selectedLog.metadata) ? (
                        renderMetadata(selectedLog.metadata)
                      ) : (
                        <p className="text-xs text-[#0d0d0d]/35 italic">No displayable parameter payload.</p>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

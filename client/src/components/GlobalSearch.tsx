import { useState, useCallback, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Search, Car, Users, FileText, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/useDebounce";

const statusLabels: Record<string, string> = {
  available: "متاح", rented: "مؤجرة", maintenance: "صيانة",
  late: "متأخرة", in_transfer: "نقل",
  active: "نشط", completed: "مكتمل", cancelled: "ملغي", draft: "مسودة",
};
const statusColors: Record<string, string> = {
  available: "bg-green-100 text-green-700", rented: "bg-blue-100 text-blue-700",
  maintenance: "bg-yellow-100 text-yellow-700", late: "bg-red-100 text-red-700",
  in_transfer: "bg-purple-100 text-purple-700",
  active: "bg-blue-100 text-blue-700", completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-700", draft: "bg-gray-100 text-gray-700",
};

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  const { data, isFetching } = trpc.search.global.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 2 }
  );

  const hasResults = data && (
    (data.vehicles?.length ?? 0) > 0 ||
    (data.customers?.length ?? 0) > 0 ||
    (data.contracts?.length ?? 0) > 0
  );

  const handleNavigate = useCallback((path: string) => {
    setLocation(path);
    setQuery("");
    setIsOpen(false);
  }, [setLocation]);

  const handleClear = useCallback(() => {
    setQuery("");
    setIsOpen(false);
    inputRef.current?.blur();
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Keyboard shortcut: Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="بحث شامل... (Ctrl+K)"
          className="pr-9 pl-8 h-9 text-sm bg-muted/50 border-muted focus:bg-background"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {isOpen && query.length >= 2 && (
        <div className="absolute top-full mt-2 w-full min-w-[320px] bg-background border rounded-xl shadow-xl z-50 overflow-hidden">
          {isFetching && (
            <div className="px-4 py-3 text-sm text-muted-foreground text-center">جاري البحث...</div>
          )}

          {!isFetching && !hasResults && debouncedQuery.length >= 2 && (
            <div className="px-4 py-6 text-sm text-muted-foreground text-center">
              لا توجد نتائج لـ "{debouncedQuery}"
            </div>
          )}

          {!isFetching && hasResults && (
            <div className="max-h-80 overflow-y-auto">
              {/* Vehicles */}
              {(data?.vehicles?.length ?? 0) > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/30 flex items-center gap-1.5">
                    <Car className="h-3 w-3" />السيارات
                  </div>
                  {data!.vehicles.map(v => (
                    <button
                      key={v.id}
                      onClick={() => handleNavigate(`/vehicles/${v.id}`)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-accent text-right transition-colors"
                    >
                      <div className="text-right">
                        <div className="text-sm font-medium">{v.brand} {v.model} {v.year}</div>
                        <div className="text-xs text-muted-foreground">{v.plateNumber}</div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[v.status] || 'bg-gray-100 text-gray-700'}`}>
                        {statusLabels[v.status] || v.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Customers */}
              {(data?.customers?.length ?? 0) > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/30 flex items-center gap-1.5">
                    <Users className="h-3 w-3" />العملاء
                  </div>
                  {data!.customers.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleNavigate(`/customers/${c.id}`)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-accent text-right transition-colors"
                    >
                      <div className="text-right">
                        <div className="text-sm font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.phone}</div>
                      </div>
                      {c.isBlacklisted && (
                        <Badge variant="destructive" className="text-xs">محظور</Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Contracts */}
              {(data?.contracts?.length ?? 0) > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/30 flex items-center gap-1.5">
                    <FileText className="h-3 w-3" />العقود
                  </div>
                  {data!.contracts.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleNavigate(`/contracts/${c.id}`)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-accent text-right transition-colors"
                    >
                      <div className="text-right">
                        <div className="text-sm font-medium">{c.contractNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(c.startDate).toLocaleDateString('ar-SA')} - {new Date(c.endDate).toLocaleDateString('ar-SA')}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[c.status] || 'bg-gray-100 text-gray-700'}`}>
                        {statusLabels[c.status] || c.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

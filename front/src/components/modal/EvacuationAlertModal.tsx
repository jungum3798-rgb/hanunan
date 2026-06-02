"use client";

import { EvacuationShelter } from "@/services/api";

interface Props {
  isOpen: boolean;
  shelters: EvacuationShelter[];
  onClose: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  SHELTER: "대피소",
  AED: "AED",
  FIRE_WATER: "소화전",
  RESCUE_BOX: "구조함",
};

export default function EvacuationAlertModal({ isOpen, shelters, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-6 px-4 pointer-events-none">
      <div
        className="pointer-events-auto w-full max-w-lg bg-red-950 border-2 border-red-600 rounded-2xl shadow-2xl shadow-red-900/60 overflow-hidden animate-slide-down"
        style={{ animation: "slideDown 0.3s ease-out" }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 bg-red-900/60">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">🚨</span>
            <div>
              <p className="font-bold text-white text-lg leading-tight">대피 명령</p>
              <p className="text-red-300 text-sm">주변 {shelters.length}곳의 대피소가 확인되었습니다</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-red-400 hover:text-white text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 대피소 목록 */}
        <div className="max-h-72 overflow-y-auto px-4 py-3 space-y-2">
          {shelters.length === 0 ? (
            <p className="text-red-400 text-sm text-center py-4">반경 내 대피소 정보가 없습니다</p>
          ) : (
            shelters.map((s, i) => (
              <div
                key={s.id ?? i}
                className="bg-red-900/40 rounded-xl p-3 border border-red-800/50 flex items-start gap-3"
              >
                <span className="text-xl mt-0.5">🏠</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-red-800 text-red-200">
                      {TYPE_LABEL[s.type] ?? s.type}
                    </span>
                    <span className="text-sm font-semibold text-white truncate">{s.name}</span>
                  </div>
                  <p className="text-xs text-red-300 truncate">{s.address}</p>
                  {s.detail && <p className="text-xs text-red-400/70 mt-0.5 truncate">{s.detail}</p>}
                  {s.phone && <p className="text-xs text-red-300 mt-0.5">📞 {s.phone}</p>}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 하단 */}
        <div className="px-5 py-3 bg-red-900/30 border-t border-red-800/50">
          <p className="text-xs text-red-400 text-center">
            SSE 실시간 push — 가장 가까운 대피소로 즉시 이동하세요
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import {
  connectSse,
  EvacuationShelter,
  EvacuationShelterData,
  FireMarker,
  DisasterAlertMarker,
} from "@/services/api";

const API = process.env.NEXT_PUBLIC_API_URL!;

interface LogEntry {
  id: number;
  time: string;
  type: string;
  color: string;
  summary: string;
  raw: string;
}

const SHELTER_TYPE_LABEL: Record<string, string> = {
  SHELTER: "대피소",
  AED: "AED",
  FIRE_WATER: "소화전",
  RESCUE_BOX: "구조함",
};

export default function SseTestPage() {
  const [lat, setLat] = useState("37.5665");
  const [lng, setLng] = useState("126.9780");
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [shelters, setShelters] = useState<EvacuationShelter[]>([]);
  const [evacuationRequired, setEvacuationRequired] = useState(false);
  const [sending, setSending] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const logIdRef = useRef(0);

  const addLog = (type: string, color: string, summary: string, raw: object) => {
    const entry: LogEntry = {
      id: logIdRef.current++,
      time: new Date().toLocaleTimeString("ko-KR"),
      type,
      color,
      summary,
      raw: JSON.stringify(raw, null, 2),
    };
    setLogs((prev) => [entry, ...prev].slice(0, 100));
  };

  const connect = () => {
    if (esRef.current) {
      esRef.current.close();
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    const es = connectSse(
      (fireMarkers, disasterMarkers) => {
        addLog("init", "#6366f1", `초기 데이터: 화재 ${fireMarkers.length}건, 재난 ${disasterMarkers.length}건`, {
          fireMarkers,
          disasterMarkers,
        });
      },
      (marker: FireMarker) => {
        addLog("fire-marker", "#ef4444", `화재 마커: ${marker.parsedAddress}`, marker);
      },
      (marker: DisasterAlertMarker) => {
        addLog("disaster-marker", "#f97316", `재난 마커 (${marker.disasterType}): ${marker.parsedAddress}`, marker);
      },
      (data: EvacuationShelterData) => {
        addLog(
          "evacuation-shelter",
          "#22c55e",
          `대피소 ${data.shelters.length}곳 push — evacuationRequired=${data.evacuationRequired}`,
          data,
        );
        setEvacuationRequired(data.evacuationRequired);
        setShelters(data.shelters);
      },
      isNaN(parsedLat) ? null : parsedLat,
      isNaN(parsedLng) ? null : parsedLng,
    );

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    esRef.current = es;
    setConnected(true);
    addLog("system", "#94a3b8", `SSE 연결됨 — lat=${lat}, lng=${lng}`, { lat, lng });
  };

  const disconnect = () => {
    esRef.current?.close();
    esRef.current = null;
    setConnected(false);
    addLog("system", "#94a3b8", "SSE 연결 해제", {});
  };

  useEffect(() => () => esRef.current?.close(), []);

  const sendTestFire = async (withEvacuation: boolean) => {
    setSending(true);
    const message = withEvacuation
      ? "[서울시 중구] 을지로 3가 일대 화재 발생. 인근 주민은 즉시 대피 바랍니다."
      : "[서울시 중구] 을지로 3가 일대 화재 발생. 소방 당국이 진화 중입니다.";
    try {
      const res = await fetch(`${API}/api/fire/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, rcptnRgnNm: "서울시 중구" }),
      });
      if (!res.ok) throw new Error(await res.text());
      addLog("system", "#94a3b8", `테스트 화재 전송 완료 (대피 키워드: ${withEvacuation ? "있음" : "없음"})`, {
        message,
      });
    } catch (e: any) {
      addLog("system", "#f43f5e", `전송 실패: ${e.message}`, {});
    } finally {
      setSending(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setLat(String(pos.coords.latitude));
      setLng(String(pos.coords.longitude));
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-mono p-6">
      {/* 헤더 */}
      <div className="mb-6 flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-gray-600"}`} />
        <h1 className="text-xl font-bold text-white">SSE 대피소 Push 테스트</h1>
        <span className={`text-sm px-2 py-0.5 rounded ${connected ? "bg-green-900 text-green-300" : "bg-gray-800 text-gray-400"}`}>
          {connected ? "CONNECTED" : "DISCONNECTED"}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 왼쪽 컨트롤 + 로그 */}
        <div className="flex flex-col gap-4">
          {/* GPS + 연결 */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-xs text-gray-400 mb-3 uppercase tracking-wider">GPS 좌표 (백엔드가 이 위치 기준으로 대피소 조회)</p>
            <div className="flex gap-2 mb-3">
              <input
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                placeholder="위도 (lat)"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
              <input
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                placeholder="경도 (lng)"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
              />
              <button
                onClick={useMyLocation}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300"
              >
                현위치
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={connect}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-semibold transition-colors"
              >
                SSE 연결
              </button>
              <button
                onClick={disconnect}
                disabled={!connected}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded text-sm font-semibold transition-colors"
              >
                연결 해제
              </button>
            </div>
          </div>

          {/* 테스트 버튼 */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-xs text-gray-400 mb-3 uppercase tracking-wider">테스트 재난문자 전송</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => sendTestFire(true)}
                disabled={sending}
                className="py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-40 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                🚨 화재 발생 + 대피 키워드 포함
              </button>
              <button
                onClick={() => sendTestFire(false)}
                disabled={sending}
                className="py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded text-sm font-semibold transition-colors"
              >
                화재 발생 (대피 키워드 없음)
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              대피 키워드 포함 시 → evacuation-shelter 이벤트 수신 예정
            </p>
          </div>

          {/* 이벤트 로그 */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex-1">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400 uppercase tracking-wider">이벤트 로그</p>
              <button onClick={() => setLogs([])} className="text-xs text-gray-500 hover:text-gray-300">
                초기화
              </button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {logs.length === 0 && (
                <p className="text-xs text-gray-600 text-center py-4">SSE 연결 후 이벤트가 여기에 표시됩니다</p>
              )}
              {logs.map((log) => (
                <div key={log.id} className="text-xs border-l-2 pl-2 py-1" style={{ borderColor: log.color }}>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">{log.time}</span>
                    <span className="font-bold" style={{ color: log.color }}>
                      {log.type}
                    </span>
                  </div>
                  <p className="text-gray-300 mt-0.5">{log.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 오른쪽 대피소 패널 */}
        <div className="flex flex-col gap-4">
          {/* 대피 상태 배너 */}
          <div
            className={`rounded-xl p-4 border transition-all duration-500 ${
              evacuationRequired
                ? "bg-red-950 border-red-700 shadow-lg shadow-red-900/40"
                : "bg-gray-900 border-gray-800"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{evacuationRequired ? "🚨" : "🔔"}</span>
              <div>
                <p className={`font-bold text-lg ${evacuationRequired ? "text-red-300" : "text-gray-400"}`}>
                  {evacuationRequired ? "대피 명령 수신" : "대기 중"}
                </p>
                <p className="text-sm text-gray-400">
                  {evacuationRequired
                    ? `주변 ${shelters.length}곳의 대피소가 SSE로 push되었습니다`
                    : "대피 키워드가 포함된 재난문자 수신 시 대피소가 자동으로 표시됩니다"}
                </p>
              </div>
            </div>
          </div>

          {/* 대피소 목록 */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex-1">
            <p className="text-xs text-gray-400 mb-3 uppercase tracking-wider">
              주변 대피소 ({shelters.length}곳)
            </p>
            {shelters.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">🏠</p>
                <p className="text-gray-600 text-sm">대피 키워드가 감지되면</p>
                <p className="text-gray-600 text-sm">SSE로 대피소 목록이 push됩니다</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {shelters.map((s, i) => (
                  <div key={s.id ?? i} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-green-900 text-green-300 font-bold">
                            {SHELTER_TYPE_LABEL[s.type] ?? s.type}
                          </span>
                          <span className="text-sm font-semibold text-white truncate">{s.name}</span>
                        </div>
                        <p className="text-xs text-gray-400 truncate">{s.address}</p>
                        {s.detail && <p className="text-xs text-gray-500 mt-0.5">{s.detail}</p>}
                        {s.phone && <p className="text-xs text-indigo-400 mt-0.5">📞 {s.phone}</p>}
                      </div>
                      <div className="text-right text-xs text-gray-500 whitespace-nowrap">
                        <p>{s.latitude?.toFixed(4)}</p>
                        <p>{s.longitude?.toFixed(4)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

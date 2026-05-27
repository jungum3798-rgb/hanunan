/**
 * 카카오맵 SDK 전역 타입.
 * - 런타임: KakaoMap.tsx에서 sdk.js 로드 후 window.kakao 에 주입
 * - 타입: npm 패키지 kakao.maps.d.ts (react-kakao-maps-sdk 의존성)
 */
/// <reference types="kakao.maps.d.ts" />

declare global {
  interface Window {
    kakao: KakaoGlobal;
  }
}

/** window.kakao — kakao.maps.d.ts 네임스페이스와 연결 */
interface KakaoGlobal {
  maps: typeof kakao.maps;
}

export {};
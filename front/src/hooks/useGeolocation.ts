// 'use client';

// import { useState, useCallback } from 'react';

// interface GeolocationCoords {
//   lat: number;
//   lng: number;
// }

// interface GeolocationState {
//   coords: GeolocationCoords | null;
//   loading: boolean;
//   error: string | null;
// }

// const ERROR_MESSAGES: Record<number, string> = {
//   1: '위치 접근 권한이 거부되었습니다.',
//   2: '위치 정보를 사용할 수 없습니다.',
//   3: '위치 정보 요청 시간이 초과되었습니다.',
// };

// export function useGeolocation() {
//   const [state, setState] = useState<GeolocationState>({
//     coords: null,
//     loading: false,
//     error: null,
//   });

//   const fetchLocation = useCallback(() => {
//     if (!navigator.geolocation) {
//       setState(prev => ({ ...prev, error: '이 브라우저는 위치 정보를 지원하지 않습니다.' }));
//       return;
//     }

//     setState({ coords: null, loading: true, error: null });

//     navigator.geolocation.getCurrentPosition(
//       (position) => {
//         setState({
//           coords: {
//             lat: position.coords.latitude,
//             lng: position.coords.longitude,
//           },
//           loading: false,
//           error: null,
//         });
//       },
//       (err: GeolocationPositionError) => {
//         setState({
//           coords: null,
//           loading: false,
//           error: ERROR_MESSAGES[err.code] ?? '위치 정보를 가져올 수 없습니다.',
//         });
//       },
//       {
//         enableHighAccuracy: true,
//         timeout: 10_000,
//         maximumAge: 0,
//       },
//     );
//   }, []);

//   return { ...state, fetchLocation };
// }
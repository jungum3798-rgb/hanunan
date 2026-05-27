
/** 폴리곤 색(빨강·주황·노랑)과 동일한 하단바 UI 클래스 */
export function getWeatherAlertLevelUiClasses(alertLevel?: string): {
  badge: string;
  container: string;
} {
  if (alertLevel === '위급재난') {
    return {
      badge: 'bg-red-600 text-white border border-red-500',
      container: 'bg-red-600/30 border-red-500/60',
    };
  }
  if (alertLevel === '긴급재난') {
    return {
      badge: 'bg-orange-500 text-white border border-orange-400',
      container: 'bg-orange-500/25 border-orange-500/50',
    };
  }
  return {
    badge: 'bg-yellow-400 text-yellow-950 border border-yellow-300',
    container: 'bg-yellow-400/25 border-yellow-400/50',
  };
}

//  EPSG:5186 (GRS80 중부원점) -> WGS84 위경도 변환 함수
export const convertEPSG5186ToWGS84 = (x: number, y: number) => {
  // 대한민국 행정구역도(EPSG:5186) 투영 파라미터 정의
  const DX = 200000;  // EPSG:5186 기준 원점 가산값 (X)
  const DY = 600000;  // EPSG:5186 기준 원점 가산값 (Y)
  const scaleFactor = 1.0; // 중부원점 투영 가중치
  
  const semiMajorAxis = 6378137.0;
  const flattening = 1 / 298.257222101;
  
  const lonOrigin = 127.0 * Math.PI / 180.0; // 중부원점 경도 (127도)
  const latOrigin = 38.0 * Math.PI / 180.0;  // 중부원점 위도 (38도)

  const e2 = 2 * flattening - flattening * flattening;
  const e4 = e2 * e2;
  const e6 = e4 * e2;
  
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const e1_2 = e1 * e1;
  const e1_3 = e1_2 * e1;
  const e1_4 = e1_3 * e1;

  const x_m = x - DX;
  const y_m = y - DY;

  const mOrigin = semiMajorAxis * (
    (1 - e2 / 4 - 3 * e4 / 64 - 5 * e6 / 256) * latOrigin -
    (3 * e2 / 8 + 3 * e4 / 32 + 45 * e6 / 1024) * Math.sin(2 * latOrigin) +
    (15 * e4 / 256 + 45 * e6 / 1024) * Math.sin(4 * latOrigin) -
    (35 * e6 / 3072) * Math.sin(6 * latOrigin)
  );

  const m = mOrigin + y_m / scaleFactor;
  const mu = m / (semiMajorAxis * (1 - e2 / 4 - 3 * e4 / 64 - 5 * e6 / 256));

  const phi1 = mu + 
    (3 * e1 / 2 - 27 * e1_3 / 32) * Math.sin(2 * mu) + 
    (21 * e1_2 / 16 - 55 * e1_4 / 32) * Math.sin(4 * mu) + 
    (151 * e1_3 / 96) * Math.sin(6 * mu) + 
    (1097 * e1_4 / 512) * Math.sin(8 * mu);

  const sin_phi1 = Math.sin(phi1);
  const cos_phi1 = Math.cos(phi1);
  const tan_phi1 = Math.tan(phi1);

  const n1 = semiMajorAxis / Math.sqrt(1 - e2 * sin_phi1 * sin_phi1);
  const r1 = semiMajorAxis * (1 - e2) / Math.pow(1 - e2 * sin_phi1 * sin_phi1, 1.5);
  const d = x_m / (n1 * scaleFactor);
  const d2 = d * d;
  const d3 = d2 * d;
  const d4 = d3 * d;
  const d5 = d4 * d;
  const d6 = d5 * d;

  const lat = phi1 - (n1 * tan_phi1 / r1) * (d2 / 2 - (5 + 3 * tan_phi1 * tan_phi1 + 10 * (semiMajorAxis / r1 - 1) - 9 * tan_phi1 * tan_phi1 * (semiMajorAxis / r1 - 1)) * d4 / 24 + (61 + 90 * tan_phi1 * tan_phi1 + 45 * Math.pow(tan_phi1, 4)) * d6 / 720);
  const lng = lonOrigin + (d - (1 + 2 * tan_phi1 * tan_phi1 + (semiMajorAxis / r1 - 1)) * d3 / 6 + (5 + 28 * tan_phi1 * tan_phi1 + 24 * Math.pow(tan_phi1, 4) + 6 * (semiMajorAxis / r1 - 1) + 8 * tan_phi1 * tan_phi1 * (semiMajorAxis / r1 - 1)) * d5 / 120) / cos_phi1;

  return {
    latitude: lat * 180.0 / Math.PI,
    longitude: lng * 180.0 / Math.PI
  };
};


//화재마커 시간별 필터링 상태 반환
export const getFireStage = (createdAt: string) => {
  const now = new Date();
  const created = new Date(createdAt);
  const diffInHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);

  if (diffInHours >= 12) return 'deleted';    // 12시간 이상: 삭제
  if (diffInHours >= 6) return 'estimated';   // 6~12시간: 종료추정 (회색)
  if (diffInHours >= 2) return 'cooling';     // 2~6시간: 진화중 (주황)
  return 'active';                            // 0~2시간: 진행중 (빨강)
};
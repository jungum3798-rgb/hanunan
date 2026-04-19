// 토큰이 필요한 API 호출할 때 사용하는 공통 함수
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,  // 토큰 자동 첨부
      ...options.headers,
    },
  });

  if (response.status === 401) {
    // 토큰 만료 시 로그인 페이지로 이동
    localStorage.removeItem("token");
    window.location.href = "/login";
  }

  return response;
}
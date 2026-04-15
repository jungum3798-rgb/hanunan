"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function KakaoCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) return;

    fetch(`http://localhost:8081/api/auth/kakao?code=${code}`)
      .then((res) => res.json())
      .then((data) => {
        localStorage.setItem("token", data.token);
        router.push("/");
      })
      .catch((err) => {
        console.error("로그인 실패:", err);
        router.push("/login?error=true");
      });
  }, []);

  return <div className="text-center mt-20">로그인 처리 중...</div>;
}
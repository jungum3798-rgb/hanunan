"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function KakaoRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";
  // Use a ref to prevent double execution in Strict Mode
  const isCalledRef = useRef(false);

  useEffect(() => {
    if (isCalledRef.current) return;
    isCalledRef.current = true;

    const code = searchParams.get("code");
    console.log(code);
    if (code) {
      sendCodeToServer(code);
    }
  }, [searchParams]);

  const sendCodeToServer = async (code) => {
    try {
      const response = await fetch(`${backendUrl}/member/kakao/doLogin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error("Kakao login failed");
      }

      const data = await response.json();
      const token = data.token;
      
      localStorage.setItem("token", token);
      window.location.href = "/";
    } catch (error) {
      console.error(error);
      alert("카카오 로그인 처리 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="flex justify-center items-center py-12">
      <div className="text-xl font-medium text-gray-700">
        카카오 로그인 진행중...
      </div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import axios from 'axios';
import {kakaoLogin} from '@/services/api';
export default function KakaoRedirect() {
  useEffect(() => {
    const code = new URL(window.location.href).searchParams.get('code');

    if (code) {
          const handleLogin = async () => {
          try {
              // 📢 api.ts에 연동된 함수 호출
              const data = await kakaoLogin(code);
            
              // 백엔드 반환 데이터 필드 구조인 data.token 연동
              localStorage.setItem("token", data.token);
            
              // 백엔드 명세 데이터 구조 보존 (id, token, nickname, email)
              const userData = {
                id: data.id,
                nickname: data.nickname || "카카오 사용자", 
                email: data.email
              };
              localStorage.setItem("user", JSON.stringify(userData));
            
            // 메인 대시보드로 이동
            window.location.href = '/';
          } catch (err) {
              console.error("구글 로그인 실패:", err);
              alert("로그인 처리 중 에러가 발생했습니다.");
               window.location.href = '/login';
            }
          };
    
          handleLogin();
        }   
      }, []);

  return (
    <div className="flex justify-center items-center py-12">
      <div className="text-xl font-medium text-gray-700">
        카카오 계정으로 로그인 중입니다...
      </div>
    </div>
  );
}
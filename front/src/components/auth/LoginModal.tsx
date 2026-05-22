'use client';

import { useState, useEffect } from 'react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [userDisplayName, setUserDisplayName] = useState<string>('');

  // 컴포넌트 마운트 시 로컬 스토리지에서 유저 정보를 확인하여 이메일 ID 추출
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.email) {
          // 이메일 주소에서 '@' 앞부분(아이디)만 분리
          const emailId = parsed.email.split('@')[0];
          setUserDisplayName(emailId);
        }
      } catch (e) {
        console.error('유저 정보 파싱 에이션 에러:', e);
      }
    }
  }, [isOpen]); // 모달이 열릴 때마다 상태 동기화

  if (!isOpen) return null;

  const handleKakaoLogin = () => {
    const kakaoClientId = "007f796368af3edc01ad000ad8484adc";
    const kakaoRedirectUrl = "http://localhost:3000/oauth/kakao/redirect";
    const KAKAO_AUTH_URL = `https://kauth.kakao.com/oauth/authorize?client_id=${kakaoClientId}&redirect_uri=${kakaoRedirectUrl}&response_type=code`;
  
    window.location.href = KAKAO_AUTH_URL;
  };

  const handleGoogleLogin = () => {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const googleRedirectUrl = "http://localhost:3000/oauth/google/redirect";
    const GOOGLE_AUTH_URL = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${googleRedirectUrl}&response_type=code&scope=email%20profile`;
  
    window.location.href = GOOGLE_AUTH_URL;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-[400px] rounded-[30px] p-12 shadow-2xl relative animate-fadeIn">
        
        {/* 닫기 버튼 */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-8 text-gray-400 hover:text-gray-600 text-2xl"
        >✕</button>

        {/* 로고 및 동적 타이틀 영역 */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black text-[#3954AA] mb-2 italic">한눈에 안전</h2>
          <p className="text-gray-500 font-medium text-base">
            {userDisplayName ? (
              <span className="text-[#3954AA] font-bold">{userDisplayName}님</span>
            ) : "더 안전한 세상"}을 위한 첫걸음
          </p>
        </div>

        {/* 로그인 버튼 영역 */}
        <div className="flex flex-col gap-4">
          {/* 카카오 로그인 */}
          <button 
            onClick={handleKakaoLogin}
            className="w-full h-16 bg-[#FEE500] rounded-2xl flex items-center justify-center gap-3 hover:opacity-95 transition-all shadow-sm"
          >
            <span className="text-black font-bold text-xl">카카오로 로그인하기</span>
          </button>

          {/* 구글 로그인 */}
          <button 
            onClick={handleGoogleLogin}
            className="w-full h-16 bg-gray-100 border border-gray-200 rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-200 transition-all shadow-inner"
          >
            <img src="/google-icon.png" alt="G" className="w-6 h-6" />
            <span className="text-black font-bold text-xl">구글로 로그인하기</span>
          </button>

          {/* 하단 문구 */}
          <p className="text-[12px] text-gray-400 text-center mt-6 px-4 leading-relaxed">
            로그인 시 서비스 이용약관 및 개인정보 처리방침에<br/>동의하는 것으로 간주합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
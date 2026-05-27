//상단 오른쪽 헤더 : 로그인/로그아웃/제보마커생성 버튼

import React from 'react';

interface TopBarProps {
  isMounted: boolean;
  userName: string | null;
  setIsReportWriteModalOpen: (open: boolean) => void;
  setIsProfileModalOpen: (open: boolean) => void;
  setIsLoginModalOpen: (open: boolean) => void;
}

const TopBar: React.FC<TopBarProps> = ({
  isMounted,
  userName,
  setIsReportWriteModalOpen,
  setIsProfileModalOpen,
  setIsLoginModalOpen,
}) => {
  return (
            <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
                <button
                    onClick={() => {
                        if (!userName) {
                            setIsLoginModalOpen(true);
                        } else {
                            setIsReportWriteModalOpen(true);
                        }
                    }}
                    className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                >
                    <span className="text-lg"></span>
                    제보마커생성하기
                </button>
                {isMounted && userName ? (
                    <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md px-3 py-2.5 rounded-2xl shadow-xl border-2 border-[#3954AA]/20 animate-fadeIn">
                        <div
                            className="flex items-center gap-3 cursor-pointer hover:opacity-70 transition-all"
                            onClick={() => setIsProfileModalOpen(true)}
                        >
                            <div className="w-8 h-8 bg-[#3954AA] rounded-full flex items-center justify-center text-white text-xs font-black shadow-inner">
                                {userName.charAt(0)}
                            </div>
                            <span className="font-black text-gray-800 tracking-tight">
                                <span className="text-[#3954AA]">{userName}</span>님
                            </span>
                        </div>

                        <button
                            onClick={() => {
                                localStorage.removeItem('user');
                                localStorage.removeItem('token');
                                window.location.reload();
                            }}
                            className="text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors ml-2 border-l pl-2 border-gray-200"
                        >
                            LOGOUT
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsLoginModalOpen(true)}
                        className="px-8 py-2.5 bg-[#3954AA] text-white font-black rounded-xl shadow-lg hover:bg-[#2D438A] hover:scale-105 transition-all"
                    >
                        로그인
                    </button>
                )}
            </div>
  );
};

export default TopBar;
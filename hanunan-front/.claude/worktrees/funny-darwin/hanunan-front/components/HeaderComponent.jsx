"use client";

import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function HeaderComponent() {
  const [isLogin, setIsLogin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Handling JS cookie and localStorage token sync
    const token = Cookies.get("token");
    if (token) {
      localStorage.setItem("token", token);
      Cookies.remove("token");
      router.push("/");
    }

    if (localStorage.getItem("token")) {
      setIsLogin(true);
    }
  }, [router]);

  const doLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <header className="bg-gray-900 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-end h-16 items-center space-x-4">
          {!isLogin ? (
            <>
              <Link
                href="/member/create"
                className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                회원가입
              </Link>
              <Link
                href="/member/login"
                className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                로그인
              </Link>
            </>
          ) : (
            <button
              onClick={doLogout}
              className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              로그아웃
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

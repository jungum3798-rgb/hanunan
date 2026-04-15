"use client";

import { useState } from "react";
import Image from "next/image";

export default function MemberLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const googleUrl = "https://accounts.google.com/o/oauth2/auth";
  const googleClientId = "119834887772-jvvtg77vd6e6m1t3ndc5q9l8rrlklg6g.apps.googleusercontent.com";
  // Assuming localhost:3000 for frontend development
  const googleRedirectUrl = "http://localhost:3000/oauth/google/redirect";
  const googleScope = "openid email profile";

  const kakaoUrl = "https://kauth.kakao.com/oauth/authorize";
  const kakaoClientId = "f7a09751e14f49f1e4bf0108a7c7029a";
  const kakaoRedirectUrl = "http://localhost:3000/oauth/kakao/redirect";

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";

  const memberLogin = async () => {
    try {
      const response = await fetch(`${backendUrl}/member/doLogin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const data = await response.json();
      const token = data.token;

      localStorage.setItem("token", token);
      window.location.href = "/";
    } catch (error) {
      console.error(error);
      alert("로그인에 실패했습니다.");
    }
  };

  const googleLogin = () => {
    const auth_uri = `${googleUrl}?client_id=${googleClientId}&redirect_uri=${googleRedirectUrl}&response_type=code&scope=${googleScope}`;
    window.location.href = auth_uri;
  };

  const kakaoLogin = () => {
    const auth_uri = `${kakaoUrl}?client_id=${kakaoClientId}&redirect_uri=${kakaoRedirectUrl}&response_type=code`;
    window.location.href = auth_uri;
  };

  const googleServerLogin = () => {
    window.location.href = `${backendUrl}/oauth2/authorization/google`;
  };

  return (
    <div className="flex justify-center items-center py-12">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">
          로그인
        </h2>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">패스워드</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>

          <button
            type="button"
            onClick={memberLogin}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            로그인
          </button>
        </form>

        <div className="mt-8 space-y-4">
          <div className="flex justify-center">
            {/* Note: In Next.js it's better to use an img tag if the asset is not directly imported as an Image object. 
                 Assuming you move your assets to the public folder. Wait, originally it was @/assets/google_login.png.
                 I'll use a direct img tag and assume the user puts images in /google_login.png or similar.
              */}
            <img
              src="/google_login.png"
              alt="Google Login"
              className="h-10 w-auto cursor-pointer"
              onClick={googleServerLogin}
            />
          </div>
          <div className="flex justify-center">
            <img
              src="/kakao_login.png"
              alt="Kakao Login"
              className="h-10 w-auto cursor-pointer"
              onClick={kakaoLogin}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

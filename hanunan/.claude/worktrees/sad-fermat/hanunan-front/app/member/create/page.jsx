"use client";

import { useState } from "react";

export default function MemberCreate() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";

  const memberCreate = async () => {
    try {
      const response = await fetch(`${backendUrl}/member/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Registration failed");
      }

      window.location.href = "/";
    } catch (error) {
      console.error(error);
      alert("회원가입에 실패했습니다.");
    }
  };

  return (
    <div className="flex justify-center items-center py-12">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">
          회원가입
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
            onClick={memberCreate}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            등록
          </button>
        </form>
      </div>
    </div>
  );
}

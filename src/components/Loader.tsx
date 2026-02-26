import React from 'react';

interface LoaderProps {
  message?: string;
}

const Loader: React.FC<LoaderProps> = ({ message = "AI가 분석 중입니다..." }) => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent border-solid rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-gray-300">{message}</p>
    </div>
  );
};

export default Loader;

// ============================================================
// src/components/ErrorBoundary.tsx (긴급 폴백 UI)
// ============================================================
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // 다음 렌더링에서 폴백 UI가 보이도록 상태를 업데이트합니다.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    // 로컬 스토리지를 초기화하여 잠재적인 상태 오염 제거 후 새로고침
    localStorage.removeItem('work-ai-presentation-storage');
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-white/5 p-10 shadow-2xl text-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-10 h-10 text-rose-600 dark:text-rose-400" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 italic">Oops! Crash Detected</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                데이터를 처리하는 중 예기치 못한 문제가 발생했습니다.<br/>
                안전하게 초기화 후 다시 시도해 주세요.
              </p>
            </div>

            {this.state.error && (
              <div className="p-4 bg-slate-100 dark:bg-black/20 rounded-2xl text-left overflow-auto max-h-32 mb-4">
                <code className="text-[10px] text-rose-500 font-mono italic">
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button 
                onClick={this.handleReset}
                className="w-full h-14 rounded-2xl gradient-primary text-white font-black shadow-lg shadow-cyan-500/20"
              >
                <RefreshCw className="w-4 h-4 mr-2" />앱 초기화 및 재시작
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => window.location.href = '/'}
                className="w-full h-14 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                <Home className="w-4 h-4 mr-2" />홈으로 이동
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

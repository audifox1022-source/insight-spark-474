import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseSessionSafely, supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Presentation, Sparkles, Zap, Shield, Globe, Github, Cpu, Layout, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let cancelled = false;

    localStorage.removeItem('mock-session');

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session) navigate('/', { replace: true });
      setCheckingAuth(false);
    });

    const checkSession = async () => {
      const session = await getSupabaseSessionSafely({
        context: 'auth page bootstrap',
      });

      if (cancelled) return;

      if (session) {
        navigate('/', { replace: true });
      }

      setCheckingAuth(false);
    };

    checkSession();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('로그인 성공!');
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin }
        });
        if (error) throw error;
        toast.success('가입 완료! 이메일을 확인해주세요.');
      }
    } catch (error: any) {
      toast.error(error.message || '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030711]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030711] text-white selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-600 shadow-lg shadow-indigo-600/20">
            <Presentation className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">InsightSpark <span className="text-indigo-400">AI</span></span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsLogin(true)} className="text-sm font-medium hover:text-indigo-400 transition-colors">로그인</button>
          <Button onClick={() => setIsLogin(false)} size="sm" className="bg-indigo-600 hover:bg-indigo-700">무료 시작하기</Button>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-24 lg:pt-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Column: Hero Content */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6">
              <Sparkles className="h-3 w-3" />
              <span>Next Generation Presentation AI</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
              아이디어를 <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">전략적 슬라이드</span>로
            </h1>
            <p className="text-lg text-slate-400 mb-10 max-w-lg leading-relaxed">
              복잡한 기획안부터 매력적인 발표 자료까지. 
              AI 기반 폼 생성과 스마트 레이아웃으로 당신의 시간을 가치 있게 만드세요.
            </p>

            <div className="grid sm:grid-cols-2 gap-6 mb-12">
              <div className="flex gap-4">
                <div className="mt-1 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <Cpu className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">AI 폼 생성기</h3>
                  <p className="text-sm text-slate-500">핵심 단어만으로 구성된 질문지를 10초 만에 완성합니다.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="mt-1 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <Layout className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">스마트 레이아웃</h3>
                  <p className="text-sm text-slate-500">콘텐츠에 최적화된 전문가급 디자인을 자동으로 제안합니다.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="mt-1 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <Edit3 className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">인라인 에디터</h3>
                  <p className="text-sm text-slate-500">슬라이드 위에서 직접 편집하고 AI에게 문구 수정을 요청하세요.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="mt-1 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <Globe className="h-5 w-5 text-sky-400" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">원클릭 수출</h3>
                  <p className="text-sm text-slate-500">PDF, PPT 등 필요한 포맷으로 즉시 변환하여 공유하세요.</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Auth Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex justify-center lg:justify-end"
          >
            <Card className="w-full max-w-[420px] bg-slate-900/40 border-slate-800 backdrop-blur-xl shadow-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none" />
              <CardContent className="p-8 relative">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-2 text-white">
                    {isLogin ? '환영합니다!' : '무료 계정 만들기'}
                  </h2>
                  <p className="text-slate-400 text-sm">
                    {isLogin ? '로그인을 통해 InsightSpark의 모든 기능을 만나보세요.' : '창의적인 발표 자료의 시작, 지금 바로 함께하세요.'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-300">이메일</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      className="bg-slate-950/50 border-slate-800 focus:ring-indigo-500 text-white placeholder:text-slate-600"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-300">비밀번호</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="bg-slate-950/50 border-slate-800 focus:ring-indigo-500 text-white placeholder:text-slate-600"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-lg shadow-indigo-600/20" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isLogin ? '로그인' : '계정 생성')}
                  </Button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-800 text-center">
                  <p className="text-sm text-slate-400 mb-4">
                    {isLogin ? '신규 사용자이신가요?' : '이미 계정이 있으신가요?'}
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full border-slate-700 hover:bg-slate-800 text-slate-300"
                    onClick={() => setIsLogin(!isLogin)}
                    disabled={loading}
                  >
                    {isLogin ? '회원가입' : '로그인으로 이동'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      {/* Footer Info / Developer Credit */}
      <footer className="relative z-10 border-t border-slate-900 bg-[#020617]/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all opacity-50 hover:opacity-100 italic font-medium">
              <Presentation className="h-5 w-5" />
              <span>InsightSpark AI v1.0.2</span>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 group cursor-pointer">
                <div className="p-2 rounded-full bg-slate-900/80 border border-slate-800 group-hover:border-indigo-500/50 transition-colors">
                  <Github className="h-4 w-4 text-slate-400 group-hover:text-indigo-400" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest leading-none mb-1">Built by</p>
                  <p className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">Audifox Team</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

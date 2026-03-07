import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Presentation, Sparkles, FileText, Globe, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/', { replace: true });
      }
      setCheckingAuth(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/', { replace: true });
      }
      setCheckingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    if (password.length < 6) {
      toast.error('비밀번호는 6자 이상이어야 합니다.');
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
          email, 
          password,
          options: { emailRedirectTo: window.location.origin }
        });
        if (error) throw error;
        toast.success('가입 완료! 이메일을 확인해주세요.');
      }
    } catch (error: any) {
      const msg = error.message?.includes('Invalid login')
        ? '이메일 또는 비밀번호가 올바르지 않습니다.'
        : error.message?.includes('already registered')
        ? '이미 등록된 이메일입니다.'
        : error.message || '오류가 발생했습니다.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const features = [
    {
      icon: <Presentation className="w-5 h-5 text-blue-500" />,
      title: 'AI PPT 자동생성',
      desc: '문서 내용만 입력하면 완벽한 디자인의 슬라이드로 바로 변환됩니다.'
    },
    {
      icon: <FileText className="w-5 h-5 text-emerald-500" />,
      title: '초고속 기획서 생성',
      desc: '개요부터 상세 내용까지, AI가 초안 구조를 탄탄하게 잡아줍니다.'
    },
    {
      icon: <Globe className="w-5 h-5 text-purple-500" />,
      title: '다국어 문서 번역',
      desc: '외국어 자료도 단숨에 한국어로, 내 자료도 전세계 언어로 번역.'
    }
  ];

  return (
    <div className="min-h-screen w-full flex bg-background font-sans overflow-hidden dark:bg-[#0a0a0a]">
      {/* ── Left Side (Branding & Features) ── */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 bg-muted/20 relative border-r border-border/40">
        <div className="absolute inset-0 z-0 opacity-30 dark:opacity-20 pointer-events-none mix-blend-multiply dark:mix-blend-screen"
             style={{
               backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.4) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(168, 85, 247, 0.4) 0%, transparent 40%)',
             }}
        />

        <div className="z-10 flex items-center gap-3 mt-4">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-foreground">Work AI</span>
        </div>

        <div className="z-10 max-w-lg mt-auto mb-auto space-y-10">
          <div className="space-y-4">
            <h1 className="text-4xl leading-tight font-extrabold text-foreground tracking-tight">
              업무의 생산성을<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                AI와 함께 극대화하세요.
              </span>
            </h1>
            <p className="text-lg text-muted-foreground mr-8 leading-relaxed">
              발표자료부터 기획서 도출, 그리고 해외 문서 번역까지. Work AI가 번거로운 반복 작업을 없애고 당신의 시간을 아껴드립니다.
            </p>
          </div>

          <div className="space-y-6">
            {features.map((feature, i) => (
              <motion.div 
                key={i} 
                className="flex items-start gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15 + 0.2 }}
              >
                <div className="mt-1 p-2 rounded-lg bg-background border border-border shadow-sm">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        
        <div className="z-10 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>가입 즉시 모든 기능을 무료로 체험해보세요.</span>
          </div>
        </div>
      </div>

      {/* ── Right Side (Auth Form) ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative">
        <div className="absolute top-8 left-8 lg:hidden flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-foreground">Work AI</span>
        </div>

        <motion.div 
          className="w-full max-w-[400px] space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="space-y-2 lg:space-y-3 text-center lg:text-left">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
              {isLogin ? '환영합니다! 👋' : '새 계정 만들기'}
            </h2>
            <p className="text-muted-foreground">
              {isLogin ? '계정에 로그인하여 워크스페이스를 이어가세요.' : '올인원 생산성 도구의 세계로 초대합니다.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-semibold">이메일 주소</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="h-12 px-4 shadow-sm border-border/50 bg-muted/20 focus:bg-background transition-colors rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="font-semibold">비밀번호</Label>
                  {isLogin && <a href="#" className="text-sm font-medium text-primary hover:underline">비밀번호를 잊으셨나요?</a>}
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="6자 이상 입력해주세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  minLength={6}
                  className="h-12 px-4 shadow-sm border-border/50 bg-muted/20 focus:bg-background transition-colors rounded-xl"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-base font-bold rounded-xl gradient-primary border-0 shadow-md hover:shadow-lg transition-all text-white" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {isLogin ? '로그인' : '회원가입 완료'}
            </Button>
          </form>

          <div className="pt-4 flex items-center justify-center space-x-2 text-sm">
            <span className="text-muted-foreground">
              {isLogin ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
            </span>
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-foreground font-bold hover:text-primary transition-colors hover:underline"
              disabled={loading}
            >
              {isLogin ? '회원가입하기' : '로그인하기'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}


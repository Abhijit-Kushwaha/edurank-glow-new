import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Sparkles, AtSign, Check, X, Loader2, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  // OTP states
  const [otpMode, setOtpMode] = useState<'email' | 'phone'>('email');
  const [identifier, setIdentifier] = useState(''); // email or phone
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const { login, signup, sendOtpSignup, verifyOtpSignup, loginWithGoogle, user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Check username availability with debounce
  useEffect(() => {
    if (!username.trim() || isLogin) {
      setIsUsernameAvailable(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsCheckingUsername(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('name', username.trim())
          .maybeSingle();

        if (error) {
          console.error('Error checking username:', error);
          setIsUsernameAvailable(null);
        } else {
          setIsUsernameAvailable(data === null);
        }
      } catch (error) {
        console.error('Error checking username:', error);
        setIsUsernameAvailable(null);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username, isLogin]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await login(email, password);
        if (error) {
          toast.error(error);
        } else {
          toast.success('Welcome back!');
          navigate('/dashboard');
        }
      } else {
        // OTP signup flow
        if (!otpSent) {
          // Send OTP
          await handleSendOtp();
        } else {
          // Verify OTP
          await handleVerifyOtp();
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Something went wrong';
      console.error('Auth error:', error);
      
      // Check for network errors
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network')) {
        toast.error('Network error. Please check your connection and try again.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!name.trim()) {
      toast.error('Please enter your name');
      setIsLoading(false);
      return;
    }
    if (!username.trim()) {
      toast.error('Please enter a username');
      setIsLoading(false);
      return;
    }
    if (isUsernameAvailable === false) {
      toast.error('This username is already taken');
      setIsLoading(false);
      return;
    }
    if (!identifier.trim()) {
      toast.error(`Please enter your ${otpMode === 'email' ? 'email' : 'phone number'}`);
      setIsLoading(false);
      return;
    }

    setIsSendingOtp(true);
    const { error } = await sendOtpSignup(identifier, otpMode === 'phone');
    setIsSendingOtp(false);

    if (error) {
      toast.error(error);
      setIsLoading(false);
    } else {
      setOtpSent(true);
      setResendCooldown(60); // 60 seconds cooldown
      toast.success(`OTP sent to your ${otpMode === 'email' ? 'email' : 'phone'}!`);
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      toast.error('Please enter the OTP');
      setIsLoading(false);
      return;
    }

    setIsVerifyingOtp(true);
    const { error } = await verifyOtpSignup(identifier, otp, otpMode === 'phone', name, username.trim());
    setIsVerifyingOtp(false);

    if (error) {
      toast.error(error);
      setIsLoading(false);
    } else {
      toast.success('Account created successfully!');
      navigate('/dashboard');
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    setIsSendingOtp(true);
    const { error } = await sendOtpSignup(identifier, otpMode === 'phone');
    setIsSendingOtp(false);

    if (error) {
      toast.error(error);
    } else {
      setResendCooldown(60);
      toast.success(`OTP resent to your ${otpMode === 'email' ? 'email' : 'phone'}!`);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setIsSendingReset(true);
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error('Password reset error:', error);
        toast.error('Failed to send reset email. Please check your email and try again.');
      } else {
        setResetEmailSent(true);
        toast.success('Password reset email sent! Check your inbox.');
        setTimeout(() => {
          setIsForgotPasswordOpen(false);
          setResetEmailSent(false);
          setForgotPasswordEmail('');
        }, 3000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      console.error('Password reset error:', error);
      
      // Check for network errors
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network')) {
        toast.error('Network error. Please check your connection and try again.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-8 animate-fade-in">
          <Logo size="lg" />
        </div>

        {/* Auth Card */}
        <div className="glass-card rounded-2xl p-8 animate-slide-up">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">
              {!isLogin && otpSent ? 'Verify OTP' : isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-muted-foreground">
              {!isLogin && otpSent
                ? `Enter the OTP sent to your ${otpMode === 'email' ? 'email' : 'phone'}`
                : isLogin
                ? 'Sign in to continue your learning journey'
                : 'Start your AI-powered study experience'}
            </p>
            {!isLogin && otpSent && (
              <button
                type="button"
                onClick={() => setOtpSent(false)}
                className="text-xs text-primary hover:underline mt-2"
              >
                ← Back to details
              </button>
            )}
          </div>

          {/* Google OAuth Button */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={async () => {
              setIsGoogleLoading(true);
              const { error } = await loginWithGoogle();
              if (error) {
                toast.error(error);
                setIsGoogleLoading(false);
              }
            }}
            disabled={isGoogleLoading || isLoading}
          >
            {isGoogleLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Connecting...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </div>
            )}
          </Button>

          <div className="relative my-6">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              or continue with email
            </span>
          </div>

          {!isLogin && !otpSent && (
            <div className="flex justify-center mb-4">
              <div className="flex bg-muted rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setOtpMode('email')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    otpMode === 'email' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Email OTP
                </button>
                <button
                  type="button"
                  onClick={() => setOtpMode('phone')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    otpMode === 'phone' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Phone OTP
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && !otpSent && (
              <>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required={!isLogin}
                  />
                </div>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Username (unique)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                    className="pl-10 pr-10"
                    required={!isLogin}
                  />
                  {username.trim() && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isCheckingUsername ? (
                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : isUsernameAvailable === true ? (
                        <Check className="h-5 w-5 text-green-500" />
                      ) : isUsernameAvailable === false ? (
                        <X className="h-5 w-5 text-destructive" />
                      ) : null}
                    </div>
                  )}
                </div>
                {username.trim() && isUsernameAvailable === false && (
                  <p className="text-xs text-destructive -mt-2">This username is already taken</p>
                )}
              </>
            )}

            {!isLogin && !otpSent && (
              <div className="relative">
                {otpMode === 'email' ? (
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                ) : (
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                )}
                <Input
                  type={otpMode === 'email' ? 'email' : 'tel'}
                  placeholder={otpMode === 'email' ? 'Email Address' : 'Phone Number (e.g. +1234567890)'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="pl-10"
                  required={!isLogin}
                />
              </div>
            )}

            {!isLogin && otpSent && (
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="pl-10 text-center tracking-widest"
                    maxLength={6}
                    required
                  />
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">
                    OTP sent to {otpMode === 'email' ? 'email' : 'phone'}: {identifier}
                  </span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || isSendingOtp}
                    className="text-primary hover:underline disabled:text-muted-foreground disabled:cursor-not-allowed"
                  >
                    {isSendingOtp ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                  </button>
                </div>
              </div>
            )}

            {isLogin && (
              <>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    minLength={6}
                    required
                  />
                </div>

                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              </>
            )}

            <Button
              type="submit"
              variant="neon"
              size="lg"
              className="w-full"
              disabled={isLoading || isGoogleLoading || isSendingOtp || isVerifyingOtp}
            >
              {isLoading || isSendingOtp || isVerifyingOtp ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  {isSendingOtp ? 'Sending OTP...' : isVerifyingOtp ? 'Verifying...' : 'Processing...'}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  {!isLogin && !otpSent ? 'Send OTP' : !isLogin && otpSent ? 'Verify OTP' : 'Sign In'}
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 text-primary hover:underline font-medium"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>

          {/* Forgot Password Modal */}
          {isForgotPasswordOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-card rounded-lg p-6 max-w-sm w-full animate-slide-up">
                <h2 className="text-lg font-bold mb-4">Reset Password</h2>
                
                {resetEmailSent ? (
                  <div className="text-center py-4">
                    <Check className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-4">
                      Password reset email sent! Check your inbox for further instructions.
                    </p>
                    <Button
                      onClick={() => {
                        setIsForgotPasswordOpen(false);
                        setResetEmailSent(false);
                        setForgotPasswordEmail('');
                      }}
                      className="w-full"
                    >
                      Close
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      Enter your email address and we'll send you a link to reset your password.
                    </p>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="Your email address"
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        className="pl-10"
                        required
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={isSendingReset || !forgotPasswordEmail.trim()}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        {isSendingReset ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          'Send Reset Email'
                        )}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setIsForgotPasswordOpen(false);
                          setForgotPasswordEmail('');
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Features preview */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center animate-fade-in">
          {['AI Notes', 'Video Lessons', 'Smart Quizzes'].map((feature) => (
            <div key={feature} className="text-xs text-muted-foreground">
              <Sparkles className="h-4 w-4 mx-auto mb-1 text-primary" />
              {feature}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Auth;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Sparkles, AtSign, Check, X, Loader2 } from 'lucide-react';
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
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [accountType, setAccountType] = useState<'individual' | 'organization'>('individual');
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [signupMethod, setSignupMethod] = useState<'email' | 'phone'>('email');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const navigate = useNavigate();
  const { login, signup, sendOtpSignup, verifyOtpSignup, user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Reset OTP states when switching signup methods
  useEffect(() => {
    setIsOtpSent(false);
    setOtp('');
    setIsVerifyingOtp(false);
  }, [signupMethod]);

  // Reset form when switching between login/signup
  useEffect(() => {
    if (isLogin) {
      setAccountType('individual');
      setOrgName('');
      setOrgSlug('');
      setSignupMethod('email');
      setPhoneNumber('');
      setIsOtpSent(false);
      setOtp('');
      setIsVerifyingOtp(false);
    }
  }, [isLogin]);

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
        // Handle different signup methods
        if (signupMethod === 'phone') {
          if (!isOtpSent) {
            // Send OTP
            const { error } = await sendOtpSignup(phoneNumber, false);
            if (error) {
              toast.error(error);
            } else {
              setIsOtpSent(true);
              toast.success('OTP sent to your phone!');
            }
          } else {
            // Verify OTP
            setIsVerifyingOtp(true);
            const { error } = await verifyOtpSignup(phoneNumber, otp, false, name, username);
            if (error) {
              toast.error(error);
            } else {
              toast.success('Account created successfully!');
              navigate('/dashboard');
            }
            setIsVerifyingOtp(false);
          }
        } else {
          // Email signup
          const { error } = await signup(email, password, name, username.trim());
          if (error) {
            toast.error(error);
          } else {
            if (accountType === 'organization') {
              toast.success('Account created! Organization features will be available after email verification.');
            } else {
              toast.success('Account created! Please check your email to verify your account.');
            }
            // Optionally, you can reset the form or show a different state
          }
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
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-muted-foreground">
              {isLogin
                ? 'Sign in to continue your learning journey'
                : 'Start your AI-powered study experience'}
            </p>
            {!isLogin && (
              <div className="mt-4 space-y-4">
                <div className="flex justify-center">
                  <div className="bg-muted/50 rounded-lg p-1 flex">
                    <button
                      type="button"
                      onClick={() => setAccountType('individual')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        accountType === 'individual'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Individual
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountType('organization')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        accountType === 'organization'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Organization
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {accountType === 'individual' 
                    ? 'Personal account for individual learning' 
                    : 'Organization account for team management and collaboration'
                  }
                </p>
                <div className="flex justify-center">
                  <div className="bg-muted/50 rounded-lg p-1 flex">
                    <button
                      type="button"
                      onClick={() => setSignupMethod('email')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        signupMethod === 'email'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignupMethod('phone')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        signupMethod === 'phone'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Phone
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {signupMethod === 'email' 
                    ? 'Sign up with email and create a unique username' 
                    : 'Sign up with phone number using OTP verification'
                  }
                </p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
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
                {signupMethod === 'email' && (
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Username (unique)"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                      className="pl-10 pr-10"
                      required={!isLogin && signupMethod === 'email'}
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
                )}
                {username.trim() && signupMethod === 'email' && isUsernameAvailable === false && (
                  <p className="text-xs text-destructive -mt-2">This username is already taken</p>
                )}
                {signupMethod === 'email' ? (
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required={!isLogin && signupMethod === 'email'}
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="Phone Number (e.g. +1234567890)"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="pl-10"
                      required={!isLogin && signupMethod === 'phone'}
                    />
                  </div>
                )}
                {!isOtpSent && (
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Password (min 6 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      minLength={6}
                      required={!isLogin && !isOtpSent}
                    />
                  </div>
                )}
                {isOtpSent && (
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="pl-10 text-center tracking-widest"
                      maxLength={6}
                      required={isOtpSent}
                    />
                  </div>
                )}
                {accountType === 'organization' && (
                  <>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Organization Name"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="pl-10"
                        required={!isLogin && accountType === 'organization'}
                      />
                    </div>
                    <div className="relative">
                      <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Organization Slug (unique URL)"
                        value={orgSlug}
                        onChange={(e) => setOrgSlug(e.target.value.replace(/[^a-z0-9-]/g, '').toLowerCase())}
                        className="pl-10"
                        required={!isLogin && accountType === 'organization'}
                      />
                    </div>
                    {orgSlug && (
                      <p className="text-xs text-muted-foreground -mt-2">
                        Your organization URL will be: {window.location.origin}/org/{orgSlug}
                      </p>
                    )}
                  </>
                )}
              </>
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
              disabled={isLoading || isVerifyingOtp}
            >
              {isLoading || isVerifyingOtp ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  {isVerifyingOtp ? 'Verifying...' : 'Processing...'}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  {isLogin ? 'Sign In' : isOtpSent ? 'Verify OTP' : signupMethod === 'phone' ? 'Send OTP' : 'Create Account'}
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

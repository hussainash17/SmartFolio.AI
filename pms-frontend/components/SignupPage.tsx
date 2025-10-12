import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { 
  TrendingUp, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface SignupPageProps {
  onSwitchToLogin: () => void;
}

export function SignupPage({ onSwitchToLogin }: SignupPageProps) {
  const { signup, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const validateField = (name: string, value: string) => {
    switch (name) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value) ? '' : 'Please enter a valid email address';
      
      case 'phone':
        const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
        return phoneRegex.test(value) ? '' : 'Please enter a valid phone number';
      
      case 'password':
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (!/(?=.*[a-z])/.test(value)) return 'Password must contain a lowercase letter';
        if (!/(?=.*[A-Z])/.test(value)) return 'Password must contain an uppercase letter';
        if (!/(?=.*\d)/.test(value)) return 'Password must contain a number';
        return '';
      
      case 'confirmPassword':
        return value === formData.password ? '' : 'Passwords do not match';
      
      default:
        return '';
    }
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear global error when user starts typing
    if (error) clearError();
    
    // Validate field if it's been touched
    if (touchedFields[name]) {
      const fieldError = validateField(name, value);
      setFieldErrors(prev => ({ ...prev, [name]: fieldError }));
    }

    // Special case: re-validate confirm password when password changes
    if (name === 'password' && touchedFields.confirmPassword) {
      const confirmError = formData.confirmPassword === value ? '' : 'Passwords do not match';
      setFieldErrors(prev => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  const handleBlur = (name: string) => {
    setTouchedFields(prev => ({ ...prev, [name]: true }));
    const fieldError = validateField(name, formData[name]);
    setFieldErrors(prev => ({ ...prev, [name]: fieldError }));
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/(?=.*[a-z])/.test(password)) strength++;
    if (/(?=.*[A-Z])/.test(password)) strength++;
    if (/(?=.*\d)/.test(password)) strength++;
    if (/(?=.*[!@#$%^&*])/.test(password)) strength++;
    
    return strength;
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const isFormValid = Object.values(fieldErrors).every(error => !error) && 
                     Object.values(formData).every(value => value.trim() !== '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const errors: Record<string, string> = {};
    Object.entries(formData).forEach(([name, value]) => {
      const error = validateField(name, value);
      if (error) errors[name] = error;
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setTouchedFields({
        email: true,
        phone: true,
        password: true,
        confirmPassword: true
      });
      return;
    }

    const result = await signup(formData);
    if (result.success) {
      // Authentication successful, App.tsx will handle redirect
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <TrendingUp className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-foreground">SmartFolio.AI</h1>
              <p className="text-sm text-muted-foreground">Investment Platform</p>
            </div>
          </div>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-center text-2xl">Create Your Account</CardTitle>
            <p className="text-center text-muted-foreground">
              Start your investment journey with professional portfolio management
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                    className={`pl-10 ${fieldErrors.email ? 'border-destructive' : ''}`}
                    disabled={isLoading}
                  />
                  {touchedFields.email && !fieldErrors.email && formData.email && (
                    <CheckCircle2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-600" />
                  )}
                </div>
                {fieldErrors.email && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Phone Field */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    onBlur={() => handleBlur('phone')}
                    className={`pl-10 ${fieldErrors.phone ? 'border-destructive' : ''}`}
                    disabled={isLoading}
                  />
                  {touchedFields.phone && !fieldErrors.phone && formData.phone && (
                    <CheckCircle2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-600" />
                  )}
                </div>
                {fieldErrors.phone && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.phone}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    onBlur={() => handleBlur('password')}
                    className={`pl-10 pr-10 ${fieldErrors.password ? 'border-destructive' : ''}`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full ${
                            passwordStrength >= level
                              ? passwordStrength < 2
                                ? 'bg-red-500'
                                : passwordStrength < 3
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                              : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Password strength: {
                        passwordStrength < 2 ? 'Weak' :
                        passwordStrength < 3 ? 'Fair' :
                        passwordStrength < 4 ? 'Good' : 'Strong'
                      }
                    </p>
                  </div>
                )}
                
                {fieldErrors.password && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    onBlur={() => handleBlur('confirmPassword')}
                    className={`pl-10 pr-10 ${fieldErrors.confirmPassword ? 'border-destructive' : ''}`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-11" 
                disabled={isLoading || !isFormValid}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>

            {/* Terms */}
            <p className="text-xs text-center text-muted-foreground">
              By creating an account, you agree to our{' '}
              <button className="underline hover:text-foreground">Terms of Service</button>{' '}
              and{' '}
              <button className="underline hover:text-foreground">Privacy Policy</button>
            </p>

            <Separator />

            {/* Switch to Login */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <button
                  onClick={onSwitchToLogin}
                  className="font-medium text-primary hover:underline"
                  disabled={isLoading}
                >
                  Sign In
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Demo Credentials */}
        <Card className="border-dashed bg-muted/50">
          <CardContent className="pt-6">
            <p className="text-xs text-center text-muted-foreground">
              <strong>Demo:</strong> Use any email/phone and password "password123" to login
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
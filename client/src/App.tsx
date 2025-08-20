import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { trpc } from '@/utils/trpc';
import { Landing } from '@/components/Landing';
import { Dashboard } from '@/components/Dashboard';
import { InvitationViewer } from '@/components/InvitationViewer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Heart, Users, Crown, LogIn, UserPlus, Menu, X } from 'lucide-react';
import type { User, LoginInput, CreateUserInput, UserRole } from '../../server/src/schema';

// Authentication Context
interface AuthContextType {
  user: User | null;
  login: (credentials: LoginInput) => Promise<boolean>;
  logout: () => void;
  register: (userData: CreateUserInput) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Main App Component
function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'landing' | 'dashboard' | 'invitation'>('landing');
  const [selectedSlug, setSelectedSlug] = useState<string>('');
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Authentication functions
  const login = useCallback(async (credentials: LoginInput): Promise<boolean> => {
    try {
      const result = await trpc.authenticateUser.mutate(credentials);
      if (result) {
        setUser(result);
        setShowAuthDialog(false);
        return true;
      }
      return false;
    } catch (error) {
      console.log('Server not available, checking demo credentials');
      
      // Demo authentication for when server is not available
      const demoUsers: Record<string, User> = {
        'demo_customer': {
          id: 1,
          name: 'Demo Customer',
          username: 'demo_customer',
          email: 'demo.customer@example.com',
          phone: '+1234567890',
          password_hash: 'hashed',
          role: 'user_customer',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
          last_login: new Date(),
          approved_by: null,
          approved_at: new Date()
        },
        'demo_mitra': {
          id: 2,
          name: 'Demo Mitra',
          username: 'demo_mitra',
          email: 'demo.mitra@example.com',
          phone: '+1234567891',
          password_hash: 'hashed',
          role: 'user_mitra',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
          last_login: new Date(),
          approved_by: 1,
          approved_at: new Date()
        },
        'demo_admin': {
          id: 3,
          name: 'Demo Admin',
          username: 'demo_admin',
          email: 'demo.admin@example.com',
          phone: '+1234567892',
          password_hash: 'hashed',
          role: 'super_admin',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
          last_login: new Date(),
          approved_by: null,
          approved_at: new Date()
        }
      };

      if (demoUsers[credentials.username] && credentials.password === 'password123') {
        setUser(demoUsers[credentials.username]);
        setShowAuthDialog(false);
        return true;
      }
      
      return false;
    }
  }, []);

  const register = useCallback(async (userData: CreateUserInput): Promise<boolean> => {
    try {
      const result = await trpc.createUser.mutate(userData);
      if (result) {
        setUser(result);
        setShowAuthDialog(false);
        return true;
      }
      return false;
    } catch (error) {
      console.log('Server not available, creating demo user');
      
      // Demo registration for when server is not available
      const demoUser: User = {
        id: Math.floor(Math.random() * 1000) + 100,
        name: userData.name,
        username: userData.username,
        email: userData.email,
        phone: userData.phone,
        password_hash: 'hashed',
        role: userData.role,
        status: userData.role === 'user_mitra' ? 'pending' : 'active',
        created_at: new Date(),
        updated_at: new Date(),
        last_login: null,
        approved_by: null,
        approved_at: userData.role === 'user_customer' ? new Date() : null
      };

      setUser(demoUser);
      setShowAuthDialog(false);
      return true;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setCurrentView('landing');
  }, []);

  // Navigation functions
  const handleViewInvitation = useCallback((slug: string) => {
    setSelectedSlug(slug);
    setCurrentView('invitation');
  }, []);

  const handleBackToHome = useCallback(() => {
    setCurrentView('landing');
    setSelectedSlug('');
  }, []);

  const handleDashboard = useCallback(() => {
    setCurrentView('dashboard');
  }, []);

  const authContextValue: AuthContextType = {
    user,
    login,
    logout,
    register
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
        {/* Navigation Header */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-pink-100">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <button
                onClick={handleBackToHome}
                className="flex items-center space-x-2 text-pink-600 hover:text-pink-700 transition-colors"
              >
                <Heart className="h-6 w-6 fill-current" />
                <span className="font-bold text-xl hidden sm:block">Wedding Invites</span>
              </button>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-6">
                <Button
                  variant="ghost"
                  onClick={handleBackToHome}
                  className="text-gray-600 hover:text-pink-600"
                >
                  Gallery
                </Button>
                {user && (
                  <Button
                    variant="ghost"
                    onClick={handleDashboard}
                    className="text-gray-600 hover:text-pink-600"
                  >
                    Dashboard
                  </Button>
                )}
                {user ? (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">
                      Hi, {user.name} 
                      {user.role === 'super_admin' && <Crown className="inline h-4 w-4 ml-1 text-yellow-500" />}
                      {user.role === 'user_mitra' && <Users className="inline h-4 w-4 ml-1 text-blue-500" />}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={logout}
                      className="border-pink-200 text-pink-600 hover:bg-pink-50"
                    >
                      Logout
                    </Button>
                  </div>
                ) : (
                  <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
                    <DialogTrigger asChild>
                      <Button className="bg-pink-500 hover:bg-pink-600 text-white">
                        <LogIn className="h-4 w-4 mr-2" />
                        Sign In
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <AuthDialog />
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>

            {/* Mobile Navigation */}
            {mobileMenuOpen && (
              <div className="md:hidden border-t border-pink-100 py-4">
                <div className="flex flex-col space-y-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      handleBackToHome();
                      setMobileMenuOpen(false);
                    }}
                    className="justify-start text-gray-600 hover:text-pink-600"
                  >
                    Gallery
                  </Button>
                  {user && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        handleDashboard();
                        setMobileMenuOpen(false);
                      }}
                      className="justify-start text-gray-600 hover:text-pink-600"
                    >
                      Dashboard
                    </Button>
                  )}
                  {user ? (
                    <div className="flex items-center justify-between pt-2 border-t border-pink-100 mt-2">
                      <span className="text-sm text-gray-600 flex items-center">
                        {user.name}
                        {user.role === 'super_admin' && <Crown className="h-4 w-4 ml-1 text-yellow-500" />}
                        {user.role === 'user_mitra' && <Users className="h-4 w-4 ml-1 text-blue-500" />}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          logout();
                          setMobileMenuOpen(false);
                        }}
                        className="border-pink-200 text-pink-600 hover:bg-pink-50"
                      >
                        Logout
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => {
                        setShowAuthDialog(true);
                        setMobileMenuOpen(false);
                      }}
                      className="bg-pink-500 hover:bg-pink-600 text-white mt-2"
                    >
                      <LogIn className="h-4 w-4 mr-2" />
                      Sign In
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Main Content */}
        <main className="pt-16">
          {currentView === 'landing' && (
            <Landing onViewInvitation={handleViewInvitation} />
          )}
          {currentView === 'dashboard' && user && (
            <Dashboard />
          )}
          {currentView === 'invitation' && selectedSlug && (
            <InvitationViewer
              slug={selectedSlug}
              onBack={handleBackToHome}
            />
          )}
        </main>
      </div>
    </AuthContext.Provider>
  );
}

// Authentication Dialog Component
function AuthDialog() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const { login, register } = useAuth();

  const [loginData, setLoginData] = useState<LoginInput>({
    username: '',
    password: ''
  });

  const [registerData, setRegisterData] = useState<CreateUserInput>({
    name: '',
    username: '',
    email: '',
    phone: null,
    password: '',
    role: 'user_customer'
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const success = await login(loginData);
    if (!success) {
      setError('Invalid username or password');
    }
    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const success = await register(registerData);
    if (!success) {
      setError('Registration failed. Username or email may already exist.');
    }
    setIsLoading(false);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-pink-600">
          <Heart className="h-5 w-5 fill-current" />
          {isLogin ? 'Welcome Back' : 'Join Our Community'}
        </DialogTitle>
      </DialogHeader>

      <Tabs value={isLogin ? 'login' : 'register'} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger
            value="login"
            onClick={() => setIsLogin(true)}
            className="data-[state=active]:bg-pink-100 data-[state=active]:text-pink-600"
          >
            Sign In
          </TabsTrigger>
          <TabsTrigger
            value="register"
            onClick={() => setIsLogin(false)}
            className="data-[state=active]:bg-pink-100 data-[state=active]:text-pink-600"
          >
            Sign Up
          </TabsTrigger>
        </TabsList>

        <TabsContent value="login" className="space-y-4 mt-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={loginData.username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setLoginData((prev: LoginInput) => ({ ...prev, username: e.target.value }))
                }
                placeholder="Enter your username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={loginData.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setLoginData((prev: LoginInput) => ({ ...prev, password: e.target.value }))
                }
                placeholder="Enter your password"
                required
              />
            </div>
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-600">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            <Button
              type="submit"
              className="w-full bg-pink-500 hover:bg-pink-600"
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="register" className="space-y-4 mt-6">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={registerData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRegisterData((prev: CreateUserInput) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter your full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-username">Username</Label>
              <Input
                id="reg-username"
                value={registerData.username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRegisterData((prev: CreateUserInput) => ({ ...prev, username: e.target.value }))
                }
                placeholder="Choose a username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={registerData.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRegisterData((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                }
                placeholder="Enter your email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                value={registerData.phone || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRegisterData((prev: CreateUserInput) => ({ 
                    ...prev, 
                    phone: e.target.value || null 
                  }))
                }
                placeholder="Enter your phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Account Type</Label>
              <Select
                value={registerData.role}
                onValueChange={(value: UserRole) =>
                  setRegisterData((prev: CreateUserInput) => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user_customer">Customer - Create personal invitations</SelectItem>
                  <SelectItem value="user_mitra">Mitra - Professional invitation service</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">Password</Label>
              <Input
                id="reg-password"
                type="password"
                value={registerData.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRegisterData((prev: CreateUserInput) => ({ ...prev, password: e.target.value }))
                }
                placeholder="Create a password (min. 8 characters)"
                minLength={8}
                required
              />
            </div>
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-600">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            <Button
              type="submit"
              className="w-full bg-pink-500 hover:bg-pink-600"
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      {/* Demo Accounts Info */}
      <div className="mt-6 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-100">
        <h4 className="font-semibold text-sm text-gray-700 mb-2">Demo Accounts for Testing:</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <p><strong>Customer:</strong> demo_customer / password123</p>
          <p><strong>Mitra:</strong> demo_mitra / password123</p>
          <p><strong>Admin:</strong> demo_admin / password123</p>
        </div>
      </div>
    </>
  );
}

export default App;
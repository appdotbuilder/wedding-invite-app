import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Heart, 
  User, 
  Plus, 
  Search,
  Menu,
  X
} from 'lucide-react';

interface FloatingNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
  user: any;
}

export function FloatingNav({ currentView, onNavigate, user }: FloatingNavProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show/hide based on scroll direction
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <>
      {/* Desktop Floating Navigation - Top */}
      <div className={`hidden md:flex fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <div className="bg-white/90 backdrop-blur-md border border-pink-100 rounded-full px-6 py-3 shadow-lg">
          <div className="flex items-center space-x-6">
            <Button
              variant={currentView === 'landing' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onNavigate('landing')}
              className={currentView === 'landing' 
                ? 'bg-pink-500 hover:bg-pink-600 text-white' 
                : 'text-gray-600 hover:text-pink-600'
              }
            >
              <Home className="h-4 w-4 mr-2" />
              Gallery
            </Button>
            
            {user && (
              <Button
                variant={currentView === 'dashboard' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onNavigate('dashboard')}
                className={currentView === 'dashboard' 
                  ? 'bg-pink-500 hover:bg-pink-600 text-white' 
                  : 'text-gray-600 hover:text-pink-600'
                }
              >
                <User className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            )}

            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Open create invitation dialog
                  alert('Create new invitation feature coming soon!');
                }}
                className="text-gray-600 hover:text-pink-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Floating Navigation - Bottom */}
      <div className={`md:hidden fixed bottom-4 left-4 right-4 z-50 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}>
        <div className="bg-white/95 backdrop-blur-md border border-pink-100 rounded-2xl px-4 py-2 shadow-lg">
          <div className="flex items-center justify-around">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('landing')}
              className={`flex flex-col items-center gap-1 p-3 ${
                currentView === 'landing' 
                  ? 'text-pink-600' 
                  : 'text-gray-500'
              }`}
            >
              <Home className="h-5 w-5" />
              <span className="text-xs">Gallery</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // Open search functionality
                alert('Search feature coming soon!');
              }}
              className="flex flex-col items-center gap-1 p-3 text-gray-500 hover:text-pink-600"
            >
              <Search className="h-5 w-5" />
              <span className="text-xs">Search</span>
            </Button>

            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Open create invitation dialog
                  alert('Create new invitation feature coming soon!');
                }}
                className="flex flex-col items-center gap-1 p-3 bg-pink-500 text-white rounded-xl hover:bg-pink-600"
              >
                <Plus className="h-5 w-5" />
                <span className="text-xs">Create</span>
              </Button>
            )}

            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('dashboard')}
                className={`flex flex-col items-center gap-1 p-3 ${
                  currentView === 'dashboard' 
                    ? 'text-pink-600' 
                    : 'text-gray-500'
                }`}
              >
                <User className="h-5 w-5" />
                <span className="text-xs">Dashboard</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // Open user menu or profile
                alert('User menu coming soon!');
              }}
              className="flex flex-col items-center gap-1 p-3 text-gray-500 hover:text-pink-600"
            >
              <Menu className="h-5 w-5" />
              <span className="text-xs">Menu</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
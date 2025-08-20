import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Heart, 
  Eye, 
  Edit, 
  Sparkles, 
  Palette, 
  Crown, 
  Search, 
  Filter,
  ArrowRight,
  Star
} from 'lucide-react';
import { useAuth } from '../App';
import { TemplateEditor } from './TemplateEditor';
import type { Template, TemplateCategory, CreateInvitationInput } from '../../../server/src/schema';

interface LandingProps {
  onViewInvitation: (slug: string) => void;
}

export function Landing({ onViewInvitation }: LandingProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredTemplate, setHoveredTemplate] = useState<number | null>(null);
  const [editorTemplate, setEditorTemplate] = useState<Template | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const { user } = useAuth();

  // Sample templates for demo
  const sampleTemplates: Template[] = [
        {
          id: 1,
          name: 'Eternal Love',
          category: 'romantic',
          thumbnail_url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&h=600&fit=crop',
          preview_url: '/preview/eternal-love',
          template_data: JSON.stringify({ theme: 'romantic', colors: ['#ff6b9d', '#ffc3a0'] }),
          is_active: true,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01')
        },
        {
          id: 2,
          name: 'Garden Bliss',
          category: 'romantic',
          thumbnail_url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=400&h=600&fit=crop',
          preview_url: '/preview/garden-bliss',
          template_data: JSON.stringify({ theme: 'garden', colors: ['#98d982', '#f4f4f4'] }),
          is_active: true,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01')
        },
        {
          id: 3,
          name: 'Modern Elegance',
          category: 'contemporary',
          thumbnail_url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&h=600&fit=crop',
          preview_url: '/preview/modern-elegance',
          template_data: JSON.stringify({ theme: 'modern', colors: ['#2c3e50', '#ecf0f1'] }),
          is_active: true,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01')
        },
        {
          id: 4,
          name: 'Royal Heritage',
          category: 'formal',
          thumbnail_url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0e4a6?w=400&h=600&fit=crop',
          preview_url: '/preview/royal-heritage',
          template_data: JSON.stringify({ theme: 'royal', colors: ['#8b4513', '#ffd700'] }),
          is_active: true,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01')
        },
        {
          id: 5,
          name: 'Classic Traditions',
          category: 'traditional',
          thumbnail_url: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=400&h=600&fit=crop',
          preview_url: '/preview/classic-traditions',
          template_data: JSON.stringify({ theme: 'traditional', colors: ['#8b0000', '#ffd700'] }),
          is_active: true,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01')
        },
        {
          id: 6,
          name: 'Minimalist Chic',
          category: 'contemporary',
          thumbnail_url: 'https://images.unsplash.com/photo-1549417229-aa67cffa8c55?w=400&h=600&fit=crop',
          preview_url: '/preview/minimalist-chic',
          template_data: JSON.stringify({ theme: 'minimal', colors: ['#ffffff', '#000000'] }),
          is_active: true,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01')
        }
      ];

  // Load templates
  const loadTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Try to load from server first
      try {
        const result = await trpc.getTemplates.query();
        if (result && result.length > 0) {
          setTemplates(result);
          setFilteredTemplates(result);
          return;
        }
      } catch (serverError) {
        console.log('Server not available, using demo templates');
      }
      
      // Fall back to demo templates
      setTemplates(sampleTemplates);
      setFilteredTemplates(sampleTemplates);
    } catch (error) {
      console.error('Failed to load templates:', error);
      // Always show demo templates on error
      setTemplates(sampleTemplates);
      setFilteredTemplates(sampleTemplates);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Filter templates based on category and search
  useEffect(() => {
    let filtered = templates;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((template: Template) => template.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter((template: Template) =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTemplates(filtered);
  }, [templates, selectedCategory, searchQuery]);

  const getCategoryIcon = (category: TemplateCategory) => {
    switch (category) {
      case 'romantic':
        return <Heart className="h-4 w-4" />;
      case 'contemporary':
        return <Sparkles className="h-4 w-4" />;
      case 'formal':
        return <Crown className="h-4 w-4" />;
      case 'traditional':
        return <Star className="h-4 w-4" />;
      default:
        return <Palette className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: TemplateCategory) => {
    switch (category) {
      case 'romantic':
        return 'bg-pink-100 text-pink-700 border-pink-200';
      case 'contemporary':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'formal':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'traditional':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handleViewTemplate = (template: Template) => {
    // For demo purposes, create a sample slug
    const slug = template.name.toLowerCase().replace(/\s+/g, '-') + '-sample';
    onViewInvitation(slug);
  };

  const handleEditTemplate = (template: Template) => {
    if (user) {
      setEditorTemplate(template);
      setShowEditor(true);
    } else {
      alert('Please sign in to edit templates');
    }
  };

  const handleSaveInvitation = async (invitationData: CreateInvitationInput) => {
    try {
      await trpc.createInvitation.mutate(invitationData);
      // Could redirect to dashboard or show success message
    } catch (error) {
      console.error('Failed to create invitation:', error);
      throw error;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="relative">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-4">
            Beautiful Wedding Invitations
          </h1>
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-6xl opacity-20">
            💖
          </div>
        </div>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Create stunning digital wedding invitations that capture your love story. 
          Choose from our beautiful templates and customize every detail to make it uniquely yours.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-8 py-3"
          >
            <Heart className="h-5 w-5 mr-2 fill-current" />
            Start Creating
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
          {!user && (
            <Button 
              variant="outline" 
              size="lg"
              className="border-pink-200 text-pink-600 hover:bg-pink-50 px-8 py-3"
            >
              View Gallery
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-10 border-pink-200 focus:border-pink-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <Tabs value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as TemplateCategory | 'all')}>
              <TabsList className="bg-white border border-pink-100">
                <TabsTrigger value="all" className="data-[state=active]:bg-pink-100 data-[state=active]:text-pink-600">
                  All
                </TabsTrigger>
                <TabsTrigger value="romantic" className="data-[state=active]:bg-pink-100 data-[state=active]:text-pink-600">
                  Romantic
                </TabsTrigger>
                <TabsTrigger value="contemporary" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-600">
                  Contemporary  
                </TabsTrigger>
                <TabsTrigger value="formal" className="data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-600">
                  Formal
                </TabsTrigger>
                <TabsTrigger value="traditional" className="data-[state=active]:bg-red-100 data-[state=active]:text-red-600">
                  Traditional
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Templates Gallery */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden animate-pulse">
              <div className="aspect-[3/4] bg-gray-200" />
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredTemplates.map((template: Template) => (
              <Card 
                key={template.id} 
                className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-pink-100 hover:border-pink-200"
                onMouseEnter={() => setHoveredTemplate(template.id)}
                onMouseLeave={() => setHoveredTemplate(null)}
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-pink-50 to-purple-50">
                  <img 
                    src={template.thumbnail_url} 
                    alt={template.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  
                  {/* Category Badge */}
                  <div className="absolute top-3 left-3">
                    <Badge 
                      variant="secondary" 
                      className={`flex items-center gap-1 ${getCategoryColor(template.category)}`}
                    >
                      {getCategoryIcon(template.category)}
                      {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
                    </Badge>
                  </div>

                  {/* Hover Actions */}
                  <div className={`absolute inset-0 bg-black/50 flex items-center justify-center gap-3 transition-opacity duration-300 ${
                    hoveredTemplate === template.id ? 'opacity-100' : 'opacity-0'
                  }`}>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleViewTemplate(template)}
                      className="bg-white/90 hover:bg-white text-gray-800"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    {user && (
                      <Button
                        size="sm"
                        onClick={() => handleEditTemplate(template)}
                        className="bg-pink-500 hover:bg-pink-600 text-white"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>

                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg text-gray-800 mb-2 group-hover:text-pink-600 transition-colors">
                    {template.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Perfect for {template.category} wedding celebrations
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredTemplates.length === 0 && !isLoading && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">💔</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No templates found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery 
                  ? `No templates match "${searchQuery}"`
                  : `No templates available in the ${selectedCategory} category`
                }
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="border-pink-200 text-pink-600 hover:bg-pink-50"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </>
      )}

      {/* CTA Section */}
      <div className="mt-20 text-center">
        <div className="bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl p-12 border border-pink-100">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Ready to Create Your Dream Invitation?</h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of couples who have created beautiful digital wedding invitations with our platform.
            Start your journey today!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Button 
                size="lg"
                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-8 py-3"
              >
                <Heart className="h-5 w-5 mr-2 fill-current" />
                Create Your Invitation
              </Button>
            ) : (
              <Button 
                size="lg"
                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-8 py-3"
              >
                <Heart className="h-5 w-5 mr-2 fill-current" />
                Sign Up & Start Creating
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Template Editor Dialog */}
      {editorTemplate && (
        <TemplateEditor
          template={editorTemplate}
          isOpen={showEditor}
          onClose={() => {
            setShowEditor(false);
            setEditorTemplate(null);
          }}
          onSave={handleSaveInvitation}
        />
      )}
    </div>
  );
}
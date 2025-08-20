import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Palette, 
  Type, 
  Image, 
  Save, 
  Eye, 
  Undo, 
  Redo,
  Download,
  Share2,
  Settings,
  Calendar,
  Clock,
  MapPin,
  Heart,
  Users
} from 'lucide-react';
import type { Template, CreateInvitationInput, TemplateCategory } from '../../../server/src/schema';

interface TemplateEditorProps {
  template: Template;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (invitationData: CreateInvitationInput) => Promise<void>;
}

interface WeddingData {
  bride: {
    name: string;
    parents: string;
  };
  groom: {
    name: string;
    parents: string;
  };
  ceremony: {
    date: string;
    time: string;
    venue: string;
    address: string;
  };
  reception: {
    time: string;
    venue: string;
    address: string;
  };
  theme: string;
  colors: string[];
  quote: string;
  story: string;
  gallery: string[];
}

export function TemplateEditor({ template, isOpen, onClose, onSave }: TemplateEditorProps) {
  const [activeTab, setActiveTab] = useState('content');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form data
  const [invitationTitle, setInvitationTitle] = useState('');
  const [invitationSlug, setInvitationSlug] = useState('');
  const [weddingData, setWeddingData] = useState<WeddingData>({
    bride: {
      name: '',
      parents: ''
    },
    groom: {
      name: '',
      parents: ''
    },
    ceremony: {
      date: '',
      time: '',
      venue: '',
      address: ''
    },
    reception: {
      time: '',
      venue: '',
      address: ''
    },
    theme: template.category,
    colors: ['#ff6b9d', '#ffc3a0'],
    quote: '',
    story: '',
    gallery: []
  });
  
  const [customCSS, setCustomCSS] = useState<string>('');

  const handleSave = async () => {
    if (!onSave || !invitationTitle || !invitationSlug) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      const invitationData: CreateInvitationInput = {
        user_id: 1, // This should come from auth context
        template_id: template.id,
        title: invitationTitle,
        slug: invitationSlug,
        wedding_data: JSON.stringify(weddingData),
        custom_css: customCSS || null,
        expires_at: null // Will be set later
      };

      await onSave(invitationData);
      alert('Invitation saved successfully!');
      onClose();
    } catch (error) {
      console.error('Failed to save invitation:', error);
      alert('Failed to save invitation. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const generateSlug = useCallback((title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }, []);

  const handleTitleChange = (title: string) => {
    setInvitationTitle(title);
    if (!invitationSlug || invitationSlug === generateSlug(invitationTitle)) {
      setInvitationSlug(generateSlug(title));
    }
  };

  const colorPresets = {
    romantic: ['#ff6b9d', '#ffc3a0', '#ff8fab', '#ffd6cc'],
    contemporary: ['#667eea', '#764ba2', '#8b5fbf', '#a855f7'],
    formal: ['#2c3e50', '#34495e', '#7f8c8d', '#95a5a6'],
    traditional: ['#8b4513', '#daa520', '#cd853f', '#ffd700']
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] p-0">
        <div className="flex h-full">
          {/* Left Panel - Editor Controls */}
          <div className="w-80 border-r border-gray-200 overflow-y-auto">
            <DialogHeader className="p-6 border-b border-gray-200">
              <DialogTitle className="flex items-center gap-2 text-pink-600">
                <Palette className="h-5 w-5" />
                Design Editor
              </DialogTitle>
            </DialogHeader>

            <div className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="content" className="text-xs">Content</TabsTrigger>
                  <TabsTrigger value="design" className="text-xs">Design</TabsTrigger>
                  <TabsTrigger value="photos" className="text-xs">Photos</TabsTrigger>
                  <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-4 mt-4">
                  {/* Basic Info */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="title">Invitation Title</Label>
                        <Input
                          id="title"
                          value={invitationTitle}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTitleChange(e.target.value)}
                          placeholder="Sarah & John's Wedding"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="slug">Custom URL</Label>
                        <div className="flex">
                          <span className="bg-gray-100 px-3 py-2 text-sm text-gray-600 border border-r-0 rounded-l">
                            /invite/
                          </span>
                          <Input
                            id="slug"
                            value={invitationSlug}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInvitationSlug(e.target.value)}
                            placeholder="sarah-john-wedding"
                            className="rounded-l-none"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Couple Information */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        Couple Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Bride's Name</Label>
                          <Input
                            value={weddingData.bride.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                              setWeddingData(prev => ({
                                ...prev,
                                bride: { ...prev.bride, name: e.target.value }
                              }))
                            }
                            placeholder="Sarah Johnson"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Groom's Name</Label>
                          <Input
                            value={weddingData.groom.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                              setWeddingData(prev => ({
                                ...prev,
                                groom: { ...prev.groom, name: e.target.value }
                              }))
                            }
                            placeholder="John Smith"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Bride's Parents</Label>
                        <Input
                          value={weddingData.bride.parents}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            setWeddingData(prev => ({
                              ...prev,
                              bride: { ...prev.bride, parents: e.target.value }
                            }))
                          }
                          placeholder="Mr. & Mrs. Robert Johnson"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Groom's Parents</Label>
                        <Input
                          value={weddingData.groom.parents}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            setWeddingData(prev => ({
                              ...prev,
                              groom: { ...prev.groom, parents: e.target.value }
                            }))
                          }
                          placeholder="Mr. & Mrs. Michael Smith"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Event Details */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Event Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Wedding Date</Label>
                          <Input
                            type="date"
                            value={weddingData.ceremony.date}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                              setWeddingData(prev => ({
                                ...prev,
                                ceremony: { ...prev.ceremony, date: e.target.value }
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Ceremony Time</Label>
                          <Input
                            type="time"
                            value={weddingData.ceremony.time}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                              setWeddingData(prev => ({
                                ...prev,
                                ceremony: { ...prev.ceremony, time: e.target.value }
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Ceremony Venue</Label>
                        <Input
                          value={weddingData.ceremony.venue}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            setWeddingData(prev => ({
                              ...prev,
                              ceremony: { ...prev.ceremony, venue: e.target.value }
                            }))
                          }
                          placeholder="Garden Paradise Resort"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Ceremony Address</Label>
                        <Textarea
                          value={weddingData.ceremony.address}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                            setWeddingData(prev => ({
                              ...prev,
                              ceremony: { ...prev.ceremony, address: e.target.value }
                            }))
                          }
                          placeholder="123 Garden Lane, Paradise Valley, CA 90210"
                          rows={2}
                        />
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <Label>Reception Time</Label>
                        <Input
                          type="time"
                          value={weddingData.reception.time}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            setWeddingData(prev => ({
                              ...prev,
                              reception: { ...prev.reception, time: e.target.value }
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Reception Venue</Label>
                        <Input
                          value={weddingData.reception.venue}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            setWeddingData(prev => ({
                              ...prev,
                              reception: { ...prev.reception, venue: e.target.value }
                            }))
                          }
                          placeholder="Grand Ballroom"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Personal Message */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Personal Touch</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <Label>Love Quote</Label>
                        <Input
                          value={weddingData.quote}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            setWeddingData(prev => ({
                              ...prev,
                              quote: e.target.value
                            }))
                          }
                          placeholder="Two souls, one heart, forever together"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Your Love Story</Label>
                        <Textarea
                          value={weddingData.story}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                            setWeddingData(prev => ({
                              ...prev,
                              story: e.target.value
                            }))
                          }
                          placeholder="Share your love story..."
                          rows={4}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="design" className="space-y-4 mt-4">
                  {/* Color Scheme */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Color Scheme
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(colorPresets).map(([theme, colors]) => (
                          <button
                            key={theme}
                            onClick={() => setWeddingData(prev => ({ ...prev, colors }))}
                            className="p-2 border rounded-lg hover:border-pink-300 transition-colors"
                          >
                            <div className="flex gap-1 mb-2">
                              {colors.map((color: string, index: number) => (
                                <div
                                  key={index}
                                  className="w-4 h-4 rounded-full"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                            <p className="text-xs capitalize">{theme}</p>
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Custom CSS */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Custom Styles (Advanced)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={customCSS}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomCSS(e.target.value)}
                        placeholder="/* Add your custom CSS here */&#10;.invitation-title {&#10;  font-family: 'Dancing Script', cursive;&#10;}"
                        rows={6}
                        className="font-mono text-sm"
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="photos" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        Photo Gallery
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                        <Image className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">Photo upload feature</p>
                        <p className="text-xs text-gray-400">Coming soon</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Invitation Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-center py-4 text-gray-500">
                        <p className="text-sm">Additional settings</p>
                        <p className="text-xs text-gray-400">Will be available here</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="flex-1 flex flex-col">
            {/* Preview Header */}
            <div className="border-b border-gray-200 p-4 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Preview Mode</Badge>
                <span className="text-sm text-gray-600">Template: {template.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-pink-500 hover:bg-pink-600"
                  size="sm"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-y-auto bg-gray-100 p-8">
              <div className="max-w-2xl mx-auto">
                <Card className="overflow-hidden shadow-lg">
                  <CardContent className="p-0">
                    {/* Preview of the invitation */}
                    <div 
                      className="bg-gradient-to-br from-pink-50 to-purple-50 p-12 text-center"
                      style={{
                        background: weddingData.colors.length >= 2 
                          ? `linear-gradient(135deg, ${weddingData.colors[0]}, ${weddingData.colors[1]})` 
                          : undefined
                      }}
                    >
                      <Heart className="h-12 w-12 text-white fill-current mx-auto mb-6 opacity-80" />
                      
                      <h1 className="text-4xl font-bold text-white mb-4 romantic-text-shadow">
                        {weddingData.bride.name && weddingData.groom.name 
                          ? `${weddingData.bride.name} & ${weddingData.groom.name}`
                          : invitationTitle || 'Your Names Here'
                        }
                      </h1>
                      
                      {weddingData.quote && (
                        <p className="text-xl text-white/90 mb-6 italic">
                          "{weddingData.quote}"
                        </p>
                      )}
                      
                      <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-white/90">
                        {weddingData.ceremony.date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            {new Date(weddingData.ceremony.date).toLocaleDateString()}
                          </div>
                        )}
                        {weddingData.ceremony.time && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            {weddingData.ceremony.time}
                          </div>
                        )}
                        {weddingData.ceremony.venue && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            {weddingData.ceremony.venue}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Additional preview sections can be added here */}
                    {weddingData.story && (
                      <div className="p-8 bg-white text-center">
                        <h3 className="text-2xl font-semibold text-gray-800 mb-4">Our Story</h3>
                        <p className="text-gray-700 leading-relaxed">
                          {weddingData.story}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
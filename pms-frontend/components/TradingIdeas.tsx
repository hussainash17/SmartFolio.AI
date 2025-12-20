import React, { useState } from 'react';
import { IdeaFeed } from './ideas/IdeaFeed';
import { IdeaDetail } from './ideas/IdeaDetail';
import { IdeaEditor } from './ideas/IdeaEditor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { TrendingUp, Users, Bookmark, History } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const TradingIdeas: React.FC = () => {
    const { user } = useAuth();
    const [view, setView] = useState<'feed' | 'detail' | 'create'>('feed');
    const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('trending');

    const handleSelectIdea = (id: string) => {
        setSelectedIdeaId(id);
        setView('detail');
    };

    const handleCreateIdea = () => {
        setView('create');
    };

    const handleBack = () => {
        setView('feed');
        setSelectedIdeaId(null);
    };

    return (
        <div className="space-y-8 pb-8">
            {view === 'feed' && (
                <div className="space-y-8">
                    <div>
                        <h1 className="text-3xl font-semibold text-foreground mb-2">Trading Ideas</h1>
                        <p className="text-muted-foreground text-lg">Discover, share, and discuss market analysis with the community</p>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid grid-cols-4 w-full max-w-2xl bg-card/50 border border-primary/10 p-1 mb-6">
                            <TabsTrigger value="trending" className="gap-2 px-6">
                                <TrendingUp className="w-4 h-4" />
                                Trending
                            </TabsTrigger>
                            <TabsTrigger value="following" className="gap-2 px-6">
                                <Users className="w-4 h-4" />
                                Following
                            </TabsTrigger>
                            <TabsTrigger value="saved" className="gap-2 px-6">
                                <Bookmark className="w-4 h-4" />
                                Saved
                            </TabsTrigger>
                            <TabsTrigger value="my-ideas" className="gap-2 px-6">
                                <History className="w-4 h-4" />
                                My Ideas
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="trending" className="mt-0">
                            <IdeaFeed onSelectIdea={handleSelectIdea} onCreateIdea={handleCreateIdea} />
                        </TabsContent>

                        <TabsContent value="following" className="mt-0">
                            <IdeaFeed
                                onSelectIdea={handleSelectIdea}
                                onCreateIdea={handleCreateIdea}
                                followingOnly={true}
                            />
                        </TabsContent>

                        <TabsContent value="saved" className="mt-0">
                            <div className="text-center py-20 bg-card/20 rounded-2xl border border-dashed border-primary/10">
                                <Bookmark className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                <h3 className="text-lg font-medium">Save ideas to read them later</h3>
                            </div>
                        </TabsContent>

                        <TabsContent value="my-ideas" className="mt-0">
                            <IdeaFeed
                                onSelectIdea={handleSelectIdea}
                                onCreateIdea={handleCreateIdea}
                                filterByUserId={user?.id}
                            />
                        </TabsContent>
                    </Tabs>
                </div>
            )}

            {view === 'detail' && selectedIdeaId && (
                <IdeaDetail ideaId={selectedIdeaId} onBack={handleBack} />
            )}

            {view === 'create' && (
                <div className="space-y-6">
                    <IdeaEditor
                        onSuccess={() => setView('feed')}
                        onCancel={handleBack}
                    />
                </div>
            )}
        </div>
    );
};

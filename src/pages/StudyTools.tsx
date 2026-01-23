import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Logo from '@/components/Logo';
import ManualVideoSearch from '@/components/ManualVideoSearch';
import TodoListComponent from '@/components/TodoListComponent';

const StudyTools = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('video-search');
  const [todoRefresh, setTodoRefresh] = useState(0);

  const handleVideoAdded = () => {
    // Trigger refresh of todo list
    setTodoRefresh((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-sm bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-secondary/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-secondary" />
            </button>
            <div className="flex items-center gap-2">
              <Logo size="sm" />
              <h1 className="text-xl font-bold text-foreground">Study Tools</h1>
            </div>
          </div>
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="text-foreground"
          >
            Back to Dashboard
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Manage Your Learning
          </h2>
          <p className="text-muted-foreground">
            Search for educational videos and organize your study tasks
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
            <TabsTrigger value="video-search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search Videos
            </TabsTrigger>
            <TabsTrigger value="todo-list" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              To-Do List
            </TabsTrigger>
          </TabsList>

          {/* Video Search Tab */}
          <TabsContent value="video-search" className="mt-6">
            <div className="bg-card rounded-lg p-6 border border-border">
              <ManualVideoSearch onAddToTodo={handleVideoAdded} />
            </div>
          </TabsContent>

          {/* To-Do List Tab */}
          <TabsContent value="todo-list" className="mt-6">
            <div className="bg-card rounded-lg p-6 border border-border">
              <TodoListComponent refreshTrigger={todoRefresh} />
            </div>
          </TabsContent>
        </Tabs>

        {/* Tips Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-6">
            <h3 className="font-bold text-primary mb-2">💡 Search Videos Tip</h3>
            <p className="text-primary/80 text-sm">
              Search for topics you want to learn about, select a video, and add it to your to-do list for easy access.
            </p>
          </div>
          <div className="bg-success/10 border border-success/20 rounded-lg p-6">
            <h3 className="font-bold text-success mb-2">✓ To-Do List Tip</h3>
            <p className="text-success/80 text-sm">
              Track your study tasks here. Check off completed tasks to build your streak and stay motivated!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudyTools;

import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  Trash2,
  Loader2,
  AlertCircle,
  Plus,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
  video_id?: string | null;
}

interface TodoListProps {
  refreshTrigger?: number;
}

const TodoListComponent = ({ refreshTrigger }: TodoListProps) => {
  const { user } = useAuth();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const filteredTodos = todos.filter((todo) =>
    todo.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const completedCount = filteredTodos.filter((t) => t.completed).length;
  const progress = filteredTodos.length > 0 ? (completedCount / filteredTodos.length) * 100 : 0;

  useEffect(() => {
    if (user) {
      fetchTodos();
    }
  }, [user, refreshTrigger]);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTodos(data || []);
    } catch (error) {
      console.error('Error fetching todos:', error);
      toast.error('Failed to load to-do list');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim() || !user) return;

    setAdding(true);
    try {
      const { data: newTodo, error } = await supabase
        .from('todos')
        .insert([
          {
            title: newTodoTitle.trim(),
            user_id: user.id,
            completed: false,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setTodos([newTodo, ...todos]);
      setNewTodoTitle('');
      setShowAddForm(false);
      toast.success('Task added to your to-do list!');
    } catch (error) {
      console.error('Error adding todo:', error);
      toast.error('Failed to add task');
    } finally {
      setAdding(false);
    }
  };

  const handleToggleTodo = async (todoId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('todos')
        .update({ completed: !completed })
        .eq('id', todoId);

      if (error) throw error;

      setTodos(
        todos.map((todo) =>
          todo.id === todoId ? { ...todo, completed: !completed } : todo
        )
      );

      if (!completed) {
        toast.success('Great work! Keep it up! 🎉');
      }
    } catch (error) {
      console.error('Error updating todo:', error);
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    setDeletingId(todoId);
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', todoId);

      if (error) throw error;

      setTodos(todos.filter((todo) => todo.id !== todoId));
      toast.success('Task deleted');
    } catch (error) {
      console.error('Error deleting todo:', error);
      toast.error('Failed to delete task');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">My To-Do List</h2>
          <p className="text-sm text-gray-600 mb-4">
            Track your study tasks and learning goals
          </p>
          
          {/* Progress Bar */}
          {todos.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Progress</span>
                <span>
                  {completedCount} of {filteredTodos.length} completed
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Search Bar */}
        {todos.length > 0 && (
          <div className="px-6 pt-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Add Todo Form */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          {!showAddForm ? (
            <Button
              onClick={() => setShowAddForm(true)}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Task
            </Button>
          ) : (
            <form onSubmit={handleAddTodo} className="space-y-3">
              <Input
                type="text"
                placeholder="Enter task name..."
                value={newTodoTitle}
                onChange={(e) => setNewTodoTitle(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={adding || !newTodoTitle.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {adding ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Task'
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewTodoTitle('');
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

        {/* Todo List */}
        <div className="divide-y divide-gray-200">
          {filteredTodos.length === 0 ? (
            <div className="p-8 text-center">
              {todos.length === 0 ? (
                <>
                  <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-2">No tasks yet</p>
                  <p className="text-gray-400 text-sm">
                    Start by adding your first study task to get organized!
                  </p>
                </>
              ) : (
                <>
                  <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No tasks match your search</p>
                </>
              )}
            </div>
          ) : (
            filteredTodos.map((todo) => (
              <div
                key={todo.id}
                className="p-4 hover:bg-gray-50 transition-colors flex items-center gap-3 group"
              >
                <button
                  onClick={() => handleToggleTodo(todo.id, todo.completed)}
                  className="flex-shrink-0 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  {todo.completed ? (
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  ) : (
                    <Circle className="h-6 w-6" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-base font-medium transition-all ${
                      todo.completed
                        ? 'text-gray-400 line-through'
                        : 'text-gray-700'
                    }`}
                  >
                    {todo.title}
                  </p>
                  {todo.video_id && (
                    <p className="text-xs text-blue-600 mt-1">Has video attached</p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteTodo(todo.id)}
                  disabled={deletingId === todo.id}
                  className="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  {deletingId === todo.id ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Trash2 className="h-5 w-5" />
                  )}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Summary Stats */}
        {todos.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-around text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{todos.length}</p>
              <p className="text-xs text-gray-600">Total Tasks</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
              <p className="text-xs text-gray-600">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">
                {todos.length - completedCount}
              </p>
              <p className="text-xs text-gray-600">Remaining</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TodoListComponent;

import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FeedbackButton = () => {
  const handleFeedback = () => {
    window.open('https://forms.office.com/r/w5GW0HijNj', '_blank');
  };

  return (
    <Button
      onClick={handleFeedback}
      className="fixed bottom-4 right-4 z-50 rounded-full w-12 h-12 p-0 shadow-lg hover:shadow-xl transition-shadow"
      size="icon"
      title="Submit Feedback"
    >
      <MessageSquare className="h-5 w-5" />
    </Button>
  );
};

export default FeedbackButton;
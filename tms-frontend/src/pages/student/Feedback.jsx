import { useState, useEffect } from 'react';
import StudentLayout from '../../components/layout/StudentLayout';
import PageHeader from '../../components/common/PageHeader';
import { getInternalTimetable, getExternalTimetable } from '../../api/timetable.api';
import { submitFeedback } from '../../api/feedback.api';
import { Star, CheckCircle2, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Feedback() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [selectedSession, setSelectedSession] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchCompletedSessions = async () => {
      setLoading(true);
      try {
        const [internalRes, externalRes] = await Promise.all([
          getInternalTimetable({ status: 'completed', limit: 50 }),
          getExternalTimetable({ status: 'completed', limit: 50 })
        ]);

        const list = [
          ...(internalRes.data.success ? internalRes.data.data.map(s => ({ id: s._id, label: `${s.title} (Internal)`, type: 'internal' })) : []),
          ...(externalRes.data.success ? externalRes.data.data.map(s => ({ id: s._id, label: `${s.title} (${s.company})`, type: 'external' })) : [])
        ];
        setSessions(list);
        if (list.length > 0) setSelectedSession(list[0].id);
      } catch {
        toast.error('Could not load completed training sessions list.');
      } finally {
        setLoading(false);
      }
    };

    fetchCompletedSessions();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (description.length > 500) {
      return toast.error('Feedback details cannot exceed 500 characters.');
    }

    const sessionObj = sessions.find((s) => s.id === selectedSession);

    setSubmitting(true);
    try {
      const res = await submitFeedback({
        rating,
        description,
        trainingSession: selectedSession || null,
        trainingType: sessionObj ? sessionObj.type : 'general',
      });

      if (res.data.success) {
        setSubmitted(true);
        toast.success('Feedback submitted successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <StudentLayout>
        <PageHeader title="Submit Feedback" subtitle="Your input helps improve training programs" />
        <div className="glass-card p-8 flex flex-col items-center justify-center text-center max-w-md mx-auto mt-12">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-full mb-4 shadow-glow-emerald animate-bounce">
            <CheckCircle2 size={36} />
          </div>
          <h4 className="text-lg font-bold text-white mb-2">Thank you!</h4>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            Your training feedback has been logged in the system. The administration will review this during curriculum planning.
          </p>
          <button onClick={() => { setSubmitted(false); setDescription(''); setRating(5); }} className="btn-primary w-full">
            Submit Another Feedback
          </button>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <PageHeader title="Submit Feedback" subtitle="Provide structured feedback for training sessions" />

      <div className="max-w-2xl">
        <div className="glass-card p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Session select */}
            <div className="input-group">
              <label className="input-label">Select Completed Session</label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="select-field"
                disabled={loading}
              >
                {sessions.length === 0 ? (
                  <option value="">General Training Feedback</option>
                ) : (
                  sessions.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))
                )}
              </select>
            </div>

            {/* Stars rating */}
            <div className="input-group">
              <label className="input-label">Rating</label>
              <div className="flex items-center gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="focus:outline-none transition-transform active:scale-90"
                  >
                    <Star
                      size={32}
                      className={
                        star <= (hoverRating || rating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-600'
                      }
                    />
                  </button>
                ))}
                <span className="text-sm font-semibold text-gray-400 ml-3">
                  {rating} of 5 Stars
                </span>
              </div>
            </div>

            {/* Description textarea */}
            <div className="input-group">
              <div className="flex justify-between items-center mb-1">
                <label className="input-label !mb-0">Feedback Details</label>
                <span className={`text-[10px] ${description.length > 450 ? 'text-rose-400 font-bold' : 'text-gray-500'}`}>
                  {description.length} / 500 Characters
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => { if (e.target.value.length <= 500) setDescription(e.target.value); }}
                placeholder="Share your experience, trainer capability, topics covered, and key takeaways..."
                className="input-field min-h-[140px]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <MessageSquare size={16} />
              <span>{submitting ? 'Submitting...' : 'Submit Feedback'}</span>
            </button>
          </form>
        </div>
      </div>
    </StudentLayout>
  );
}

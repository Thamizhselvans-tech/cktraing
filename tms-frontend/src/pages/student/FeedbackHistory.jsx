import { useState, useEffect, useCallback } from 'react';
import StudentLayout from '../../components/layout/StudentLayout';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import { getMyFeedback, editFeedback } from '../../api/feedback.api';
import { Edit2, Star, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FeedbackHistory() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Edit Modal State
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [rating, setRating] = useState(5);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchFeedbackHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getMyFeedback();
      if (data.success) {
        setFeedbacks(data.data);
      }
    } catch {
      toast.error('Failed to load feedback history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedbackHistory();
  }, [fetchFeedbackHistory]);

  const handleOpenEdit = (fb) => {
    setEditId(fb._id);
    setRating(fb.rating);
    setDescription(fb.description);
    setEditOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (description.length > 500) {
      return toast.error('Feedback must be less than 500 characters');
    }
    setSaving(true);
    try {
      const res = await editFeedback(editId, { rating, description });
      if (res.data.success) {
        toast.success('Feedback updated successfully!');
        setEditOpen(false);
        fetchFeedbackHistory();
      }
    } catch {
      toast.error('Failed to update feedback. The 24-hour edit window may have expired.');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'createdAt', label: 'Submitted Date', render: (row) => new Date(row.createdAt).toLocaleDateString('en-IN') },
    { key: 'type', label: 'Training Type', render: (row) => row.trainingType?.toUpperCase() },
    {
      key: 'rating',
      label: 'Rating',
      render: (row) => (
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={14}
              className={i < row.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}
            />
          ))}
        </div>
      ),
    },
    { key: 'description', label: 'Feedback Comment', className: 'max-w-md truncate' },
    {
      key: 'isEditable',
      label: 'Edit Window',
      render: (row) => (
        <span className="flex items-center gap-1">
          {row.isEditable ? (
            <Badge text="EDITABLE" type="info" />
          ) : (
            <Badge text="LOCKED (24h Passed)" type="default" />
          )}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'w-20 text-right',
      render: (row) => (
        <div className="flex items-center justify-end">
          <button
            onClick={() => handleOpenEdit(row)}
            disabled={!row.isEditable}
            className="btn-icon text-blue-400 hover:bg-blue-500/10 disabled:opacity-20 disabled:pointer-events-none"
            title="Edit Feedback"
          >
            <Edit2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <StudentLayout>
      <PageHeader title="Feedback History" subtitle="Track and edit your training session feedbacks" />

      <DataTable
        columns={columns}
        data={feedbacks}
        loading={loading}
        emptyMessage="You have not submitted any feedbacks yet."
      />

      {/* Edit Feedback Modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Submitted Feedback">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 flex items-center gap-2 mb-4 text-xs text-blue-300">
            <Clock size={16} />
            <span>You can edit this feedback because it is within 24 hours of submission.</span>
          </div>

          <div className="input-group">
            <label className="input-label">Update Rating</label>
            <div className="flex items-center gap-2 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="focus:outline-none"
                >
                  <Star
                    size={28}
                    className={star <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="input-group">
            <div className="flex justify-between items-center mb-1">
              <label className="input-label !mb-0">Feedback Comment</label>
              <span className="text-[10px] text-gray-500">{description.length} / 500</span>
            </div>
            <textarea
              value={description}
              onChange={(e) => { if (e.target.value.length <= 500) setDescription(e.target.value); }}
              className="input-field min-h-[120px]"
              required
            />
          </div>

          <div className="flex items-center gap-3 justify-end pt-4 border-t border-white/5">
            <button type="button" onClick={() => setEditOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Update Feedback'}
            </button>
          </div>
        </form>
      </Modal>
    </StudentLayout>
  );
}

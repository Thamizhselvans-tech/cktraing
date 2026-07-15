import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  type = 'warning',
  loading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center p-4">
        <div className={`p-3 rounded-full mb-4 ${
          type === 'danger' ? 'bg-rose-500/10 text-rose-500 shadow-glow-rose' : 'bg-amber-500/10 text-amber-500 shadow-glow-amber'
        }`}>
          <AlertTriangle size={32} />
        </div>
        <p className="text-gray-300 text-sm">{message}</p>
        <div className="flex items-center gap-3 w-full mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 ${type === 'danger' ? 'btn-danger' : 'btn-primary'}`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { CompletionResult, PrimaryReason } from '../../../backend/src/executionCore/reflection/reflectionTypes';

export interface ReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { completionResult: CompletionResult; primaryReason?: PrimaryReason; notes?: string }) => void;
  isMandatory: boolean;
  isSubmitting?: boolean;
}

const PRIMARY_REASONS: PrimaryReason[] = [
  'Underestimated effort',
  'Unexpected interruption',
  'Lack of understanding',
  'Low motivation',
  'Technical issue',
  'Health',
  'Other'
];

const ReflectionModal: React.FC<ReflectionModalProps> = ({ isOpen, onClose, onSubmit, isMandatory, isSubmitting }) => {
  const [completionResult, setCompletionResult] = useState<CompletionResult | null>(null);
  const [primaryReason, setPrimaryReason] = useState<PrimaryReason | ''>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    setError('');
    
    if (!completionResult) {
      setError('Please select a completion result.');
      return;
    }

    if ((completionResult === 'PARTIALLY' || completionResult === 'NO') && !primaryReason) {
      setError('Please select a primary reason.');
      return;
    }

    if (notes.length > 500) {
      setError('Notes must be a maximum of 500 characters.');
      return;
    }

    onSubmit({
      completionResult,
      primaryReason: primaryReason as PrimaryReason | undefined,
      notes
    });
  };

  const showReason = completionResult === 'PARTIALLY' || completionResult === 'NO';

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-3xl p-8 max-w-xl w-full shadow-2xl relative my-8"
        >
          {!isMandatory && (
            <button 
              onClick={onClose} 
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          )}

          <h3 className="text-2xl font-black text-gray-900 mb-2">Session Reflection</h3>
          <p className="text-gray-500 font-medium mb-6">
            Take a moment to reflect on this block. This helps Buddy AI personalize future plans.
          </p>

          <div className="space-y-6">
            {/* Completion Result */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">Did you complete what you planned?</label>
              <div className="grid grid-cols-3 gap-3">
                {(['YES', 'PARTIALLY', 'NO'] as CompletionResult[]).map(res => (
                  <button
                    key={res}
                    onClick={() => {
                      setCompletionResult(res);
                      if (res === 'YES') setPrimaryReason('');
                    }}
                    className={`py-3 px-4 rounded-xl font-bold transition-all border-2 ${
                      completionResult === res 
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {res}
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Reason */}
            {showReason && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <label className="block text-sm font-bold text-gray-700 mb-3">What was the main reason?</label>
                <div className="flex flex-wrap gap-2">
                  {PRIMARY_REASONS.map(reason => (
                    <button
                      key={reason}
                      onClick={() => setPrimaryReason(reason)}
                      className={`py-2 px-4 rounded-lg font-bold text-sm transition-all border-2 ${
                        primaryReason === reason 
                          ? 'border-rose-500 bg-rose-50 text-rose-700'
                          : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Notes */}
            <div>
              <label className="flex justify-between items-center block text-sm font-bold text-gray-700 mb-2">
                <span>Optional Notes</span>
                <span className={`text-xs ${notes.length > 500 ? 'text-rose-500' : 'text-gray-400'}`}>
                  {notes.length}/500
                </span>
              </label>
              <textarea 
                className="w-full bg-gray-50 rounded-xl p-4 border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm font-medium text-gray-800"
                placeholder="Any additional thoughts..."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            
            {error && (
              <div className="p-3 bg-rose-50 text-rose-600 text-sm font-bold rounded-lg">
                {error}
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              {!isMandatory && (
                <button 
                  onClick={onClose}
                  className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-colors"
                >
                  Skip Reflection
                </button>
              )}
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting || !completionResult || (showReason && !primaryReason)}
                className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-black rounded-2xl transition-colors shadow-lg shadow-indigo-600/20"
              >
                {isSubmitting ? 'Saving...' : 'Save Reflection'}
              </button>
            </div>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReflectionModal;

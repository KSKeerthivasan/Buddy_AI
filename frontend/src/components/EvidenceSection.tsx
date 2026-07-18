import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, X, File, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface EvidenceAnalysis {
  summary: string;
  observedProgress: number;
}

interface Evidence {
  evidenceId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  previewUrl?: string;
  status: string;
  analysisStatus: 'UPLOAD_COMPLETE' | 'ANALYSIS_PENDING' | 'ANALYZING' | 'ANALYZED' | 'ANALYSIS_FAILED';
  aiAnalysis?: EvidenceAnalysis;
}

interface EvidenceSectionProps {
  taskId: string;
  sessionId: string;
  milestoneId?: string;
}

export default function EvidenceSection({ taskId, sessionId, milestoneId }: EvidenceSectionProps) {
  const { user } = useAuth();
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvidence();
  }, [sessionId]);

  const fetchEvidence = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/sessions/${sessionId}/evidence`);
      const data = await res.json();
      if (data.success) {
        setEvidenceList(data.evidence);
      }
    } catch (err) {
      console.error('Failed to fetch evidence:', err);
    }
  };

  useEffect(() => {
    // Poll if any evidence is pending analysis
    const hasPending = evidenceList.some(
      (e) => e.analysisStatus === 'ANALYSIS_PENDING' || e.analysisStatus === 'ANALYZING'
    );
    if (!hasPending) return;

    const intervalId = setInterval(() => {
      fetchEvidence();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [evidenceList]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    const file = e.target.files[0];
    
    // Quick frontend validation
    if (file.size > 20 * 1024 * 1024) {
      setError('File size must be under 20MB');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', user.uid);
    formData.append('taskId', taskId);
    if (milestoneId) {
      formData.append('milestoneId', milestoneId);
    }

    try {
      const res = await fetch(`http://localhost:5000/api/sessions/${sessionId}/evidence`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        // Optimistically add it or refetch
        fetchEvidence();
      } else {
        setError(data.message || 'Upload failed');
      }
    } catch (err) {
      setError('Network error during upload');
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDelete = async (evidenceId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/evidence/${evidenceId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setEvidenceList(prev => prev.filter(e => e.evidenceId !== evidenceId));
      }
    } catch (err) {
      console.error('Failed to delete evidence:', err);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm mt-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <UploadCloud className="text-indigo-500" size={24} />
        Evidence
      </h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm font-medium rounded-xl border border-red-100">
          {error}
        </div>
      )}

      <div className="space-y-4 mb-6">
        <AnimatePresence>
          {evidenceList.map((ev) => (
            <motion.div 
              key={ev.evidenceId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col p-4 bg-gray-50 rounded-2xl border border-gray-100"
            >
              <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                  {ev.mimeType.startsWith('image/') ? (
                    ev.previewUrl ? <img src={ev.previewUrl} alt={ev.fileName} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-indigo-500" />
                  ) : (
                    <File size={20} className="text-indigo-500" />
                  )}
                </div>
                <div className="truncate">
                  <p className="font-bold text-gray-900 truncate text-sm">{ev.fileName}</p>
                  <p className="text-xs text-gray-500 font-medium">{(ev.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button 
                onClick={() => handleDelete(ev.evidenceId)}
                className="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors shrink-0"
              >
                <X size={18} />
              </button>
              </div>

              {/* AI Analysis Section */}
              {ev.analysisStatus === 'ANALYSIS_PENDING' || ev.analysisStatus === 'ANALYZING' ? (
                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-2 text-indigo-500 text-sm font-bold">
                  <Loader2 size={16} className="animate-spin" />
                  Vision AI Analysis in progress...
                </div>
              ) : ev.analysisStatus === 'ANALYSIS_FAILED' ? (
                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-2 text-amber-600 text-sm font-bold">
                  <X size={16} />
                  AI Analysis unavailable for this file format.
                </div>
              ) : ev.aiAnalysis ? (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                      <ImageIcon size={12} /> AI Observation
                    </span>
                    <span className="text-xs font-bold text-gray-500">
                      Progress: {ev.aiAnalysis.observedProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                    <div 
                      className="bg-indigo-500 h-1.5 rounded-full" 
                      style={{ width: `${Math.min(100, Math.max(0, ev.aiAnalysis.observedProgress))}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-700 italic">
                    "{ev.aiAnalysis.summary}"
                  </p>
                </div>
              ) : null}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <label className={`w-full flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${uploading ? 'bg-gray-50 border-gray-200 cursor-not-allowed' : 'bg-indigo-50/50 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 group'}`}>
        <input 
          type="file" 
          className="hidden" 
          onChange={handleFileChange}
          disabled={uploading}
          accept="image/*,application/pdf,text/plain"
        />
        {uploading ? (
          <div className="flex flex-col items-center text-indigo-500">
            <Loader2 className="animate-spin mb-2" size={24} />
            <span className="font-bold text-sm">Uploading...</span>
          </div>
        ) : (
          <>
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-2 shadow-sm text-indigo-500 group-hover:scale-110 transition-transform">
              <UploadCloud size={20} />
            </div>
            <span className="font-bold text-indigo-900 text-sm">Click to upload evidence</span>
            <span className="text-xs text-indigo-500/70 font-medium mt-1">Images, PDF, TXT up to 20MB</span>
          </>
        )}
      </label>
    </div>
  );
}

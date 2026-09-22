import { useState, useRef, useEffect } from 'react';
import { IconUpload, IconDownload, IconFileCode, IconCheck, IconCross } from './Icons';

const SAMPLE_QUIZ = {
  title: "Galactic & Space Exploration Trivia",
  questions: [
    {
      text: "Which planet in our solar system has the most moons?",
      options: ["Mars", "Saturn", "Jupiter", "Neptune"],
      correct_option_index: 1,
      time_limit_seconds: 20,
      points_value: 1000
    },
    {
      text: "What is the name of the first human-made object to reach interstellar space?",
      options: ["Hubble Space Telescope", "Voyager 1", "New Horizons", "Apollo 11"],
      correct_option_index: 1,
      time_limit_seconds: 20,
      points_value: 1000
    },
    {
      text: "Approximately how long does light from the Sun take to reach Earth?",
      options: ["8 minutes", "1 second", "1 hour", "8 seconds"],
      correct_option_index: 0,
      time_limit_seconds: 15,
      points_value: 1200
    }
  ]
};

export default function ImportQuizModal({ isOpen, onClose, onSuccess, targetQuizId = null, targetQuizTitle = '' }) {
  const [tab, setTab] = useState('upload'); // 'upload' | 'paste'
  const [jsonText, setJsonText] = useState('');
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [parseError, setParseError] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setJsonText('');
      setFileName('');
      setParseError('');
      setPreviewData(null);
      setApiError('');
      setTab('upload');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!jsonText.trim()) {
      setParseError('');
      setPreviewData(null);
      return;
    }

    try {
      const parsed = JSON.parse(jsonText);
      const validated = validateClientSide(parsed, targetQuizId);
      setPreviewData(validated);
      setParseError('');
    } catch (err) {
      setPreviewData(null);
      setParseError(err.message);
    }
  }, [jsonText, targetQuizId]);

  function validateClientSide(data, isAppending) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid JSON format: Expected an object or array.');
    }

    if (isAppending) {
      // Expect array of questions or { questions: [...] }
      const qs = Array.isArray(data) ? data : data.questions;
      if (!Array.isArray(qs) || qs.length === 0) {
        throw new Error('Must provide an array of questions or an object with a "questions" array.');
      }
      return {
        type: 'questions',
        count: qs.length,
        items: qs.slice(0, 5),
        hasMore: qs.length > 5,
        totalQuestions: qs.length
      };
    }

    // Creating new quiz(zes)
    let quizzes = [];
    if (Array.isArray(data)) {
      if (data.length > 0 && (data[0].options || data[0].answers || data[0].question || data[0].text) && !data[0].questions) {
        quizzes = [{ title: 'Imported Quiz', questions: data }];
      } else {
        quizzes = data;
      }
    } else if (Array.isArray(data.quizzes)) {
      quizzes = data.quizzes;
    } else if (Array.isArray(data.questions)) {
      quizzes = [data];
    } else {
      throw new Error('Expected a quiz object with "questions" or an array of quizzes.');
    }

    if (quizzes.length === 0) {
      throw new Error('No quizzes detected in JSON.');
    }

    let totalQ = 0;
    const summaries = quizzes.map((qz, idx) => {
      const title = qz.title || qz.name || `Quiz #${idx + 1}`;
      const qList = qz.questions || qz.items || [];
      if (!Array.isArray(qList) || qList.length === 0) {
        throw new Error(`Quiz "${title}": Must contain at least 1 question.`);
      }
      totalQ += qList.length;
      return {
        title,
        questionCount: qList.length,
        sampleQuestion: qList[0]?.text || qList[0]?.question || qList[0]?.prompt || 'Question'
      };
    });

    return {
      type: 'quizzes',
      quizzes: summaries,
      totalQuizzes: quizzes.length,
      totalQuestions: totalQ
    };
  }

  function handleFile(file) {
    if (!file) return;
    if (!file.name.endsWith('.json') && file.type !== 'application/json' && file.type !== 'text/json') {
      setApiError('Please select a valid .json file.');
      return;
    }
    setFileName(file.name);
    setApiError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      setJsonText(e.target.result);
    };
    reader.onerror = () => {
      setApiError('Failed to read file contents.');
    };
    reader.readAsText(file);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  function loadSample() {
    setJsonText(JSON.stringify(SAMPLE_QUIZ, null, 2));
    setFileName('sample_quiz.json');
    setTab('paste');
    setApiError('');
  }

  function downloadTemplate() {
    const templateData = targetQuizId ? SAMPLE_QUIZ.questions : SAMPLE_QUIZ;
    const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = targetQuizId ? 'quizarena_questions_template.json' : 'quizarena_template.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    if (!previewData || parseError) return;
    setLoading(true);
    setApiError('');

    try {
      const parsed = JSON.parse(jsonText);
      const url = targetQuizId ? `/api/quizzes/${targetQuizId}/import-questions` : '/api/quizzes/import';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Import failed');
      }

      onSuccess(result);
      onClose();
    } catch (err) {
      setApiError(err.message || 'Error occurred during import');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog-modal animate-scale-in"
        style={{ maxWidth: '640px', width: '92vw', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start" style={{ marginBottom: 'var(--sp-4)' }}>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <IconFileCode size={22} color="var(--color-primary-light)" />
              <span>{targetQuizId ? `Import Questions into "${targetQuizTitle}"` : 'Import Quizzes from JSON'}</span>
            </h2>
            <p className="text-xs text-secondary" style={{ marginTop: '4px' }}>
              Upload or paste structured JSON to create quizzes with questions, options, and timers.
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px' }} title="Close">
            <IconCross size={18} />
          </button>
        </div>

        {/* Tab & Template Toolbar */}
        <div className="flex justify-between items-center flex-wrap gap-2" style={{ marginBottom: 'var(--sp-4)' }}>
          <div className="tab-pill-group">
            <button
              type="button"
              className={`tab-pill-btn ${tab === 'upload' ? 'active' : ''}`}
              onClick={() => setTab('upload')}
            >
              <IconUpload size={14} />
              <span>Upload File</span>
            </button>
            <button
              type="button"
              className={`tab-pill-btn ${tab === 'paste' ? 'active' : ''}`}
              onClick={() => setTab('paste')}
            >
              <IconFileCode size={14} />
              <span>Paste JSON</span>
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm text-xs"
              onClick={loadSample}
              title="Load ready-to-test sample JSON"
            >
              Load Sample
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm text-xs"
              onClick={downloadTemplate}
              title="Download starter JSON template"
            >
              <IconDownload size={14} />
              <span>Template</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Upload File */}
        {tab === 'upload' && (
          <div style={{ marginBottom: 'var(--sp-4)' }}>
            <div
              className={`import-dropzone ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files && handleFile(e.target.files[0])}
              />
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(124, 92, 252, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto var(--sp-3)',
                  color: 'var(--color-primary-light)',
                }}
              >
                <IconUpload size={24} />
              </div>
              <p className="text-sm font-semibold" style={{ marginBottom: '4px' }}>
                {fileName ? fileName : 'Drag & drop your .json file here'}
              </p>
              <p className="text-xs text-secondary">
                or <span style={{ color: 'var(--color-primary-light)', textDecoration: 'underline' }}>browse files</span> on your computer
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Paste JSON */}
        {tab === 'paste' && (
          <div style={{ marginBottom: 'var(--sp-4)' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '6px' }}>
              <label className="text-xs text-muted font-bold uppercase tracking-wider" htmlFor="json-paste-box">
                JSON Code
              </label>
              {jsonText && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm text-xs"
                  onClick={() => {
                    setJsonText('');
                    setFileName('');
                  }}
                  style={{ padding: '2px 8px', height: 'auto' }}
                >
                  Clear
                </button>
              )}
            </div>
            <textarea
              id="json-paste-box"
              className="input font-mono text-xs"
              rows={9}
              placeholder='Paste quiz JSON here, e.g. { "title": "My Quiz", "questions": [...] }'
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              style={{
                width: '100%',
                lineHeight: '1.5',
                padding: '12px',
                background: 'var(--color-surface-2)',
                resize: 'vertical',
              }}
            />
          </div>
        )}

        {/* Error Feedback */}
        {parseError && (
          <div
            className="card"
            style={{
              background: 'rgba(255, 90, 95, 0.1)',
              borderColor: 'rgba(255, 90, 95, 0.3)',
              padding: '10px 14px',
              marginBottom: 'var(--sp-4)',
            }}
          >
            <div className="flex items-start gap-2">
              <span style={{ color: 'var(--color-ans-a)', marginTop: '2px' }}>⚠️</span>
              <div>
                <strong className="text-xs font-bold" style={{ color: 'var(--color-ans-a)' }}>
                  Validation Error:
                </strong>
                <p className="text-xs text-secondary" style={{ marginTop: '2px' }}>
                  {parseError}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* API Error Feedback */}
        {apiError && (
          <div
            className="card"
            style={{
              background: 'rgba(255, 90, 95, 0.1)',
              borderColor: 'rgba(255, 90, 95, 0.3)',
              padding: '10px 14px',
              marginBottom: 'var(--sp-4)',
            }}
          >
            <span className="text-xs text-coral font-medium">{apiError}</span>
          </div>
        )}

        {/* Validated Preview Box */}
        {previewData && !parseError && (
          <div
            className="card animate-fade-in"
            style={{
              background: 'rgba(0, 196, 140, 0.08)',
              borderColor: 'rgba(0, 196, 140, 0.25)',
              padding: '12px 16px',
              marginBottom: 'var(--sp-4)',
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
              <span className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--color-ans-d)' }}>
                <IconCheck size={16} strokeWidth={3} />
                Ready to Import
              </span>
              <div className="flex gap-2">
                {previewData.type === 'quizzes' && (
                  <span className="badge badge-primary font-mono text-xs">
                    {previewData.totalQuizzes} {previewData.totalQuizzes === 1 ? 'Quiz' : 'Quizzes'}
                  </span>
                )}
                <span className="badge badge-emerald font-mono text-xs">
                  {previewData.totalQuestions} Questions
                </span>
              </div>
            </div>

            {previewData.type === 'quizzes' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '130px', overflowY: 'auto' }}>
                {previewData.quizzes.map((q, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(20, 18, 31, 0.4)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'between',
                      gap: '8px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span className="text-sm font-semibold block text-ellipsis" style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {q.title}
                      </span>
                      <span className="text-xs text-secondary font-mono">
                        Sample: &quot;{q.sampleQuestion.slice(0, 45)}...&quot;
                      </span>
                    </div>
                    <span className="badge badge-primary font-mono text-xs" style={{ flexShrink: 0 }}>
                      {q.questionCount} Qs
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-secondary">
                {previewData.totalQuestions} question(s) will be appended to the current quiz.
              </p>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex gap-3 justify-end items-center" style={{ marginTop: 'var(--sp-5)' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            id="confirm-import-btn"
            className="btn btn-primary"
            onClick={handleImport}
            disabled={!previewData || !!parseError || loading}
          >
            {loading ? (
              <span>Importing…</span>
            ) : (
              <>
                <IconUpload size={16} />
                <span>
                  {previewData
                    ? previewData.type === 'quizzes'
                      ? `Import ${previewData.totalQuizzes} Quiz${previewData.totalQuizzes > 1 ? 'zes' : ''}`
                      : `Add ${previewData.totalQuestions} Question(s)`
                    : 'Import JSON'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
